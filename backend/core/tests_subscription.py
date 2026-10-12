"""
Tests for subscription plan limits and usage enforcement.
"""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import GeneratedGreeting, ScheduledWish, Contact
from core.plan_config import PLAN_DEFINITIONS


class SubscriptionLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='pass12345')
        self.profile = self.user.profile
        self.profile.subscription_plan = 'FREE'
        self.profile.save()

        self.contact = Contact.objects.create(
            user=self.user,
            name='Jane Doe',
            email='jane@example.com',
        )

    def _auth(self):
        self.client.force_authenticate(user=self.user)

    def _create_scheduled_wish(self):
        future = timezone.now().date() + timedelta(days=7)
        return ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=future,
            time=timezone.now().time().replace(hour=10, minute=0),
            occasion='Birthday',
            status='Scheduled',
        )

    def _create_ai_generation(self):
        return GeneratedGreeting.objects.create(
            user=self.user,
            recipient='Jane',
            occasion='Birthday',
            tone='Friendly',
            content='Happy Birthday!',
        )

    def test_subscription_plans_returns_inr_pricing(self):
        res = self.client.get('/api/subscriptions/plans/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['currency'], 'INR')
        pro = next(p for p in res.data['plans'] if p['id'] == 'PRO')
        self.assertEqual(pro['price'], 799)
        business = next(p for p in res.data['plans'] if p['id'] == 'BUSINESS')
        self.assertEqual(business['price'], 2499)
        enterprise = next(p for p in res.data['plans'] if p['id'] == 'ENTERPRISE')
        self.assertTrue(enterprise['is_custom_pricing'])
        self.assertEqual(enterprise['price_display'], 'Custom')

    def test_authenticated_plans_include_usage(self):
        self._auth()
        self._create_scheduled_wish()
        res = self.client.get('/api/subscriptions/plans/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('usage', res.data)
        self.assertEqual(res.data['usage']['scheduled_wishes']['used'], 1)
        self.assertEqual(res.data['usage']['scheduled_wishes']['limit'], 10)

    def test_free_user_scheduled_wish_limit_enforced(self):
        self._auth()
        for _ in range(10):
            self._create_scheduled_wish()

        future = (timezone.now().date() + timedelta(days=14)).strftime('%Y-%m-%d')
        res = self.client.post('/api/ai/schedule/', {
            'contact_id': self.contact.id,
            'date': future,
            'time': '10:00',
            'greeting_text': 'Hello',
        })
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data['code'], 'SCHEDULED_WISH_LIMIT_REACHED')

    @patch('core.views.generate_ai_wish')
    def test_free_user_ai_generation_limit_enforced(self, mock_generate):
        mock_generate.return_value = {'content': 'Happy Birthday!', 'provider': 'gemini', 'cached': False}
        self._auth()
        for _ in range(10):
            self._create_ai_generation()

        res = self.client.post('/api/ai/generate/', {
            'recipient_name': 'John',
            'occasion': 'Birthday',
            'tone': 'Friendly',
            'use_cache': False,
        }, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertIn(res.data['code'], ['AI_WISH_LIMIT_REACHED', 'AI_GENERATION_LIMIT_REACHED'])
        mock_generate.assert_not_called()

    def test_pro_plan_limits(self):
        self.profile.subscription_plan = 'PRO'
        self.profile.save()
        limits = PLAN_DEFINITIONS['PRO']
        self.assertEqual(limits['scheduled_wish_limit'], 500)
        self.assertEqual(limits['ai_generation_limit'], 500)

    def test_business_plan_limits(self):
        limits = PLAN_DEFINITIONS['BUSINESS']
        self.assertEqual(limits['scheduled_wish_limit'], 2000)
        self.assertEqual(limits['ai_generation_limit'], 2000)

    def test_enterprise_custom_limits(self):
        self.profile.subscription_plan = 'ENTERPRISE'
        self.profile.custom_scheduled_wish_limit = 5000
        self.profile.custom_ai_generation_limit = 3000
        self.profile.save()
        self._auth()
        res = self.client.get('/api/subscriptions/plans/')
        self.assertEqual(res.data['usage']['scheduled_wishes']['limit'], 5000)
        self.assertEqual(res.data['usage']['ai_generations']['limit'], 3000)

    def test_enterprise_checkout_rejected(self):
        self._auth()
        res = self.client.post('/api/payments/checkout/', {'planId': 'ENTERPRISE', 'gateway': 'mock'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn(res.data['code'], ('CHECKOUT_NOT_AVAILABLE', 'INVALID_PLAN'))

    def test_pro_checkout_creates_pending_payment(self):
        self._auth()
        res = self.client.post('/api/payments/checkout/', {'planId': 'PRO', 'gateway': 'mock'}, format='json')
        self.assertEqual(res.status_code, 200)
        from core.models import SubscriptionTransaction
        tx = SubscriptionTransaction.objects.get(pk=res.data['paymentId'])
        self.assertEqual(tx.amount, Decimal('799'))
        self.assertEqual(tx.status, 'PENDING')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.subscription_plan, 'FREE')

    def test_sms_not_allowed_on_free_plan(self):
        self._auth()
        future = (timezone.now().date() + timedelta(days=7)).strftime('%Y-%m-%d')
        res = self.client.post('/api/schedules/', {
            'contact': self.contact.id,
            'date': future,
            'time': '10:00',
            'occasion': 'Birthday',
            'notification_type': 'SMS',
            'status': 'Scheduled',
        }, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data['code'], 'PLAN_FEATURE_NOT_AVAILABLE')

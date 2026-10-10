"""
Tests for dummy/sandbox payment flow.
"""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import SubscriptionTransaction


class DummyPaymentFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='payuser', email='pay@example.com', password='pass12345')
        self.profile = self.user.profile
        self.profile.subscription_plan = 'FREE'
        self.profile.save()
        self.client.force_authenticate(user=self.user)

    def test_upgrade_button_does_not_activate_plan(self):
        """Creating a payment leaves subscription unchanged."""
        res = self.client.post('/api/payments/dummy/create/', {'plan': 'PRO'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.subscription_plan, 'FREE')
        tx = SubscriptionTransaction.objects.get(pk=res.data['payment_id'])
        self.assertEqual(tx.status, 'PENDING')
        self.assertEqual(tx.amount, Decimal('799'))

    def test_successful_dummy_payment_activates_plan(self):
        create = self.client.post('/api/payments/dummy/create/', {'plan': 'PRO'}, format='json')
        payment_id = create.data['payment_id']

        process = self.client.post('/api/payments/dummy/process/', {
            'payment_id': payment_id,
            'outcome': 'success',
        }, format='json')
        self.assertEqual(process.status_code, 200)
        self.assertTrue(process.data['success'])
        self.assertEqual(process.data['payment_status'], 'SUCCESS')

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.subscription_plan, 'PRO')

    def test_failed_dummy_payment_does_not_activate_plan(self):
        create = self.client.post('/api/payments/dummy/create/', {'plan': 'BUSINESS'}, format='json')
        payment_id = create.data['payment_id']

        process = self.client.post('/api/payments/dummy/process/', {
            'payment_id': payment_id,
            'outcome': 'failed',
        }, format='json')
        self.assertEqual(process.status_code, 200)
        self.assertFalse(process.data['success'])
        self.assertEqual(process.data['payment_status'], 'FAILED')

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.subscription_plan, 'FREE')

    def test_cancel_payment(self):
        create = self.client.post('/api/payments/dummy/create/', {'plan': 'PRO'}, format='json')
        payment_id = create.data['payment_id']

        cancel = self.client.post('/api/payments/dummy/cancel/', {'payment_id': payment_id}, format='json')
        self.assertEqual(cancel.status_code, 200)
        tx = SubscriptionTransaction.objects.get(pk=payment_id)
        self.assertEqual(tx.status, 'CANCELLED')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.subscription_plan, 'FREE')

    def test_idempotent_success_processing(self):
        create = self.client.post('/api/payments/dummy/create/', {'plan': 'PRO'}, format='json')
        payment_id = create.data['payment_id']

        self.client.post('/api/payments/dummy/process/', {'payment_id': payment_id, 'outcome': 'success'}, format='json')
        second = self.client.post('/api/payments/dummy/process/', {'payment_id': payment_id, 'outcome': 'success'}, format='json')
        self.assertTrue(second.data['already_processed'])
        self.assertEqual(SubscriptionTransaction.objects.filter(user=self.user, status='SUCCESS').count(), 1)

    def test_already_subscribed_rejected(self):
        self.profile.subscription_plan = 'PRO'
        self.profile.save()
        res = self.client.post('/api/payments/dummy/create/', {'plan': 'PRO'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'ALREADY_SUBSCRIBED')

    def test_frontend_amount_manipulation_ignored(self):
        """Backend determines price from plan — client cannot send amount."""
        res = self.client.post('/api/payments/dummy/create/', {'plan': 'PRO', 'amount': 1}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(float(res.data['amount']), 799.0)

    def test_payment_list_scoped_to_user(self):
        other = User.objects.create_user(username='other', email='other@example.com', password='pass12345')
        SubscriptionTransaction.objects.create(
            user=other, transaction_id='AWAI-OTHER1', amount=799, plan='PRO', status='SUCCESS',
        )
        self.client.post('/api/payments/dummy/create/', {'plan': 'PRO'}, format='json')
        res = self.client.get('/api/payments/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['payments']), 1)
        self.assertEqual(res.data['payments'][0]['plan'], 'PRO')

    def test_cannot_access_other_users_payment(self):
        other = User.objects.create_user(username='other2', email='other2@example.com', password='pass12345')
        tx = SubscriptionTransaction.objects.create(
            user=other, transaction_id='AWAI-OTHER2', amount=799, plan='PRO', status='PENDING',
        )
        res = self.client.get(f'/api/payments/{tx.id}/')
        self.assertEqual(res.status_code, 404)

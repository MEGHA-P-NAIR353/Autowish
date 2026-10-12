import pytz
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Contact, ScheduledWish, EmailLog, GeneratedGreeting


class ReportsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='reportuser', password='password123', email='report@test.com')
        self.user_b = User.objects.create_user(username='otheruser', password='password123', email='other@test.com')

        self.client.force_authenticate(user=self.user)

        self.contact = Contact.objects.create(
            user=self.user,
            name='Report Recipient',
            email='recipient@example.com'
        )
        self.contact_b = Contact.objects.create(
            user=self.user_b,
            name='Other Recipient',
            email='other_recip@example.com'
        )

    def test_unauthenticated_request_rejected(self):
        anon_client = APIClient()
        response = anon_client.get('/api/reports/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_dataset_returns_valid_zero_metrics(self):
        """When user has no records, endpoint must return valid 0-valued metrics and not crash or divide by zero."""
        response = self.client.get('/api/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn('summary', data)
        self.assertIn('monthlyDelivery', data)
        self.assertIn('aiUsageTrends', data)

        summary = data['summary']
        self.assertEqual(summary['wishesSent'], 0)
        self.assertEqual(summary['wishesDelivered'], 0)
        self.assertEqual(summary['wishesScheduled'], 0)
        self.assertEqual(summary['wishesPending'], 0)
        self.assertEqual(summary['wishesFailed'], 0)
        self.assertEqual(summary['aiGreetingsUsed'], 0)
        self.assertEqual(summary['successRate'], 100.0)

    def test_reports_aggregates_real_database_records(self):
        """Verify real database records are counted for sent, delivered, failed, and AI greetings."""
        now = timezone.now()

        # 1 Sent & Delivered wish
        ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=now.date(),
            time=now.time(),
            occasion='Birthday',
            status='Sent',
            delivery_status='Delivered',
            sent_at=now,
            message='Delivered wish'
        )

        # 1 Failed wish
        ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=now.date(),
            time=now.time(),
            occasion='Anniversary',
            status='Failed',
            message='Failed wish'
        )

        # 1 Scheduled wish
        ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=(now + timedelta(days=5)).date(),
            time=now.time(),
            occasion='Festival',
            status='Scheduled',
            message='Scheduled wish'
        )

        # 2 AI Greetings
        GeneratedGreeting.objects.create(
            user=self.user,
            recipient=self.contact.name,
            occasion='Birthday',
            tone='Warm',
            content='Happy Birthday!'
        )
        GeneratedGreeting.objects.create(
            user=self.user,
            recipient=self.contact.name,
            occasion='Anniversary',
            tone='Friendly',
            content='Happy Anniversary!'
        )

        response = self.client.get('/api/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        summary = response.data['summary']
        self.assertEqual(summary['wishesSent'], 1)
        self.assertEqual(summary['wishesDelivered'], 1)
        self.assertEqual(summary['wishesFailed'], 1)
        self.assertEqual(summary['wishesScheduled'], 1)
        self.assertEqual(summary['aiGreetingsUsed'], 2)
        # 1 delivered out of (1 delivered + 1 failed) = 50.0%
        self.assertEqual(summary['successRate'], 50.0)

    def test_user_isolation_strictly_enforced(self):
        """User B records must never be returned in User A reports."""
        now = timezone.now()

        # Create records for User B
        ScheduledWish.objects.create(
            user=self.user_b,
            contact=self.contact_b,
            date=now.date(),
            time=now.time(),
            status='Sent',
            delivery_status='Delivered',
            sent_at=now,
            message='User B wish'
        )
        GeneratedGreeting.objects.create(
            user=self.user_b,
            recipient=self.contact_b.name,
            occasion='Birthday',
            tone='Warm',
            content='User B greeting'
        )

        # User A has 0 records
        response = self.client.get('/api/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data['summary']
        self.assertEqual(summary['wishesSent'], 0)
        self.assertEqual(summary['wishesDelivered'], 0)
        self.assertEqual(summary['aiGreetingsUsed'], 0)

    def test_periods_filter_supported(self):
        """Supported periods (7days, 30days, 6months, year) must return 200 with structured data."""
        for period in ['7days', '30days', '6months', 'year']:
            response = self.client.get(f'/api/reports/?period={period}')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['period'], period)
            self.assertIsInstance(response.data['monthlyDelivery'], list)
            self.assertIsInstance(response.data['aiUsageTrends'], list)

import threading
from datetime import timedelta
import pytz
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.utils import timezone
from django.core import mail
from unittest.mock import patch
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Contact, ScheduledWish, EmailLog, Notification, UserProfile
from core.tasks import (
    process_due_schedules,
    is_wish_due,
    get_wish_scheduled_datetime_utc,
    deliver_scheduled_wish,
    send_scheduled_wish_task,
)


class ScheduleBugFixTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='password123', email='user@test.com')
        self.profile = self.user.profile
        self.profile.subscription_plan = 'PRO'
        self.profile.timezone = 'Asia/Kolkata'
        self.profile.save()

        self.client.force_authenticate(user=self.user)

        self.contact = Contact.objects.create(
            user=self.user,
            name='Alice Wonder',
            email='alice@example.com',
            phone='+919876543210',
            relationship='Friend'
        )

        mail.outbox = []

    def test_create_schedule_never_sends_immediately_and_status_is_pending(self):
        """
        Required Behavior 1, 2, 3:
        Creating a schedule must never send a message immediately.
        Message, recipient, delivery channel, scheduled date/time, and timezone are saved.
        Initial status must be Pending.
        """
        future_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) + timedelta(days=2)
        payload = {
            'contact': self.contact.id,
            'date': future_dt.strftime('%Y-%m-%d'),
            'time': future_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'message': 'Happy Birthday Alice! Have a fantastic day!',
            'timezone': 'Asia/Kolkata',
            'notification_type': 'Email',
            'email_subject': 'Happy Birthday Alice!',
        }

        response = self.client.post('/api/schedules/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        wish_id = response.data['id']
        wish = ScheduledWish.objects.get(pk=wish_id)

        # 1. No message sent immediately
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(EmailLog.objects.filter(recipient=self.contact.email).count(), 0)

        # 2. Correct fields saved
        self.assertEqual(wish.contact, self.contact)
        self.assertEqual(wish.date.strftime('%Y-%m-%d'), payload['date'])
        self.assertEqual(wish.time.strftime('%H:%M'), payload['time'])
        self.assertEqual(wish.timezone, 'Asia/Kolkata')
        self.assertEqual(wish.message, payload['message'])
        self.assertEqual(wish.notification_type, 'Email')

        # 3. Initial status must be Pending
        self.assertEqual(wish.status, 'Pending')
        self.assertIsNone(wish.sent_at)

    def test_update_schedule_never_sends_immediately(self):
        """
        Required Behavior 1:
        Updating a schedule must never send a message immediately.
        """
        future_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) + timedelta(days=3)
        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=future_dt.date(),
            time=future_dt.time(),
            occasion='Birthday',
            message='Original wish message',
            timezone='Asia/Kolkata',
            status='Pending'
        )

        newer_dt = future_dt + timedelta(days=1)
        update_payload = {
            'message': 'Updated wish message for Alice',
            'date': newer_dt.strftime('%Y-%m-%d'),
            'time': newer_dt.strftime('%H:%M'),
        }

        response = self.client.patch(f'/api/schedules/{wish.id}/', update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        wish.refresh_from_db()
        # Verify no message sent immediately
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(wish.status, 'Pending')
        self.assertEqual(wish.message, 'Updated wish message for Alice')

    def test_future_schedule_not_sent_when_due_processor_runs(self):
        """
        Required Behavior 4:
        Send the message only when the user's scheduled date and time arrive.
        Future schedules must not be processed yet.
        """
        future_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) + timedelta(hours=5)
        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=future_dt.date(),
            time=future_dt.time(),
            occasion='Birthday',
            message='Happy Birthday Alice!',
            timezone='Asia/Kolkata',
            status='Pending'
        )

        processed = process_due_schedules()
        self.assertEqual(processed, 0)
        self.assertEqual(len(mail.outbox), 0)

        wish.refresh_from_db()
        self.assertEqual(wish.status, 'Pending')
        self.assertIsNone(wish.sent_at)

    def test_due_schedule_sends_when_scheduled_time_arrives(self):
        """
        Required Behavior 4, 8, 11:
        Send message when scheduled date and time arrive.
        Updates status to Sent and records sent_at, delivery_status, and EmailLog.
        """
        kolkata_tz = pytz.timezone('Asia/Kolkata')
        now_local = timezone.localtime(timezone.now(), kolkata_tz)
        due_time = now_local - timedelta(minutes=5)

        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=due_time.date(),
            time=due_time.time(),
            occasion='Birthday',
            message='Happy Birthday Alice!',
            timezone='Asia/Kolkata',
            status='Pending'
        )

        self.assertTrue(is_wish_due(wish))

        processed = process_due_schedules()
        self.assertEqual(processed, 1)

        # Verify email sent
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertIn(self.contact.email, sent_email.to)
        self.assertIn('Happy Birthday Alice!', sent_email.body)

        # Verify status updated to Sent
        wish.refresh_from_db()
        self.assertEqual(wish.status, 'Sent')
        self.assertEqual(wish.delivery_status, 'Delivered')
        self.assertIsNotNone(wish.sent_at)

        # Verify EmailLog created
        log = EmailLog.objects.filter(recipient=self.contact.email).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'Delivered')

        # Verify in-app notification created
        notif = Notification.objects.filter(user=self.user).first()
        self.assertIsNotNone(notif)

    def test_duplicate_send_prevention(self):
        """
        Required Behavior 8, 11, 12:
        Message must not be sent twice when processor runs repeatedly.
        """
        kolkata_tz = pytz.timezone('Asia/Kolkata')
        due_time = timezone.localtime(timezone.now(), kolkata_tz) - timedelta(minutes=10)

        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=due_time.date(),
            time=due_time.time(),
            occasion='Birthday',
            message='Happy Birthday Alice!',
            timezone='Asia/Kolkata',
            status='Pending'
        )

        # First run: should send
        first_processed = process_due_schedules()
        self.assertEqual(first_processed, 1)
        self.assertEqual(len(mail.outbox), 1)

        wish.refresh_from_db()
        self.assertEqual(wish.status, 'Sent')

        # Second run: must NOT send again!
        second_processed = process_due_schedules()
        self.assertEqual(second_processed, 0)
        self.assertEqual(len(mail.outbox), 1)

        # Direct task invocation on already sent wish must also be blocked
        result = send_scheduled_wish_task(wish.id)
        self.assertEqual(result, 'Already Sent')
        self.assertEqual(len(mail.outbox), 1)

    def test_send_scheduled_wish_task_rejects_premature_send(self):
        """
        Verifies that even if Celery task is prematurely invoked (e.g., eager mode),
        it refuses to send if not due yet.
        """
        future_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) + timedelta(days=1)
        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=future_dt.date(),
            time=future_dt.time(),
            occasion='Anniversary',
            message='Happy Anniversary!',
            timezone='Asia/Kolkata',
            status='Pending'
        )

        result = send_scheduled_wish_task(wish.id)
        self.assertEqual(result, 'Not Due')
        self.assertEqual(len(mail.outbox), 0)

        wish.refresh_from_db()
        self.assertEqual(wish.status, 'Pending')

    def test_cannot_schedule_in_the_past(self):
        """
        Required Behavior 10:
        Validate scheduled times and reject past dates.
        """
        past_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) - timedelta(hours=2)
        payload = {
            'contact': self.contact.id,
            'date': past_dt.strftime('%Y-%m-%d'),
            'time': past_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'message': 'Belated Birthday wish',
            'timezone': 'Asia/Kolkata',
        }

        response = self.client.post('/api/schedules/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date', response.data)

    def test_missing_recipient_email_handled_gracefully(self):
        """
        Required Behavior 10, 11:
        Handle missing recipient gracefully without crashing or false Sent status.
        """
        contact_no_email = Contact.objects.create(
            user=self.user,
            name='No Email Contact',
            email='',
            relationship='Colleague'
        )

        kolkata_tz = pytz.timezone('Asia/Kolkata')
        due_time = timezone.localtime(timezone.now(), kolkata_tz) - timedelta(minutes=5)

        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=contact_no_email,
            date=due_time.date(),
            time=due_time.time(),
            occasion='Birthday',
            message='Wish with no email',
            timezone='Asia/Kolkata',
            status='Pending'
        )

        res = deliver_scheduled_wish(wish)
        self.assertEqual(res, 'Failed - No Email')
        self.assertEqual(len(mail.outbox), 0)

        wish.refresh_from_db()
        self.assertEqual(wish.status, 'Failed')
        self.assertEqual(wish.delivery_status, 'Failed')
        self.assertIn('no email', wish.last_error.lower())

        # Notification should be created for failure
        failure_notif = Notification.objects.filter(user=self.user, title='Wish Delivery Failed').first()
        self.assertIsNotNone(failure_notif)

    def test_timezone_aware_due_calculation(self):
        """
        Required Behavior 8:
        Verify accurate conversion of diverse timezones (e.g. America/New_York vs Asia/Kolkata).
        """
        ny_tz = pytz.timezone('America/New_York')
        now_ny = timezone.localtime(timezone.now(), ny_tz)

        # Scheduled for 3 hours later in New York -> should NOT be due
        future_ny = now_ny + timedelta(hours=3)
        wish_future_ny = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=future_ny.date(),
            time=future_ny.time(),
            occasion='Birthday',
            timezone='America/New_York',
            status='Pending'
        )
        self.assertFalse(is_wish_due(wish_future_ny))

        # Scheduled for 3 hours ago in New York -> SHOULD be due
        past_ny = now_ny - timedelta(hours=3)
        wish_past_ny = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=past_ny.date(),
            time=past_ny.time(),
            occasion='Birthday',
            timezone='America/New_York',
            status='Pending'
        )
        self.assertTrue(is_wish_due(wish_past_ny))

    def test_scheduled_wish_viewset_sets_pending(self):
        """
        Verify ScheduledWishViewSet (/api/scheduled/) also sets initial status to Pending.
        """
        future_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) + timedelta(days=2)
        payload = {
            'contact': self.contact.id,
            'date': future_dt.strftime('%Y-%m-%d'),
            'time': future_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'message': 'Happy Birthday via scheduled endpoint!',
            'timezone': 'Asia/Kolkata',
            'notification_type': 'Email',
        }

        response = self.client.post('/api/scheduled/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'Pending')
        self.assertEqual(len(mail.outbox), 0)

    def test_ai_schedule_endpoint_sets_pending_and_validates_future(self):
        """
        Verify /api/ai/schedule/ sets status to Pending and validates future date/time.
        """
        kolkata_tz = pytz.timezone('Asia/Kolkata')
        # Past date should fail
        past_dt = timezone.localtime(timezone.now(), kolkata_tz) - timedelta(hours=2)
        past_payload = {
            'contact_id': self.contact.id,
            'date': past_dt.strftime('%Y-%m-%d'),
            'time': past_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'greeting_text': 'Belated wish',
            'timezone': 'Asia/Kolkata',
        }
        res_past = self.client.post('/api/ai/schedule/', past_payload, format='json')
        self.assertEqual(res_past.status_code, status.HTTP_400_BAD_REQUEST)

        # Future date should succeed with status Pending and no immediate send
        future_dt = timezone.localtime(timezone.now(), kolkata_tz) + timedelta(days=2)
        future_payload = {
            'contact_id': self.contact.id,
            'date': future_dt.strftime('%Y-%m-%d'),
            'time': future_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'greeting_text': 'AI generated wish',
            'timezone': 'Asia/Kolkata',
        }
        res_future = self.client.post('/api/ai/schedule/', future_payload, format='json')
        self.assertEqual(res_future.status_code, status.HTTP_200_OK)
        self.assertTrue(res_future.data['success'])

        wish = ScheduledWish.objects.get(pk=res_future.data['id'])
        self.assertEqual(wish.status, 'Pending')
        self.assertEqual(len(mail.outbox), 0)

    def test_cancel_and_resume_schedule(self):
        """
        Verify cancelling a schedule prevents delivery, and resuming sets status to Pending.
        """
        kolkata_tz = pytz.timezone('Asia/Kolkata')
        future_dt = timezone.localtime(timezone.now(), kolkata_tz) + timedelta(days=1)
        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=future_dt.date(),
            time=future_dt.time(),
            occasion='Birthday',
            timezone='Asia/Kolkata',
            status='Pending'
        )

        # Cancel
        res_cancel = self.client.patch(f'/api/schedules/{wish.id}/cancel/')
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        wish.refresh_from_db()
        self.assertEqual(wish.status, 'Cancelled')

        # Even if time becomes due, cancelled wish must NOT be sent
        wish.date = (timezone.localtime(timezone.now(), kolkata_tz) - timedelta(hours=1)).date()
        wish.time = (timezone.localtime(timezone.now(), kolkata_tz) - timedelta(hours=1)).time()
        wish.save()

        processed = process_due_schedules()
        self.assertEqual(processed, 0)
        self.assertEqual(len(mail.outbox), 0)

        # Resume with future date
        future_again = timezone.localtime(timezone.now(), kolkata_tz) + timedelta(days=2)
        wish.date = future_again.date()
        wish.time = future_again.time()
        wish.save()

        res_resume = self.client.patch(f'/api/schedules/{wish.id}/resume/')
        self.assertEqual(res_resume.status_code, status.HTTP_200_OK)
        wish.refresh_from_db()
        self.assertEqual(wish.status, 'Pending')

    def test_safe_retry_handling_on_delivery_failure(self):
        """
        Required Behavior 8, 11:
        Transient delivery failure increments retry_count, keeps status Pending for safe retry.
        When retry limit (3) is reached, status updates to Failed.
        """
        kolkata_tz = pytz.timezone('Asia/Kolkata')
        due_time = timezone.localtime(timezone.now(), kolkata_tz) - timedelta(minutes=5)
        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=due_time.date(),
            time=due_time.time(),
            occasion='Birthday',
            timezone='Asia/Kolkata',
            status='Pending',
            retry_count=0
        )

        with patch('django.core.mail.EmailMultiAlternatives.send', side_effect=Exception("SMTP Connection Error")):
            # Attempt 1
            deliver_scheduled_wish(wish)
            wish.refresh_from_db()
            self.assertEqual(wish.retry_count, 1)
            self.assertEqual(wish.status, 'Pending')
            self.assertEqual(wish.delivery_status, 'Retrying')

            # Attempt 2
            deliver_scheduled_wish(wish)
            wish.refresh_from_db()
            self.assertEqual(wish.retry_count, 2)
            self.assertEqual(wish.status, 'Pending')

            # Attempt 3 (Max retries reached -> Failed)
            deliver_scheduled_wish(wish)
            wish.refresh_from_db()
            self.assertEqual(wish.retry_count, 3)
            self.assertEqual(wish.status, 'Failed')
            self.assertEqual(wish.delivery_status, 'Failed')
            self.assertIn("SMTP Connection Error", wish.last_error)

    def test_create_schedule_with_empty_string_greeting_card_succeeds(self):
        """
        Submitting greeting_card: '' (empty string from form default) must be handled
        gracefully as None/null rather than throwing a PrimaryKeyRelatedField type error.
        """
        future_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) + timedelta(days=2)
        payload = {
            'contact': self.contact.id,
            'date': future_dt.strftime('%Y-%m-%d'),
            'time': future_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'message': 'Happy Birthday Alice!',
            'timezone': 'Asia/Kolkata',
            'greeting_card': '',  # Empty string from form
        }
        response = self.client.post('/api/schedules/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        wish = ScheduledWish.objects.get(pk=response.data['id'])
        self.assertIsNone(wish.greeting_card)

    def test_create_schedule_for_other_users_contact_rejected(self):
        """
        Security requirement: A user cannot schedule wishes for another user's contacts.
        Must return 400 validation error.
        """
        other_user = User.objects.create_user(username='other_schedule_user', password='password123')
        other_contact = Contact.objects.create(
            user=other_user,
            name='Eve Private',
            email='eve@example.com'
        )

        future_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) + timedelta(days=2)
        payload = {
            'contact': other_contact.id,
            'date': future_dt.strftime('%Y-%m-%d'),
            'time': future_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'message': 'Unauthorized wish attempt',
            'timezone': 'Asia/Kolkata',
        }
        response = self.client.post('/api/schedules/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('contact', response.data)

    def test_create_schedule_with_past_datetime_rejected(self):
        """
        Business rule: Wishes cannot be scheduled in the past.
        """
        past_dt = timezone.localtime(timezone.now(), pytz.timezone('Asia/Kolkata')) - timedelta(days=1)
        payload = {
            'contact': self.contact.id,
            'date': past_dt.strftime('%Y-%m-%d'),
            'time': past_dt.strftime('%H:%M'),
            'occasion': 'Birthday',
            'message': 'Past wish attempt',
            'timezone': 'Asia/Kolkata',
        }
        response = self.client.post('/api/schedules/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


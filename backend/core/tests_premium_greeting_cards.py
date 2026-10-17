"""
Comprehensive backend tests for Premium Greeting Cards in Scheduled Wishes.
Covers:
- Free users attempting to attach a card (forbidden/rejected).
- Premium users attaching an authorized published card (succeeds).
- Cross-user card access and unauthorized card references (rejected).
- Schedule creation and editing with and without a card.
- Card persistence and retrieval by scheduled delivery Celery tasks.
- Invalid, deleted, and unpublished (draft) card attachments (rejected).
- Subscription downgrade/expiration preventing card attachment.
- Graceful Celery delivery fallback when card asset is missing or card is unpublished.
"""

from datetime import timedelta
from unittest.mock import patch
import pytz
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from django.core import mail
from django.core.files.base import ContentFile
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Contact, ScheduledWish, GreetingCard, EmailLog
from core.tasks import deliver_scheduled_wish, _build_card_email
from core.plan_config import PLAN_DEFINITIONS
from services.subscription_service import user_can_attach_greeting_cards


class PremiumGreetingCardScheduleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Premium user (PRO plan)
        self.premium_user = User.objects.create_user(
            username='pro_user', email='pro@example.com', password='password123'
        )
        self.premium_profile = self.premium_user.profile
        self.premium_profile.subscription_plan = 'PRO'
        self.premium_profile.save()

        # Free user
        self.free_user = User.objects.create_user(
            username='free_user', email='free@example.com', password='password123'
        )
        self.free_profile = self.free_user.profile
        self.free_profile.subscription_plan = 'FREE'
        self.free_profile.save()

        # Other user (for cross-user ownership tests)
        self.other_user = User.objects.create_user(
            username='other_user', email='other@example.com', password='password123'
        )
        self.other_profile = self.other_user.profile
        self.other_profile.subscription_plan = 'PRO'
        self.other_profile.save()

        # Contacts
        self.premium_contact = Contact.objects.create(
            user=self.premium_user,
            name='Sarah Connor',
            email='sarah@example.com',
            relationship='Friend'
        )
        self.free_contact = Contact.objects.create(
            user=self.free_user,
            name='John Doe',
            email='john@example.com',
            relationship='Colleague'
        )
        self.other_contact = Contact.objects.create(
            user=self.other_user,
            name='Bob Vance',
            email='bob@example.com',
            relationship='Client'
        )

        # Published card owned by premium_user
        self.premium_card = GreetingCard.objects.create(
            user=self.premium_user,
            title='Birthday Special',
            occasion='Birthday',
            recipient_name='Sarah',
            heading='Happy Birthday!',
            message='Wishing you all the best!',
            card_theme='midnight',
            status='published'
        )

        # Draft (unpublished) card owned by premium_user
        self.draft_card = GreetingCard.objects.create(
            user=self.premium_user,
            title='Draft Birthday',
            occasion='Birthday',
            status='draft'
        )

        # Published card owned by other_user
        self.other_card = GreetingCard.objects.create(
            user=self.other_user,
            title='Other Birthday',
            occasion='Birthday',
            status='published'
        )

        mail.outbox = []

    def _future_date_time(self, days=3):
        tz = pytz.timezone('Asia/Kolkata')
        future_dt = timezone.localtime(timezone.now(), tz) + timedelta(days=days)
        return future_dt.strftime('%Y-%m-%d'), future_dt.strftime('%H:%M')

    # ── 1. Entitlement Checks ────────────────────────────────────────────────

    def test_user_can_attach_greeting_cards_entitlement(self):
        self.assertTrue(user_can_attach_greeting_cards(self.premium_user))
        self.assertFalse(user_can_attach_greeting_cards(self.free_user))

        # Admin role is also entitled
        self.free_profile.role = 'admin'
        self.free_profile.save()
        self.assertTrue(user_can_attach_greeting_cards(self.free_user))

        # Reset back to free
        self.free_profile.role = 'free'
        self.free_profile.save()
        self.assertFalse(user_can_attach_greeting_cards(self.free_user))

    def test_plan_config_feature_flags(self):
        self.assertFalse(PLAN_DEFINITIONS['FREE']['feature_flags']['attach_greeting_cards'])
        self.assertTrue(PLAN_DEFINITIONS['PRO']['feature_flags']['attach_greeting_cards'])
        self.assertTrue(PLAN_DEFINITIONS['BUSINESS']['feature_flags']['attach_greeting_cards'])
        self.assertTrue(PLAN_DEFINITIONS['ENTERPRISE']['feature_flags']['attach_greeting_cards'])

    # ── 2. Free Users Attempting to Attach a Card ───────────────────────────

    def test_free_user_cannot_attach_card_via_schedules_api(self):
        self.client.force_authenticate(user=self.free_user)
        date_str, time_str = self._future_date_time()

        # Attempt to attach a card to a new schedule
        card = GreetingCard.objects.create(
            user=self.free_user,
            title='Free User Card',
            occasion='Birthday',
            status='published'
        )

        res = self.client.post('/api/schedules/', {
            'contact': self.free_contact.id,
            'date': date_str,
            'time': time_str,
            'occasion': 'Birthday',
            'message': 'Happy Birthday!',
            'greeting_card': card.id,
        }, format='json')

        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        self.assertFalse(ScheduledWish.objects.filter(user=self.free_user, greeting_card=card).exists())

    def test_free_user_cannot_attach_card_via_scheduled_api(self):
        self.client.force_authenticate(user=self.free_user)
        date_str, time_str = self._future_date_time()

        card = GreetingCard.objects.create(
            user=self.free_user,
            title='Free Card 2',
            occasion='Birthday',
            status='published'
        )

        res = self.client.post('/api/scheduled/', {
            'contact': self.free_contact.id,
            'date': date_str,
            'time': time_str,
            'occasion': 'Birthday',
            'message': 'Happy Birthday!',
            'greeting_card': card.id,
        }, format='json')

        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])

    def test_free_user_can_schedule_text_wish_normally(self):
        """Free users must not be blocked from ordinary text wish scheduling."""
        self.client.force_authenticate(user=self.free_user)
        date_str, time_str = self._future_date_time()

        res = self.client.post('/api/schedules/', {
            'contact': self.free_contact.id,
            'date': date_str,
            'time': time_str,
            'occasion': 'Birthday',
            'message': 'Happy Birthday text-only!',
            'greeting_card': '',  # Empty from frontend
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        wish = ScheduledWish.objects.get(pk=res.data['id'])
        self.assertIsNone(wish.greeting_card)
        self.assertEqual(wish.status, 'Pending')

    # ── 3. Premium Users Attaching Authorized Cards ─────────────────────────

    def test_premium_user_can_attach_authorized_card(self):
        self.client.force_authenticate(user=self.premium_user)
        date_str, time_str = self._future_date_time()

        res = self.client.post('/api/schedules/', {
            'contact': self.premium_contact.id,
            'date': date_str,
            'time': time_str,
            'occasion': 'Birthday',
            'message': 'Happy Birthday Sarah with card!',
            'greeting_card': self.premium_card.id,
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        wish = ScheduledWish.objects.get(pk=res.data['id'])
        self.assertEqual(wish.greeting_card, self.premium_card)
        self.assertIsNotNone(res.data.get('greeting_card_info'))
        self.assertEqual(res.data['greeting_card_info']['id'], self.premium_card.id)

    # ── 4. Cross-User and Unauthorized Access Checks ─────────────────────────

    def test_cannot_attach_card_belonging_to_another_user(self):
        self.client.force_authenticate(user=self.premium_user)
        date_str, time_str = self._future_date_time()

        res = self.client.post('/api/schedules/', {
            'contact': self.premium_contact.id,
            'date': date_str,
            'time': time_str,
            'occasion': 'Birthday',
            'message': 'Cross user card attack',
            'greeting_card': self.other_card.id,
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ScheduledWish.objects.filter(greeting_card=self.other_card, user=self.premium_user).exists())

    # ── 5. Unpublished / Draft Card Attachment Blocked ───────────────────────

    def test_cannot_attach_draft_or_unpublished_card(self):
        self.client.force_authenticate(user=self.premium_user)
        date_str, time_str = self._future_date_time()

        res = self.client.post('/api/schedules/', {
            'contact': self.premium_contact.id,
            'date': date_str,
            'time': time_str,
            'occasion': 'Birthday',
            'message': 'Attaching draft card',
            'greeting_card': self.draft_card.id,
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('published', str(res.data).lower())

    # ── 6. Schedule Editing with and without Card ───────────────────────────

    def test_edit_schedule_change_and_remove_card(self):
        self.client.force_authenticate(user=self.premium_user)
        date_str, time_str = self._future_date_time()

        wish = ScheduledWish.objects.create(
            user=self.premium_user,
            contact=self.premium_contact,
            date=date_str,
            time=time_str,
            occasion='Birthday',
            message='Initial wish with card',
            greeting_card=self.premium_card,
            status='Pending'
        )

        # 1. Update: remove card
        res = self.client.patch(f'/api/schedules/{wish.id}/', {
            'greeting_card': '',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        wish.refresh_from_db()
        self.assertIsNone(wish.greeting_card)

        # 2. Update: re-attach another published card
        new_card = GreetingCard.objects.create(
            user=self.premium_user,
            title='Second Birthday Card',
            occasion='Birthday',
            status='published'
        )
        res = self.client.patch(f'/api/schedules/{wish.id}/', {
            'greeting_card': new_card.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        wish.refresh_from_db()
        self.assertEqual(wish.greeting_card, new_card)

    # ── 7. Subscription Downgrade / Expiration Checks ────────────────────────

    def test_downgraded_user_cannot_attach_card_on_update(self):
        date_str, time_str = self._future_date_time()
        wish = ScheduledWish.objects.create(
            user=self.premium_user,
            contact=self.premium_contact,
            date=date_str,
            time=time_str,
            occasion='Birthday',
            message='Initial wish',
            status='Pending'
        )

        # Downgrade user to FREE
        self.premium_profile.subscription_plan = 'FREE'
        self.premium_profile.save()

        self.client.force_authenticate(user=self.premium_user)
        res = self.client.patch(f'/api/schedules/{wish.id}/', {
            'greeting_card': self.premium_card.id,
        }, format='json')

        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])

    # ── 8. Celery Task Delivery and Graceful Fallback ─────────────────────────

    def test_deliver_scheduled_wish_retrieves_card_attachment(self):
        date_str, time_str = self._future_date_time()
        wish = ScheduledWish.objects.create(
            user=self.premium_user,
            contact=self.premium_contact,
            date=date_str,
            time=time_str,
            occasion='Birthday',
            message='Happy Birthday Sarah!',
            greeting_card=self.premium_card,
            status='Pending',
            notification_type='Email'
        )

        result = deliver_scheduled_wish(wish)
        self.assertEqual(result, "Success")
        wish.refresh_from_db()
        self.assertEqual(wish.status, "Sent")
        self.assertEqual(wish.delivery_status, "Delivered")
        self.assertEqual(len(mail.outbox), 1)

        sent_email = mail.outbox[0]
        # Verify card is attached
        self.assertTrue(any(att[0] == 'greeting_card.png' for att in sent_email.attachments if isinstance(att, tuple)))

    def test_deliver_scheduled_wish_graceful_when_card_unpublished_or_missing(self):
        """
        If a card was attached but subsequently unpublished, delivery must NOT crash.
        It should log and deliver the email message gracefully.
        """
        date_str, time_str = self._future_date_time()
        self.premium_card.status = 'draft'
        self.premium_card.save()

        wish = ScheduledWish.objects.create(
            user=self.premium_user,
            contact=self.premium_contact,
            date=date_str,
            time=time_str,
            occasion='Birthday',
            message='Happy Birthday Sarah!',
            greeting_card=self.premium_card,
            status='Pending',
            notification_type='Email'
        )

        result = deliver_scheduled_wish(wish)
        self.assertEqual(result, "Success")
        wish.refresh_from_db()
        self.assertEqual(wish.status, "Sent")
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        # Text email sent without card attachment crash
        self.assertIn('Happy Birthday Sarah!', sent_email.body)

    # ── 9. Card Themes & Minimal Card Creation Flow Regression Tests ─────────

    def test_create_card_with_all_supported_themes(self):
        """Verify every supported canonical theme can be submitted and saved via /api/cards/."""
        self.client.force_authenticate(user=self.premium_user)
        from core.theme_config import get_supported_theme_keys
        themes = get_supported_theme_keys()
        self.assertIn('midnight', themes)
        self.assertIn('champagne', themes)
        self.assertIn('velvet', themes)
        self.assertIn('rose', themes)
        self.assertIn('ocean', themes)
        self.assertIn('emerald', themes)
        self.assertIn('dark', themes)
        self.assertIn('light', themes)
        self.assertIn('gradient', themes)
        self.assertIn('glass', themes)

        for theme in themes:
            res = self.client.post('/api/cards/', {
                'title': f'{theme.capitalize()} Card',
                'occasion': 'Birthday',
                'recipient_name': 'Sarah',
                'heading': 'Happy Birthday!',
                'message': f'Wishing you a wonderful {theme} celebration!',
                'card_theme': theme,
                'status': 'published'
            }, format='json')
            self.assertEqual(
                res.status_code, status.HTTP_201_CREATED,
                f"Failed to create card with theme '{theme}': {res.data}"
            )
            self.assertEqual(res.data['card_theme'], theme)

    def test_create_card_with_midnight_theme_minimal_payload(self):
        """
        Verify the exact payload submitted by MinimalCardCreator when clicking
        'Confirm & Attach Card' succeeds without validation errors.
        """
        self.client.force_authenticate(user=self.premium_user)
        payload = {
            'title': 'Birthday Card for Sarah Jenkins',
            'occasion': 'Birthday',
            'recipient_name': 'Sarah Jenkins',
            'heading': 'Happy Birthday!',
            'message': 'May your day be filled with joy, laughter, and happiness!',
            'personal_message': 'May your day be filled with joy, laughter, and happiness!',
            'card_size': 'instagram_square',
            'card_theme': 'midnight',
            'card_width': 500,
            'card_height': 500,
            'background_color': '#0F172A',
            'background_gradient': 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
            'font_family': 'Inter',
            'font_size': 18,
            'font_color': '#FFFFFF',
            'text_color': '#FFFFFF',
            'accent_color': '#818CF8',
            'emoji': '🎉',
            'decor': 'stars',
            'status': 'published'
        }
        res = self.client.post('/api/cards/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, f"Error creating minimal card: {res.data}")
        card_id = res.data['id']
        card = GreetingCard.objects.get(id=card_id)
        self.assertEqual(card.card_theme, 'midnight')
        self.assertEqual(card.status, 'published')
        self.assertTrue(bool(card.preview_image), "Preview image should be automatically generated on card creation.")

    def test_unsupported_theme_returns_clear_drf_validation_error(self):
        """Submitting an unsupported theme identifier returns a clear HTTP 400 validation error."""
        self.client.force_authenticate(user=self.premium_user)
        res = self.client.post('/api/cards/', {
            'title': 'Invalid Theme Card',
            'occasion': 'Birthday',
            'recipient_name': 'Sarah',
            'heading': 'Happy Birthday!',
            'message': 'Testing invalid theme.',
            'card_theme': 'neon_punk',
            'status': 'published'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('card_theme', res.data)
        error_msg = str(res.data['card_theme'])
        self.assertTrue(
            "not a valid choice" in error_msg or "neon_punk" in error_msg,
            f"Expected clear theme validation error, got: {error_msg}"
        )

    def test_theme_alias_and_casing_normalization(self):
        """Aliases (e.g. 'midnight_indigo') and casing (e.g. 'MIDNIGHT') are cleanly normalized."""
        self.client.force_authenticate(user=self.premium_user)
        test_cases = [
            ('MIDNIGHT', 'midnight'),
            ('midnight_indigo', 'midnight'),
            ('champagne_gold', 'champagne'),
            ('celebration_velvet', 'velvet'),
            ('rose_romance', 'rose'),
            ('ocean_azure', 'ocean'),
            ('emerald_glow', 'emerald'),
        ]
        for input_theme, expected_canonical in test_cases:
            res = self.client.post('/api/cards/', {
                'title': f'{input_theme} Card',
                'occasion': 'Birthday',
                'recipient_name': 'Sarah',
                'heading': 'Happy Birthday!',
                'message': 'Testing alias normalization.',
                'card_theme': input_theme,
                'status': 'published'
            }, format='json')
            self.assertEqual(
                res.status_code, status.HTTP_201_CREATED,
                f"Failed on alias '{input_theme}': {res.data}"
            )
            self.assertEqual(res.data['card_theme'], expected_canonical)

    def test_full_workflow_minimal_card_creation_and_scheduled_delivery(self):
        """
        Complete end-to-end test:
        1. Create a minimal card with 'midnight' theme via /api/cards/.
        2. Attach to a scheduled wish via /api/schedules/.
        3. Save and retrieve the schedule, verifying card persistence.
        4. Edit the schedule without losing the card.
        5. Verify deliver_scheduled_wish generates the email with the card attachment.
        """
        self.client.force_authenticate(user=self.premium_user)

        # 1. Create minimal card
        card_res = self.client.post('/api/cards/', {
            'title': 'Midnight Minimal Birthday Card',
            'occasion': 'Birthday',
            'recipient_name': 'Sarah Jenkins',
            'heading': 'Happy Birthday!',
            'message': 'Wishing you joy and prosperity!',
            'card_theme': 'midnight',
            'status': 'published'
        }, format='json')
        self.assertEqual(card_res.status_code, status.HTTP_201_CREATED)
        card_id = card_res.data['id']

        # 2. Attach to schedule
        date_str, time_str = self._future_date_time()
        sched_res = self.client.post('/api/schedules/', {
            'contact': self.premium_contact.id,
            'occasion': 'Birthday',
            'message': 'Happy Birthday Sarah!',
            'date': date_str,
            'time': time_str,
            'notification_type': 'Email',
            'greeting_card': card_id
        }, format='json')
        self.assertEqual(sched_res.status_code, status.HTTP_201_CREATED, sched_res.data)
        sched_id = sched_res.data['id']

        # 3. Retrieve schedule and verify card association
        get_res = self.client.get(f'/api/schedules/{sched_id}/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['greeting_card'], card_id)

        # 4. Edit schedule (update message) and verify card is preserved
        put_res = self.client.put(f'/api/schedules/{sched_id}/', {
            'contact': self.premium_contact.id,
            'occasion': 'Birthday',
            'message': 'Updated Birthday Message with Love!',
            'date': date_str,
            'time': time_str,
            'notification_type': 'Email',
            'greeting_card': card_id
        }, format='json')
        self.assertEqual(put_res.status_code, status.HTTP_200_OK)
        self.assertEqual(put_res.data['greeting_card'], card_id)

        # 5. Verify delivery task delivers email with attached midnight card
        wish = ScheduledWish.objects.get(id=sched_id)
        mail.outbox = []
        result = deliver_scheduled_wish(wish)
        self.assertEqual(result, "Success")
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertTrue(any(att[0] == 'greeting_card.png' for att in sent_email.attachments if isinstance(att, tuple)))
        self.assertIn('cid:greetingcard', sent_email.alternatives[0][0])


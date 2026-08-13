"""
Tests for the ActivityLog system:
- Model validation
- API endpoint security and correctness
- Activity creation via service
- Integration with business logic
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from .models import ActivityLog, Contact, Event, ScheduledWish, GreetingCard, GreetingTemplate
from services.activity_service import create_activity


# ─────────────────────────────────────────────────────────────────────────────
# Model / Service Tests
# ─────────────────────────────────────────────────────────────────────────────

class ActivityLogModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='activityuser', email='act@test.com', password='pass123')

    def test_create_activity_basic(self):
        activity = create_activity(
            user=self.user,
            action_type='CONTACT_CREATED',
            title='New contact added: John Doe',
            entity_type='contact',
            entity_id=1,
            metadata={'contact_name': 'John Doe'},
        )
        self.assertIsNotNone(activity)
        self.assertEqual(activity.user, self.user)
        self.assertEqual(activity.action_type, 'CONTACT_CREATED')
        self.assertEqual(activity.title, 'New contact added: John Doe')
        self.assertEqual(activity.entity_type, 'contact')
        self.assertEqual(activity.entity_id, 1)
        self.assertEqual(activity.metadata['contact_name'], 'John Doe')

    def test_create_activity_rejects_unauthenticated_user(self):
        activity = create_activity(
            user=None,
            action_type='CONTACT_CREATED',
            title='Test',
        )
        self.assertIsNone(activity)

    def test_create_activity_rejects_missing_action_type(self):
        activity = create_activity(
            user=self.user,
            action_type='',
            title='Test',
        )
        self.assertIsNone(activity)

    def test_create_activity_rejects_missing_title(self):
        activity = create_activity(
            user=self.user,
            action_type='CONTACT_CREATED',
            title='',
        )
        self.assertIsNone(activity)

    def test_create_activity_rejects_invalid_action_type(self):
        activity = create_activity(
            user=self.user,
            action_type='INVALID_ACTION',
            title='Test',
        )
        self.assertIsNone(activity)

    def test_create_activity_suppresses_duplicates_within_window(self):
        # First call creates the activity
        activity1 = create_activity(
            user=self.user,
            action_type='CONTACT_CREATED',
            title='New contact added: John Doe',
            entity_type='contact',
            entity_id=1,
            idempotency_key='contact-created-1',
        )
        self.assertIsNotNone(activity1)

        # Second call within the window should return the existing activity
        activity2 = create_activity(
            user=self.user,
            action_type='CONTACT_CREATED',
            title='New contact added: John Doe',
            entity_type='contact',
            entity_id=1,
            idempotency_key='contact-created-1',
        )
        self.assertIsNotNone(activity2)
        self.assertEqual(activity1.id, activity2.id)

        # Total count should still be 1
        self.assertEqual(ActivityLog.objects.filter(user=self.user).count(), 1)

    def test_create_activity_allows_new_activity_after_window(self):
        activity1 = create_activity(
            user=self.user,
            action_type='CONTACT_CREATED',
            title='New contact added: John Doe',
            entity_type='contact',
            entity_id=1,
            idempotency_key='contact-created-2',
        )
        self.assertIsNotNone(activity1)

        # Simulate the first activity being outside the duplicate window
        activity1.created_at = timezone.now() - timedelta(seconds=400)
        activity1.save()

        # Now a new activity with the same idempotency key should be created
        activity2 = create_activity(
            user=self.user,
            action_type='CONTACT_CREATED',
            title='New contact added: Jane Doe',
            entity_type='contact',
            entity_id=2,
            idempotency_key='contact-created-2',
        )
        self.assertIsNotNone(activity2)
        self.assertNotEqual(activity1.id, activity2.id)
        self.assertEqual(ActivityLog.objects.filter(user=self.user).count(), 2)


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoint Tests
# ─────────────────────────────────────────────────────────────────────────────

class RecentActivityAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='apiuser', email='api@test.com', password='pass123')
        self.other_user = User.objects.create_user(username='otheruser', email='other@test.com', password='pass123')

    def _auth(self):
        response = self.client.post('/api/auth/login/', {'email': 'api@test.com', 'password': 'pass123'})
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_unauthenticated_returns_401(self):
        response = self.client.get('/api/dashboard/recent-activity/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_gets_own_activities(self):
        self._auth()
        # Create activities for both users
        ActivityLog.objects.create(user=self.user, action_type='CONTACT_CREATED', title='User activity')
        ActivityLog.objects.create(user=self.other_user, action_type='CONTACT_CREATED', title='Other user activity')

        response = self.client.get('/api/dashboard/recent-activity/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'User activity')

    def test_user_cannot_see_other_users_activities(self):
        self._auth()
        ActivityLog.objects.create(user=self.other_user, action_type='CONTACT_CREATED', title='Other user activity')

        response = self.client.get('/api/dashboard/recent-activity/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_newest_activities_appear_first(self):
        self._auth()
        old_activity = ActivityLog.objects.create(
            user=self.user, action_type='CONTACT_CREATED', title='Old activity',
            created_at=timezone.now() - timedelta(hours=2)
        )
        new_activity = ActivityLog.objects.create(
            user=self.user, action_type='CONTACT_CREATED', title='New activity',
            created_at=timezone.now() - timedelta(minutes=5)
        )

        response = self.client.get('/api/dashboard/recent-activity/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['id'], new_activity.id)
        self.assertEqual(response.data['results'][1]['id'], old_activity.id)

    def test_limit_parameter_works(self):
        self._auth()
        for i in range(15):
            ActivityLog.objects.create(user=self.user, action_type='CONTACT_CREATED', title=f'Activity {i}')

        response = self.client.get('/api/dashboard/recent-activity/?limit=5')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)

    def test_limit_cannot_exceed_maximum(self):
        self._auth()
        for i in range(60):
            ActivityLog.objects.create(user=self.user, action_type='CONTACT_CREATED', title=f'Activity {i}')

        response = self.client.get('/api/dashboard/recent-activity/?limit=100')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 50)

    def test_empty_state_when_no_activities(self):
        self._auth()
        response = self.client.get('/api/dashboard/recent-activity/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
        self.assertEqual(response.data['count'], 0)


# ─────────────────────────────────────────────────────────────────────────────
# Integration Tests: Business Logic Creates Activities
# ─────────────────────────────────────────────────────────────────────────────

class ActivityIntegrationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='intuser', email='int@test.com', password='pass123')

    def _auth(self):
        response = self.client.post('/api/auth/login/', {'email': 'int@test.com', 'password': 'pass123'})
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_contact_creation_creates_activity(self):
        self._auth()
        response = self.client.post('/api/contacts/', {'name': 'John Doe', 'email': 'john@test.com'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activities = ActivityLog.objects.filter(user=self.user, action_type='CONTACT_CREATED')
        self.assertEqual(activities.count(), 1)
        self.assertEqual(activities.first().title, 'New contact added: John Doe')

    def test_event_creation_creates_activity(self):
        self._auth()
        response = self.client.post('/api/events/', {
            'title': 'Birthday Party',
            'type': 'Birthday',
            'date': '2026-12-01',
            'recipient': 'John Doe',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activities = ActivityLog.objects.filter(user=self.user, action_type='EVENT_CREATED')
        self.assertEqual(activities.count(), 1)
        self.assertEqual(activities.first().title, 'New event created: Birthday Party')

    def test_ai_greeting_generation_creates_activity(self):
        self._auth()
        response = self.client.post('/api/ai/generate/', {
            'recipient_name': 'Jane Doe',
            'occasion': 'Birthday',
            'tone': 'Friendly',
        })
        # Activity is only created on successful AI generation (200 OK).
        # If the AI service fails (503/500), no activity should be created.
        if response.status_code == status.HTTP_200_OK:
            activities = ActivityLog.objects.filter(user=self.user, action_type='AI_GREETING_GENERATED')
            self.assertEqual(activities.count(), 1)
            self.assertIn('Jane Doe', activities.first().title)
        else:
            # On failure, verify no activity was created
            activities = ActivityLog.objects.filter(user=self.user, action_type='AI_GREETING_GENERATED')
            self.assertEqual(activities.count(), 0)

    def test_schedule_greeting_creates_activity(self):
        self._auth()
        # First create a contact
        contact_resp = self.client.post('/api/contacts/', {'name': 'Bob Smith', 'email': 'bob@test.com'})
        contact_id = contact_resp.data['id']

        response = self.client.post('/api/ai/schedule/', {
            'contact_id': contact_id,
            'greeting_text': 'Happy Birthday!',
            'occasion': 'Birthday',
            'date': '2026-12-01',
            'time': '09:00',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        activities = ActivityLog.objects.filter(user=self.user, action_type='WISH_SCHEDULED')
        self.assertEqual(activities.count(), 1)
        self.assertIn('Bob Smith', activities.first().title)

    def test_send_greeting_creates_activity(self):
        self._auth()
        # Create contact
        contact_resp = self.client.post('/api/contacts/', {'name': 'Alice', 'email': 'alice@test.com'})
        contact_id = contact_resp.data['id']

        response = self.client.post('/api/ai/send/', {
            'contact_id': contact_id,
            'greeting_text': 'Happy Birthday Alice!',
            'occasion': 'Birthday',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        activities = ActivityLog.objects.filter(user=self.user, action_type='WISH_SENT')
        self.assertEqual(activities.count(), 1)
        self.assertIn('Alice', activities.first().title)

    def test_greeting_card_creation_creates_activity(self):
        self._auth()
        response = self.client.post('/api/cards/', {
            'title': 'Test Card',
            'occasion': 'Birthday',
            'recipient_name': 'Charlie',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activities = ActivityLog.objects.filter(user=self.user, action_type='GREETING_CARD_CREATED')
        self.assertEqual(activities.count(), 1)
        self.assertIn('Charlie', activities.first().title)

    def test_template_creation_creates_activity(self):
        self._auth()
        response = self.client.post('/api/templates/', {
            'name': 'My Template',
            'occasion': 'Birthday',
            'tone': 'Friendly',
            'content': 'Happy Birthday!',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        activities = ActivityLog.objects.filter(user=self.user, action_type='TEMPLATE_CREATED')
        self.assertEqual(activities.count(), 1)
        self.assertEqual(activities.first().title, 'Template created: My Template')

    def test_deleted_entity_does_not_break_activity_rendering(self):
        """Activities should retain their title/metadata even if the related entity is deleted."""
        self._auth()
        contact = Contact.objects.create(user=self.user, name='Temp Contact', email='temp@test.com')
        activity = create_activity(
            user=self.user,
            action_type='CONTACT_CREATED',
            title=f"New contact added: {contact.name}",
            entity_type='contact',
            entity_id=contact.id,
            metadata={'contact_name': contact.name},
        )
        self.assertIsNotNone(activity)

        # Delete the contact
        contact.delete()

        # Activity should still exist and be retrievable
        activity.refresh_from_db()
        self.assertEqual(activity.title, 'New contact added: Temp Contact')
        self.assertEqual(activity.metadata['contact_name'], 'Temp Contact')

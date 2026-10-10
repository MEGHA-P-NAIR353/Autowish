"""
Tests for Global Search API:
- Unauthenticated rejection (401)
- Validation: empty query, max length, invalid limit
- Multi-domain search: contacts, events, scheduled wishes, greeting cards
- Permission and user data isolation
- Category filtering
- Limit handling
"""
import datetime
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from core.models import (
    Contact, Event, ScheduledWish, GreetingCard, GreetingCardTemplate
)


class GlobalSearchAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='searchuser1', email='user1@test.com', password='password123')
        self.user2 = User.objects.create_user(username='searchuser2', email='user2@test.com', password='password123')

        # User 1 Data
        self.contact1 = Contact.objects.create(
            user=self.user1,
            name='Alice Smith',
            email='alice@example.com',
            phone='+1234567890',
            relationship='Colleague',
            tags='work,vip',
            is_favorite=True
        )
        self.contact2 = Contact.objects.create(
            user=self.user1,
            name='Bob Jones',
            email='bob@example.com',
            phone='+9876543210',
            relationship='Friend',
            tags='gym'
        )

        self.event1 = Event.objects.create(
            user=self.user1,
            title='Alice Birthday Celebration',
            type='Birthday',
            date=datetime.date(2026, 11, 15),
            recipient='Alice Smith',
            status='Upcoming'
        )

        self.wish1 = ScheduledWish.objects.create(
            user=self.user1,
            contact=self.contact1,
            date=datetime.date(2026, 11, 15),
            time=datetime.time(9, 0),
            occasion='Birthday',
            message='Happy Birthday Alice! Wishing you a wonderful year ahead!',
            status='Scheduled'
        )

        self.card1 = GreetingCard.objects.create(
            user=self.user1,
            title='Alice Special Birthday Card',
            occasion='Birthday',
            recipient_name='Alice Smith',
            status='published'
        )

        # User 2 Data (should NEVER appear in User 1's search)
        self.contact_user2 = Contact.objects.create(
            user=self.user2,
            name='Alice Wonderland',
            email='alice.secret@other.com',
            phone='+5551234567',
            relationship='Secret Contact'
        )
        self.event_user2 = Event.objects.create(
            user=self.user2,
            title='Alice Secret Party',
            type='Custom',
            date=datetime.date(2026, 12, 1),
            recipient='Alice Wonderland'
        )

    def test_unauthenticated_search_rejected(self):
        resp = self.client.get('/api/search/', {'q': 'Alice'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_query_returns_empty_results(self):
        self.client.force_authenticate(user=self.user1)
        resp = self.client.get('/api/search/', {'q': ''})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['counts']['total'], 0)
        self.assertEqual(len(resp.data['results']), 0)
        self.assertEqual(resp.data['counts']['contacts'], 0)

    def test_excessive_query_length_rejected(self):
        self.client.force_authenticate(user=self.user1)
        long_query = 'a' * 101
        resp = self.client.get('/api/search/', {'q': long_query})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data)

    def test_search_all_categories_for_user1(self):
        self.client.force_authenticate(user=self.user1)
        resp = self.client.get('/api/search/', {'q': 'Alice'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        counts = resp.data['counts']
        self.assertGreaterEqual(counts['contacts'], 1)
        self.assertGreaterEqual(counts['events'], 1)
        self.assertGreaterEqual(counts['scheduled_wishes'], 1)
        self.assertGreaterEqual(counts['greeting_cards'], 1)

        # Check contact item structure
        contact_res = resp.data['grouped']['contacts'][0]
        self.assertEqual(contact_res['title'], 'Alice Smith')
        self.assertEqual(contact_res['category'], 'contacts')
        self.assertIn('/contacts?', contact_res['url'])
        self.assertEqual(contact_res['meta']['email'], 'alice@example.com')

        # Check event item structure
        event_res = resp.data['grouped']['events'][0]
        self.assertEqual(event_res['title'], 'Alice Birthday Celebration')
        self.assertEqual(event_res['category'], 'events')
        self.assertIn('/events?', event_res['url'])

        # Check wish item structure
        wish_res = resp.data['grouped']['scheduled_wishes'][0]
        self.assertEqual(wish_res['category'], 'scheduled_wishes')
        self.assertIn('Alice Smith', wish_res['title'])
        self.assertIn('/schedule?', wish_res['url'])

        # Check card item structure
        card_res = resp.data['grouped']['greeting_cards'][0]
        self.assertEqual(card_res['title'], 'Alice Special Birthday Card')
        self.assertEqual(card_res['category'], 'greeting_cards')
        self.assertIn('/greeting-cards/', card_res['url'])

    def test_user_data_isolation(self):
        """User 1 must NEVER see User 2's data in search results."""
        self.client.force_authenticate(user=self.user1)
        resp = self.client.get('/api/search/', {'q': 'Alice'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        contact_names = [c['title'] for c in resp.data['grouped']['contacts']]
        self.assertIn('Alice Smith', contact_names)
        self.assertNotIn('Alice Wonderland', contact_names)

        event_titles = [e['title'] for e in resp.data['grouped']['events']]
        self.assertIn('Alice Birthday Celebration', event_titles)
        self.assertNotIn('Alice Secret Party', event_titles)

    def test_category_filtering(self):
        self.client.force_authenticate(user=self.user1)

        # Filter: contacts only
        resp = self.client.get('/api/search/', {'q': 'Alice', 'category': 'contacts'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(resp.data['counts']['contacts'], 1)
        self.assertEqual(resp.data['counts']['events'], 0)
        self.assertEqual(resp.data['counts']['scheduled_wishes'], 0)
        self.assertEqual(resp.data['counts']['greeting_cards'], 0)

        # Filter: events only
        resp_ev = self.client.get('/api/search/', {'q': 'Alice', 'category': 'events'})
        self.assertEqual(resp_ev.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_ev.data['counts']['contacts'], 0)
        self.assertGreaterEqual(resp_ev.data['counts']['events'], 1)

    def test_limit_parameter_respected(self):
        self.client.force_authenticate(user=self.user1)
        # Add more contacts
        for i in range(10):
            Contact.objects.create(
                user=self.user1,
                name=f"Test Contact {i}",
                email=f"test{i}@example.com"
            )

        resp = self.client.get('/api/search/', {'q': 'Test Contact', 'category': 'contacts', 'limit': 3})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['grouped']['contacts']), 3)

    def test_fallback_to_greeting_card_template(self):
        self.client.force_authenticate(user=self.user1)
        GreetingCardTemplate.objects.create(
            title='Golden Diwali Sparkle',
            occasion='Diwali',
            category='Luxury',
            is_active=True
        )
        resp = self.client.get('/api/search/', {'q': 'Diwali'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        card_titles = [c['title'] for c in resp.data['grouped']['greeting_cards']]
        self.assertTrue(any('Diwali' in t for t in card_titles))

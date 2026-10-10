import datetime
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Contact, Event, ScheduledWish


class CalendarAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='caluser1', email='caluser1@test.com', password='password123')
        self.user2 = User.objects.create_user(username='caluser2', email='caluser2@test.com', password='password123')

        # User 1 Contacts
        self.contact1 = Contact.objects.create(
            user=self.user1,
            name='Clara Oswald',
            email='clara@example.com',
            birthday='1996-10-14',
            anniversary='2020-10-28',
            relationship='Friend'
        )
        self.contact_leap = Contact.objects.create(
            user=self.user1,
            name='Leap Year Baby',
            email='leap@example.com',
            birthday='2000-02-29',
            relationship='Friend'
        )

        # User 1 Events
        self.event1 = Event.objects.create(
            user=self.user1,
            title="Clara's Surprise Party",
            recipient='Clara Oswald',
            type='Birthday',
            date=datetime.date(2026, 10, 14),
            recurring=False
        )
        self.event2 = Event.objects.create(
            user=self.user1,
            title="Team Yearly Offsite",
            recipient='Team',
            type='Custom',
            date=datetime.date(2023, 10, 20),
            recurring=True,
            recurring_type='yearly'
        )

        # User 1 Scheduled Wish
        self.wish1 = ScheduledWish.objects.create(
            user=self.user1,
            contact=self.contact1,
            date=datetime.date(2026, 10, 14),
            time=datetime.time(9, 30),
            occasion='Birthday',
            status='Scheduled'
        )

        # User 2 Data (isolated)
        self.contact_u2 = Contact.objects.create(
            user=self.user2,
            name='Secret Agent',
            email='agent@test.com',
            birthday='1990-10-15'
        )
        self.event_u2 = Event.objects.create(
            user=self.user2,
            title='User 2 Secret Event',
            recipient='Secret Agent',
            type='Custom',
            date=datetime.date(2026, 10, 15)
        )

    def test_unauthenticated_calendar_access_denied(self):
        res = self.client.get('/api/events/calendar/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_calendar_fetch(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.get('/api/events/calendar/?year=2026&month=10')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIn('count', res.data)
        
        # Should include Clara's Surprise Party, Clara's Anniversary, Team Yearly Offsite, Halloween
        titles = [r['title'] for r in res.data['results']]
        self.assertIn("Clara's Surprise Party", titles)
        self.assertIn("Clara Oswald's Anniversary", titles)
        self.assertIn("Team Yearly Offsite", titles)
        self.assertIn("Halloween", titles)

    def test_user_data_isolation(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.get('/api/events/calendar/?year=2026&month=10')
        titles = [r['title'] for r in res.data['results']]
        recipients = [r['recipient'] for r in res.data['results']]
        
        self.assertNotIn('User 2 Secret Event', titles)
        self.assertNotIn('Secret Agent', recipients)

    def test_event_and_contact_deduplication(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.get('/api/events/calendar/?year=2026&month=10')
        # Clara has an explicit event on Oct 14 and a contact birthday on Oct 14.
        # It should NOT show Clara's Birthday twice on Oct 14!
        oct_14_events = [r for r in res.data['results'] if r['date'] == '2026-10-14']
        clara_birthdays = [e for e in oct_14_events if e['type'] == 'Birthday']
        self.assertEqual(len(clara_birthdays), 1)
        self.assertEqual(clara_birthdays[0]['source'], 'event')

    def test_scheduled_wish_linking(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.get('/api/events/calendar/?year=2026&month=10')
        clara_event = next(r for r in res.data['results'] if r['date'] == '2026-10-14')
        self.assertIsNotNone(clara_event['scheduled_wish'])
        self.assertEqual(clara_event['scheduled_wish']['status'], 'Scheduled')
        self.assertEqual(clara_event['scheduled_wish']['time'], '09:30')

    def test_category_filter(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.get('/api/events/calendar/?year=2026&month=10&type=Anniversary')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for item in res.data['results']:
            self.assertEqual(item['type'], 'Anniversary')
        self.assertTrue(any(r['title'] == "Clara Oswald's Anniversary" for r in res.data['results']))

    def test_search_filter(self):
        self.client.force_authenticate(user=self.user1)
        res = self.client.get('/api/events/calendar/?year=2026&month=10&search=Offsite')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['title'], 'Team Yearly Offsite')

    def test_leap_year_birthday_projection(self):
        self.client.force_authenticate(user=self.user1)
        # 2026 is a non-leap year -> Feb 28
        res = self.client.get('/api/events/calendar/?year=2026&month=2')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        leap_item_2026 = next((r for r in res.data['results'] if r['recipient'] == 'Leap Year Baby'), None)
        self.assertIsNotNone(leap_item_2026)
        self.assertEqual(leap_item_2026['date'], '2026-02-28')

        # 2028 is a leap year -> Feb 29
        res_leap = self.client.get('/api/events/calendar/?year=2028&month=2')
        self.assertEqual(res_leap.status_code, status.HTTP_200_OK)
        leap_item_2028 = next((r for r in res_leap.data['results'] if r['recipient'] == 'Leap Year Baby'), None)
        self.assertIsNotNone(leap_item_2028)
        self.assertEqual(leap_item_2028['date'], '2028-02-29')

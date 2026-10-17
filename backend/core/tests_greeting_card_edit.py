from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Contact, GreetingCard, UserProfile


class GreetingCardEditTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username='user1',
            password='Password123!',
            email='user1@example.com'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            password='Password123!',
            email='user2@example.com'
        )
        self.admin_user = User.objects.create_superuser(
            username='adminuser',
            password='Password123!',
            email='admin@example.com'
        )

        self.contact = Contact.objects.create(
            user=self.user1,
            name='Princy Eban',
            email='princyeban@gmail.com',
            phone='9497669869',
            relationship='Friend'
        )

        self.card = GreetingCard.objects.create(
            user=self.user1,
            title='Princy Birthday Card',
            occasion='Birthday',
            recipient_name='Princy Eban',
            contact=self.contact,
            message='Happy Birthday Princy!',
            font_family='Fredoka',
            font_size=20,
            font_color='#ffffff',
            background_color='#fceabb',
            status='draft',
            text_style={'emoji': '✨', 'sticker': '🎁'}
        )

    def test_retrieve_card_as_owner(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/cards/{self.card.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['id'], self.card.id)
        self.assertEqual(data['recipient_name'], 'Princy Eban')
        self.assertEqual(data['occasion'], 'Birthday')
        self.assertEqual(data['personal_message'], 'Happy Birthday Princy!')
        self.assertEqual(data['font_family'], 'Fredoka')
        self.assertEqual(data['text_color'], '#ffffff')
        self.assertEqual(data['background_color'], '#fceabb')
        self.assertEqual(data['emoji'], '✨')
        self.assertEqual(data['sticker'], '🎁')
        self.assertEqual(data['contact'], self.contact.id)
        self.assertIsNotNone(data['contact_info'])
        self.assertEqual(data['contact_info']['name'], 'Princy Eban')

    def test_retrieve_card_unauthorized_user_denied(self):
        # User2 should not be able to view user1's card
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/cards/{self.card.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_card_admin_allowed(self):
        # Admin should be able to view user1's card
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/cards/{self.card.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.card.id)

    def test_update_card_in_place_no_duplicate(self):
        self.client.force_authenticate(user=self.user1)
        initial_count = GreetingCard.objects.count()

        update_data = {
            'title': 'Princy Birthday Card (Updated)',
            'recipient_name': 'Princy Eban',
            'personal_message': 'Updated birthday greetings!',
            'font_family': 'Outfit',
            'text_color': '#333333',
            'background_color': '#e0f2fe',
            'status': 'draft',
            'emoji': '🎉',
            'sticker': '🎂'
        }
        response = self.client.patch(f'/api/cards/{self.card.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Count should remain identical (no duplicate created)
        self.assertEqual(GreetingCard.objects.count(), initial_count)

        self.card.refresh_from_db()
        self.assertEqual(self.card.title, 'Princy Birthday Card (Updated)')
        self.assertEqual(self.card.message, 'Updated birthday greetings!')
        self.assertEqual(self.card.font_family, 'Outfit')
        self.assertEqual(self.card.font_color, '#333333')
        self.assertEqual(self.card.background_color, '#e0f2fe')
        self.assertEqual(self.card.text_style.get('emoji'), '🎉')
        self.assertEqual(self.card.text_style.get('sticker'), '🎂')

    def test_unauthorized_user_cannot_update_card(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.patch(f'/api/cards/{self.card.id}/', {'title': 'Hacked Title'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.card.refresh_from_db()
        self.assertNotEqual(self.card.title, 'Hacked Title')

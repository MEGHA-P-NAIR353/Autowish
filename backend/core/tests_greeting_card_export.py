import base64
import io
from PIL import Image
from django.test import TestCase
from django.contrib.auth.models import User
from django.core import mail
from django.core.files.base import ContentFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Contact, GreetingCard, ScheduledWish, SentGreetingCard, EmailLog
from core.serializers import GreetingCardSerializer
from core.tasks import deliver_scheduled_wish, _build_card_email


class GreetingCardExportRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='carduser',
            password='Password123!',
            email='carduser@example.com'
        )
        self.client.force_authenticate(user=self.user)

        self.contact = Contact.objects.create(
            user=self.user,
            name='Abhiram',
            email='abhiram@example.com',
            phone='+919876543210',
            relationship='Friend'
        )

        # Create a sample authoritative 1000x1000 RGBA image (2x scale of 500x500 design)
        img = Image.new('RGBA', (1000, 1000), color=(102, 126, 234, 255))
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        self.authoritative_bytes = buffer.getvalue()
        self.authoritative_base64 = f"data:image/png;base64,{base64.b64encode(self.authoritative_bytes).decode('utf-8')}"

        self.malayalam_message = (
            "പ്രിയപ്പെട്ട സുഹൃത്തേ, ജന്മദിനാശംസകൾ! "
            "ജീവിതത്തിൽ എല്ലാ സന്തോഷവും സമാധാനവും ഐശ്വര്യവും വിജയവും വന്നുചേരട്ടെ എന്ന് ആത്മാർത്ഥമായി ആശംസിക്കുന്നു. "
            "ഈ പ്രത്യേക ദിനം അവിസ്മരണീയമായി മാറട്ടെ, ആയുരാരോഗ്യസൗഖ്യങ്ങൾ നേരുന്നു!"
        )

        mail.outbox = []

    def test_save_preview_valid_authoritative_image(self):
        """
        Verify that save_preview accepts the authoritative export image, validates it with PIL,
        preserves the original dimensions (1000x1000), and stores it properly.
        """
        card = GreetingCard.objects.create(
            user=self.user,
            title="Birthday Card for Abhiram",
            occasion="Birthday",
            message=self.malayalam_message
        )

        response = self.client.post(
            f'/api/cards/{card.id}/save-preview/',
            {'image_data': self.authoritative_base64},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('preview_image_url', response.data)
        self.assertEqual(response.data['width'], 1000)
        self.assertEqual(response.data['height'], 1000)

        # Reload card and inspect stored image
        card.refresh_from_db()
        self.assertTrue(bool(card.preview_image))

        # Check stored image dimensions and integrity using PIL
        with card.preview_image.open('rb') as f:
            stored_data = f.read()

        with Image.open(io.BytesIO(stored_data)) as pil_img:
            self.assertEqual(pil_img.size, (1000, 1000))
            self.assertEqual(pil_img.format, 'PNG')

        # Check path structure does not duplicate greeting_cards/previews
        self.assertTrue(card.preview_image.name.startswith('greeting_cards/previews/'))
        self.assertNotIn('greeting_cards/previews/greeting_cards/previews', card.preview_image.name)

    def test_save_preview_rejects_corrupted_or_invalid_image(self):
        """
        Verify backend rejects invalid image bytes, unaccepted formats, and corrupted base64 data.
        """
        card = GreetingCard.objects.create(
            user=self.user,
            title="Invalid Card",
            occasion="Birthday"
        )

        # Corrupted base64 payload
        corrupt_payload = "data:image/png;base64,not_valid_base64_data_xyz!!!"
        response = self.client.post(
            f'/api/cards/{card.id}/save-preview/',
            {'image_data': corrupt_payload},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Non-image valid base64 (text string)
        text_b64 = f"data:image/png;base64,{base64.b64encode(b'this is just plain text, not an image').decode('utf-8')}"
        response2 = self.client.post(
            f'/api/cards/{card.id}/save-preview/',
            {'image_data': text_b64},
            format='json'
        )
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response2.data)

    def test_save_preview_rejects_extreme_dimensions(self):
        """
        Verify rejection of absurd dimensions (<100px or >4000px).
        """
        card = GreetingCard.objects.create(
            user=self.user,
            title="Tiny Card",
            occasion="Birthday"
        )

        # 50x50 image (too small)
        tiny_img = Image.new('RGB', (50, 50), color='blue')
        tiny_buf = io.BytesIO()
        tiny_img.save(tiny_buf, format='PNG')
        tiny_b64 = f"data:image/png;base64,{base64.b64encode(tiny_buf.getvalue()).decode('utf-8')}"

        response = self.client.post(
            f'/api/cards/{card.id}/save-preview/',
            {'image_data': tiny_b64},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_greeting_card_serializer_preserves_personal_message_malayalam(self):
        """
        Verify that personal_message is properly handled and saved into card.message
        preserving full Malayalam unicode text without cutoff or encoding bugs.
        """
        data = {
            'title': 'Malayalam Celebration',
            'occasion': 'Birthday',
            'personal_message': self.malayalam_message,
            'card_width': 500,
            'card_height': 500,
            'font_family': 'Noto Sans Malayalam',
            'font_size': 18
        }

        serializer = GreetingCardSerializer(data=data, context={'request': type('Req', (), {'user': self.user})()})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save(user=self.user)

        self.assertEqual(instance.message, self.malayalam_message)

        # Output representation should have both message and personal_message
        rep = GreetingCardSerializer(instance).data
        self.assertEqual(rep['personal_message'], self.malayalam_message)
        self.assertEqual(rep['message'], self.malayalam_message)

    def test_send_card_delivers_authoritative_image_in_email(self):
        """
        Verify that send_card attaches the authoritative preview image both inline (CID)
        and as an attachment, using the exact unclipped dimensions.
        """
        card = GreetingCard.objects.create(
            user=self.user,
            title="Deepavali Wishes",
            occasion="Festival",
            message=self.malayalam_message
        )
        card.preview_image.save("card_preview.png", ContentFile(self.authoritative_bytes), save=True)

        response = self.client.post(
            f'/api/cards/{card.id}/send/',
            {
                'contact_id': self.contact.id,
                'delivery_channel': 'email'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, [self.contact.email])
        self.assertIn("Festival", sent_email.subject)

        # Verify inline image with cid:greetingcard
        self.assertTrue(any("cid:greetingcard" in alt[0] for alt in sent_email.alternatives if alt[1] == 'text/html'))

        # Verify attachments include inline MIMEImage and downloadable attachment
        self.assertGreaterEqual(len(sent_email.attachments), 2)

        # Find the downloadable png attachment
        download_attachment = next(att for att in sent_email.attachments if isinstance(att, tuple) and att[0].endswith('.png'))
        att_filename, att_bytes, att_mimetype = download_attachment
        self.assertEqual(att_mimetype, 'image/png')
        self.assertEqual(att_bytes, self.authoritative_bytes)

        # Verify attachment dimensions via PIL
        with Image.open(io.BytesIO(att_bytes)) as pil_img:
            self.assertEqual(pil_img.size, (1000, 1000))

        # SentGreetingCard record created
        self.assertTrue(SentGreetingCard.objects.filter(greeting_card=card, contact=self.contact).exists())
        # EmailLog created
        self.assertTrue(EmailLog.objects.filter(recipient=self.contact.email).exists())

    def test_deliver_scheduled_wish_with_authoritative_greeting_card(self):
        """
        Verify that Celery/APScheduler scheduled delivery uses the authoritative greeting card
        image without re-rendering or cropping.
        """
        card = GreetingCard.objects.create(
            user=self.user,
            title="Scheduled Card",
            occasion="Birthday",
            message=self.malayalam_message
        )
        card.preview_image.save("scheduled_preview.png", ContentFile(self.authoritative_bytes), save=True)

        wish = ScheduledWish.objects.create(
            user=self.user,
            contact=self.contact,
            date=timezone.now().date(),
            time=timezone.now().time(),
            occasion="Birthday",
            message=self.malayalam_message,
            greeting_card=card,
            notification_type="Email",
            status="Pending"
        )

        result = deliver_scheduled_wish(wish)
        self.assertEqual(result, "Success")

        wish.refresh_from_db()
        self.assertEqual(wish.status, "Sent")
        self.assertEqual(wish.delivery_status, "Delivered")

        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]

        # Verify attachment contains the authoritative card
        download_attachment = next(att for att in sent_email.attachments if isinstance(att, tuple) and att[0].endswith('.png'))
        att_filename, att_bytes, att_mimetype = download_attachment
        self.assertEqual(att_bytes, self.authoritative_bytes)

        with Image.open(io.BytesIO(att_bytes)) as pil_img:
            self.assertEqual(pil_img.size, (1000, 1000))

    def test_whatsapp_delivery_channel_preserves_card_link_and_logs(self):
        """
        Verify sending card via WhatsApp returns success and logs delivery.
        """
        card = GreetingCard.objects.create(
            user=self.user,
            title="WhatsApp Card",
            occasion="Anniversary",
            message=self.malayalam_message
        )
        card.preview_image.save("wa_preview.png", ContentFile(self.authoritative_bytes), save=True)

        response = self.client.post(
            f'/api/cards/{card.id}/send/',
            {
                'contact_id': self.contact.id,
                'delivery_channel': 'whatsapp'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertTrue(SentGreetingCard.objects.filter(greeting_card=card, delivery_status='Sent').exists())

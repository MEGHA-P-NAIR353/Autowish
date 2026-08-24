import logging
import base64
from celery import shared_task
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from email.mime.image import MIMEImage
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from .models import ScheduledWish, EmailLog, Contact, Event, UserProfile, GeneratedGreeting, Notification
from services.activity_service import create_activity
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from services.ai import generate_ai_wish
import datetime

logger = logging.getLogger(__name__)


def _build_card_email(wish, contact, subject, message_body):
    """
    Build an EmailMultiAlternatives message with optional greeting card image.
    Returns (email_obj, has_card_image).
    """
    has_card_image = False
    card_image_data = None

    # Try to load greeting card preview image
    if wish.greeting_card_id:
        try:
            card = wish.greeting_card
            if card and card.preview_image:
                with card.preview_image.open('rb') as f:
                    card_image_data = f.read()
                has_card_image = True
        except Exception as e:
            logger.warning(f"Could not load greeting card image for wish {wish.id}: {e}")

    # Build HTML email body
    if has_card_image:
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
    .header h1 {{ color: white; margin: 0; font-size: 24px; letter-spacing: 1px; }}
    .card-image {{ padding: 20px; text-align: center; background: #f0f4ff; }}
    .card-image img {{ max-width: 100%; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }}
    .message {{ padding: 30px; color: #333; line-height: 1.8; font-size: 15px; white-space: pre-wrap; }}
    .footer {{ background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }}
    .sent-by {{ color: #667eea; font-weight: bold; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 {wish.occasion} Wishes</h1>
    </div>
    <div class="card-image">
      <img src="cid:greetingcard" alt="Greeting Card" />
    </div>
    <div class="message">{message_body}</div>
    <div class="footer">
      Sent with ❤️ via <span class="sent-by">Auto-Wish AI</span>
    </div>
  </div>
</body>
</html>
"""
    else:
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
    .header h1 {{ color: white; margin: 0; font-size: 24px; }}
    .message {{ padding: 30px; color: #333; line-height: 1.8; font-size: 15px; white-space: pre-wrap; }}
    .footer {{ background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }}
    .sent-by {{ color: #667eea; font-weight: bold; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎉 {wish.occasion} Wishes</h1></div>
    <div class="message">{message_body}</div>
    <div class="footer">Sent with ❤️ via <span class="sent-by">Auto-Wish AI</span></div>
  </div>
</body>
</html>
"""

    email = EmailMultiAlternatives(
        subject=subject,
        body=message_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[contact.email],
    )
    email.attach_alternative(html_body, "text/html")

    if has_card_image and card_image_data:
        # Attach image inline with CID so HTML can reference it
        mime_image = MIMEImage(card_image_data)
        mime_image.add_header('Content-ID', '<greetingcard>')
        mime_image.add_header('Content-Disposition', 'inline', filename='greeting_card.png')
        email.attach(mime_image)

        # Also attach as a standalone download
        email.attach('greeting_card.png', card_image_data, 'image/png')

    return email, has_card_image


@shared_task
def send_email_task(recipient_email, subject, body):
    """Sends a transactional email in the background."""
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False
        )
        logger.info(f"Successfully sent email to {recipient_email} - {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
        return False


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_scheduled_wish_task(self, wish_id):
    """Sends a scheduled wish and records the log."""
    try:
        wish = ScheduledWish.objects.select_related('contact', 'greeting_card').get(pk=wish_id)
        if wish.status == 'Sent':
            return "Already Sent"

        # Set task ID and status to Processing
        wish.task_id = self.request.id
        wish.status = 'Processing'
        wish.delivery_status = 'Sending'
        wish.save()

        contact = wish.contact

        # If Contact has no email, mark failed, notify, never crash
        if not contact or not contact.email:
            wish.status = 'Failed'
            wish.delivery_status = 'Failed'
            wish.last_error = "Contact has no email."
            wish.save()
            logger.error(f"Failed to send scheduled wish {wish_id}: Contact has no email.")
            Notification.objects.create(
                user=wish.user,
                title="Wish Delivery Failed",
                message=f"Could not send {wish.occasion} wish to {contact.name if contact else 'Unknown'}: No email address provided.",
                is_read=False
            )
            
            create_activity(
                user=wish.user,
                action_type='WISH_FAILED',
                title=f"Wish delivery failed for {contact.name if contact else 'Unknown'}",
                entity_type='scheduled_wish',
                entity_id=wish.id,
                metadata={'contact_name': contact.name if contact else 'Unknown', 'occasion': wish.occasion, 'error': wish.last_error}
            )

            return "Failed - No Email"

        # Validate email using Django EmailField / validator
        try:
            validate_email(contact.email)
        except ValidationError:
            wish.status = 'Failed'
            wish.delivery_status = 'Failed'
            wish.last_error = f"Invalid email: '{contact.email}'"
            wish.save()
            logger.error(f"Failed to send scheduled wish {wish_id}: Contact email '{contact.email}' is invalid.")
            Notification.objects.create(
                user=wish.user,
                title="Wish Delivery Failed",
                message=f"Could not send {wish.occasion} wish to {contact.name}: Invalid email address '{contact.email}'.",
                is_read=False
            )
            
            create_activity(
                user=wish.user,
                action_type='WISH_FAILED',
                title=f"Wish delivery failed for {contact.name}",
                entity_type='scheduled_wish',
                entity_id=wish.id,
                metadata={'contact_name': contact.name, 'occasion': wish.occasion, 'error': wish.last_error}
            )

            return "Failed - Invalid Email"

        # Personalize message using wish.contact.name
        message_body = wish.message
        if not message_body:
            message_body = f"Dear {contact.name},\n\nHappy {wish.occasion}! Best wishes!\n\n- Sent via AutoWish AI"
        elif "Dear recipient" in message_body or "dear recipient" in message_body.lower():
            message_body = message_body.replace("recipient", contact.name).replace("Recipient", contact.name)

        subject = wish.email_subject or f"Happy {wish.occasion} from {wish.user.username}!"
        if not wish.email_subject:
            wish.email_subject = subject

        # Build and send email (with optional greeting card attachment)
        email_obj, has_card = _build_card_email(wish, contact, subject, message_body)
        email_obj.send(fail_silently=False)

        wish.status = 'Sent'
        wish.delivery_status = 'Delivered'
        wish.sent_at = timezone.now()
        wish.save()

        EmailLog.objects.create(
            user=wish.user,
            recipient=contact.email,
            subject=subject,
            status='Delivered',
            date=timezone.now().strftime("%b %d, %Y"),
            delivery='Email'
        )
        
        create_activity(
            user=wish.user,
            action_type='WISH_SENT',
            title=f"Birthday wish sent to {contact.name}" if wish.occasion.lower() == 'birthday' else f"{wish.occasion} wish sent to {contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': contact.name, 'occasion': wish.occasion}
        )

        logger.info(f"Wish {wish_id} sent to {contact.email}. Card attached: {has_card}")
        return "Success"

    except ScheduledWish.DoesNotExist:
        logger.error(f"Scheduled wish {wish_id} does not exist.")
        return "Not Found"
    except Exception as exc:
        logger.error(f"Error sending scheduled wish {wish_id}: {exc}")
        wish = ScheduledWish.objects.filter(pk=wish_id).first()
        if wish:
            wish.status = 'Failed'
            wish.delivery_status = 'Failed'
            wish.last_error = str(exc)
            wish.retry_count = self.request.retries + 1
            wish.save()
        try:
            raise self.retry(exc=exc)
        except Exception:
            return "Failed"


@shared_task
def check_daily_wishes_task():
    """Scans events happening today and schedules/delivers wishes for them."""
    today = timezone.localdate()

    # 1. Process scheduled wishes for today
    wishes_today = ScheduledWish.objects.filter(date=today, status='Scheduled').select_related('contact')
    for wish in wishes_today:
        send_scheduled_wish_task.delay(wish.id)

    # 2. Process automated contact events
    # We look for contacts that have birthdays or anniversaries matching today (Format MM-DD)
    month_day_str = today.strftime("%m-%d")
    contacts = Contact.objects.filter(user__profile__subscription_plan__in=['PRO', 'BUSINESS', 'ENTERPRISE'])

    for contact in contacts:
        # Check birthday
        if contact.birthday and month_day_str in contact.birthday:
            trigger_automated_wish(contact, 'Birthday')
        # Check anniversary
        if contact.anniversary and month_day_str in contact.anniversary:
            trigger_automated_wish(contact, 'Anniversary')


def trigger_automated_wish(contact, occasion):
    """Automatically generates and triggers an AI wish for a contact."""
    user = contact.user
    tone = 'Warm'
    language = contact.user.profile.preferred_language or 'en'

    # Generate greeting via Multi-Provider AI service (Gemini -> Groq -> OpenRouter)
    message = None
    try:
        res = generate_ai_wish(
            recipient_name=contact.name,
            occasion=occasion,
            tone=tone,
            language=language,
            relationship=contact.relationship or 'Friend',
            user_id=user.id,
            use_cache=True,
        )
        message = res.get("content")
        if not message:
            logger.warning(f"AI returned empty response for automated wish for {contact.name}")
    except Exception as e:
        logger.error(f"AI auto wish generation failed: {e}")
        message = None

    # If AI failed or no API key, generate a fallback message (but not the hardcoded generic one)
    if not message:
        if occasion == 'Birthday':
            message = f"Dear {contact.name},\n\nHappy Birthday! May your day be filled with joy, laughter, and all the things that make you smile. May this special year ahead bring you countless wonderful memories.\n\nWarmest wishes,\n{user.username}"
        elif occasion == 'Anniversary':
            message = f"Dear {contact.name},\n\nCongratulations on your {occasion}! May this milestone bring you even closer and fill your journey with beautiful moments ahead.\n\nWarm regards,\n{user.username}"
        else:
            message = f"Dear {contact.name},\n\nWishing you a wonderful {occasion}! May this occasion bring you joy and happiness.\n\nWarm regards,\n{user.username}"

    # Create and schedule immediately
    wish = ScheduledWish.objects.create(
        user=user,
        contact=contact,
        date=timezone.localdate(),
        time=timezone.localtime().time(),
        occasion=occasion,
        message=message,
        timezone=user.profile.timezone,
        status='Scheduled'
    )

    create_activity(
        user=user,
        action_type='WISH_SCHEDULED',
        title=f"Automated wish scheduled for {contact.name}",
        entity_type='scheduled_wish',
        entity_id=wish.id,
        metadata={'contact_name': contact.name, 'occasion': occasion, 'automated': True}
    )

    send_scheduled_wish_task.delay(wish.id)
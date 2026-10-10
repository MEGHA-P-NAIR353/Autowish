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
import pytz
from django.db import transaction

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


def get_wish_scheduled_datetime_utc(wish):
    """Return the timezone-aware scheduled datetime in UTC."""
    tz_name = wish.timezone or 'Asia/Kolkata'
    try:
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = pytz.timezone('Asia/Kolkata')

    wish_date = wish.date
    wish_time = wish.time
    if isinstance(wish_date, str):
        wish_date = datetime.datetime.strptime(wish_date, '%Y-%m-%d').date()
    if isinstance(wish_time, str):
        try:
            wish_time = datetime.datetime.strptime(wish_time, '%H:%M').time()
        except ValueError:
            wish_time = datetime.datetime.strptime(wish_time, '%H:%M:%S').time()

    naive_dt = datetime.datetime.combine(wish_date, wish_time)
    aware_dt = tz.localize(naive_dt)
    return aware_dt.astimezone(pytz.UTC)


def is_wish_due(wish, current_time=None):
    """
    Return True if the wish's scheduled datetime is <= current_time (UTC).
    """
    if current_time is None:
        current_time = timezone.now()
    scheduled_utc = get_wish_scheduled_datetime_utc(wish)
    return scheduled_utc <= current_time


def deliver_scheduled_wish(wish):
    """
    Delivers a single scheduled wish. Updates status to 'Sent' only upon successful delivery.
    Records failures safely and handles retry without duplicate sending.
    """
    contact = wish.contact

    # 1. Validate contact existence
    if not contact:
        wish.status = 'Failed'
        wish.delivery_status = 'Failed'
        wish.last_error = "Contact does not exist."
        wish.save(update_fields=['status', 'delivery_status', 'last_error', 'updated_at'])
        logger.error(f"Failed to deliver wish {wish.id}: Contact does not exist.")
        return "Failed - No Contact"

    # 2. Validate email recipient if delivery channel is Email (or default)
    notification_type = getattr(wish, 'notification_type', 'Email') or 'Email'
    if notification_type in ['Email', 'Push']:
        if not contact.email:
            wish.status = 'Failed'
            wish.delivery_status = 'Failed'
            wish.last_error = "Contact has no email."
            wish.save(update_fields=['status', 'delivery_status', 'last_error', 'updated_at'])
            logger.error(f"Failed to send scheduled wish {wish.id}: Contact has no email.")
            Notification.objects.create(
                user=wish.user,
                title="Wish Delivery Failed",
                message=f"Could not send {wish.occasion} wish to {contact.name}: No email address provided.",
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
            return "Failed - No Email"

        try:
            validate_email(contact.email)
        except ValidationError:
            wish.status = 'Failed'
            wish.delivery_status = 'Failed'
            wish.last_error = f"Invalid email: '{contact.email}'"
            wish.save(update_fields=['status', 'delivery_status', 'last_error', 'updated_at'])
            logger.error(f"Failed to send scheduled wish {wish.id}: Contact email '{contact.email}' is invalid.")
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

    # 3. Personalize message using wish.contact.name
    message_body = wish.message
    if not message_body:
        message_body = f"Dear {contact.name},\n\nHappy {wish.occasion}! Best wishes!\n\n- Sent via AutoWish AI"
    elif "Dear recipient" in message_body or "dear recipient" in message_body.lower():
        message_body = message_body.replace("recipient", contact.name).replace("Recipient", contact.name)

    subject = wish.email_subject or f"Happy {wish.occasion} from {wish.user.username}!"
    if not wish.email_subject:
        wish.email_subject = subject

    # 4. Build and send email
    try:
        email_obj, has_card = _build_card_email(wish, contact, subject, message_body)
        email_obj.send(fail_silently=False)

        wish.status = 'Sent'
        wish.delivery_status = 'Delivered'
        wish.sent_at = timezone.now()
        wish.last_error = None
        wish.save(update_fields=['status', 'delivery_status', 'sent_at', 'last_error', 'updated_at'])

        EmailLog.objects.create(
            user=wish.user,
            recipient=contact.email or (contact.phone if hasattr(contact, 'phone') else 'N/A'),
            subject=subject,
            status='Delivered',
            date=timezone.now().strftime("%b %d, %Y"),
            delivery=notification_type
        )

        create_activity(
            user=wish.user,
            action_type='WISH_SENT',
            title=f"Birthday wish sent to {contact.name}" if wish.occasion.lower() == 'birthday' else f"{wish.occasion} wish sent to {contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': contact.name, 'occasion': wish.occasion}
        )

        Notification.objects.create(
            user=wish.user,
            title=f"Wish Sent to {contact.name}",
            message=f"Your {wish.occasion} greeting was successfully delivered to {contact.name}.",
            is_read=False
        )

        logger.info(f"Wish {wish.id} sent to {contact.email}. Card attached: {has_card}")
        return "Success"

    except Exception as exc:
        logger.error(f"Error delivering scheduled wish {wish.id}: {exc}")
        wish.retry_count = (wish.retry_count or 0) + 1
        wish.last_error = str(exc)

        if wish.retry_count >= 3:
            wish.status = 'Failed'
            wish.delivery_status = 'Failed'
            Notification.objects.create(
                user=wish.user,
                title="Wish Delivery Failed",
                message=f"Could not deliver {wish.occasion} wish to {contact.name}: {exc}",
                is_read=False
            )
            create_activity(
                user=wish.user,
                action_type='WISH_FAILED',
                title=f"Wish delivery failed for {contact.name}",
                entity_type='scheduled_wish',
                entity_id=wish.id,
                metadata={'contact_name': contact.name, 'occasion': wish.occasion, 'error': str(exc)}
            )
        else:
            wish.status = 'Pending'
            wish.delivery_status = 'Retrying'

        wish.save(update_fields=['status', 'delivery_status', 'last_error', 'retry_count', 'updated_at'])
        return f"Failed - {exc}"


def process_due_schedules(current_time=None):
    """
    Finds and processes all due schedules whose status is 'Pending' or 'Scheduled'.
    Uses transactional locking (select_for_update) to prevent duplicate sends across
    concurrent processes/workers.
    """
    if current_time is None:
        current_time = timezone.now()

    tomorrow_date = (current_time + datetime.timedelta(days=1)).date()

    candidate_ids = list(
        ScheduledWish.objects.filter(
            status__in=['Pending', 'Scheduled'],
            date__lte=tomorrow_date
        ).values_list('id', flat=True)
    )

    processed_count = 0

    for wish_id in candidate_ids:
        try:
            wish_to_deliver = None
            with transaction.atomic():
                wish = ScheduledWish.objects.select_for_update(skip_locked=True).filter(
                    pk=wish_id,
                    status__in=['Pending', 'Scheduled']
                ).select_related('contact', 'user').first()

                if not wish:
                    continue

                if not is_wish_due(wish, current_time):
                    continue

                # Mark as Processing to lock out any other worker
                wish.status = 'Processing'
                wish.delivery_status = 'Sending'
                wish.save(update_fields=['status', 'delivery_status', 'updated_at'])
                wish_to_deliver = wish

            if wish_to_deliver:
                deliver_scheduled_wish(wish_to_deliver)
                processed_count += 1
        except Exception as e:
            logger.error(f"Error processing due schedule {wish_id}: {e}")

    return processed_count


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_scheduled_wish_task(self, wish_id):
    """Sends a scheduled wish and records the log."""
    try:
        wish = ScheduledWish.objects.select_related('contact', 'greeting_card', 'user').get(pk=wish_id)
        if wish.status == 'Sent':
            return "Already Sent"
        if wish.status == 'Cancelled':
            return "Cancelled"

        # Check due condition to prevent premature sending
        if not is_wish_due(wish):
            logger.warning(f"Wish {wish_id} is not due yet. Scheduled for {wish.date} {wish.time} {wish.timezone}. Refusing to send.")
            if wish.status == 'Processing':
                wish.status = 'Pending'
                wish.save(update_fields=['status', 'updated_at'])
            return "Not Due"

        wish.task_id = self.request.id if getattr(self, 'request', None) else None
        wish.status = 'Processing'
        wish.delivery_status = 'Sending'
        wish.save(update_fields=['task_id', 'status', 'delivery_status', 'updated_at'])

        res = deliver_scheduled_wish(wish)
        if res.startswith("Failed - ") and getattr(self, 'request', None) and self.request.retries < 3:
            raise Exception(res)
        return res

    except ScheduledWish.DoesNotExist:
        logger.error(f"Scheduled wish {wish_id} does not exist.")
        return "Not Found"
    except Exception as exc:
        logger.error(f"Error sending scheduled wish {wish_id}: {exc}")
        wish = ScheduledWish.objects.filter(pk=wish_id).first()
        if wish and wish.status not in ['Sent', 'Cancelled']:
            retries = (self.request.retries + 1) if getattr(self, 'request', None) else (wish.retry_count + 1)
            wish.retry_count = retries
            wish.last_error = str(exc)
            if retries >= 3:
                wish.status = 'Failed'
                wish.delivery_status = 'Failed'
            else:
                wish.status = 'Pending'
                wish.delivery_status = 'Retrying'
            wish.save(update_fields=['status', 'delivery_status', 'last_error', 'retry_count', 'updated_at'])
        try:
            raise self.retry(exc=exc)
        except Exception:
            return "Failed"


@shared_task
def process_due_schedules_task():
    """Periodic task executed by Celery Beat every minute to process due wishes."""
    return process_due_schedules()


@shared_task
def check_daily_wishes_task():
    """Processes due wishes and scans events happening today to trigger automated contact wishes."""
    # 1. Process due scheduled wishes
    process_due_schedules()

    # 2. Process automated contact events
    # We look for contacts that have birthdays or anniversaries matching today (Format MM-DD)
    today = timezone.localdate()
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
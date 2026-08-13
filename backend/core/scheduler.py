from apscheduler.schedulers.background import BackgroundScheduler
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import ScheduledWish, EmailLog, Notification
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import datetime
import logging
import atexit

logger = logging.getLogger(__name__)

# Initialize background scheduler
scheduler = BackgroundScheduler(daemon=True)

def send_scheduled_wishes():
    """APScheduler job to check and send scheduled wishes for the current day."""
    today = timezone.localdate()
    # 8. Add select_related("contact") everywhere to prevent N+1 queries
    wishes = ScheduledWish.objects.filter(date=today, status='Scheduled').select_related('contact')
    
    for wish in wishes:
        contact = wish.contact
        try:
            # 11. If Contact has no email, mark Failed, log the failure, create a Notification, never crash
            if not contact or not contact.email:
                wish.status = 'Failed'
                wish.save()
                logger.error(f"Failed to send scheduled wish {wish.id}: Contact has no email address.")
                Notification.objects.create(
                    user=wish.user,
                    title="Wish Delivery Failed",
                    message=f"Could not send {wish.occasion} wish to {contact.name if contact else 'Unknown'}: No email address provided.",
                    is_read=False
                )
                continue
                
            # 9. Validate email using Django EmailField / validator
            try:
                validate_email(contact.email)
            except ValidationError:
                wish.status = 'Failed'
                wish.save()
                logger.error(f"Failed to send scheduled wish {wish.id}: Contact email '{contact.email}' is invalid.")
                Notification.objects.create(
                    user=wish.user,
                    title="Wish Delivery Failed",
                    message=f"Could not send {wish.occasion} wish to {contact.name}: Invalid email address '{contact.email}'.",
                    is_read=False
                )
                continue
                
            message_body = wish.message
            if not message_body:
                message_body = f"Dear {contact.name},\n\nHappy {wish.occasion}! We hope you have a wonderful day.\n\n- AutoWish AI"
            elif "Dear recipient" in message_body or "dear recipient" in message_body.lower():
                message_body = message_body.replace("recipient", contact.name).replace("Recipient", contact.name)

            send_mail(
                subject=f'Happy {wish.occasion} from AutoWish AI',
                message=message_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[contact.email],
                fail_silently=False,
            )
            
            # Log
            # 5. Update EmailLog so recipient stores wish.contact.email
            EmailLog.objects.create(
                user=wish.user,
                recipient=contact.email,
                subject=f"Happy {wish.occasion}",
                status='Delivered',
                date=today.strftime("%b %d, %Y"),
                delivery='Email'
            )
            wish.status = 'Sent'
            wish.save()
            logger.info(f"Successfully sent scheduled wish to {contact.email}")
        except Exception as e:
            logger.error(f"Failed to send scheduled wish {wish.id}: {e}")
            wish.status = 'Failed'
            wish.save()

def start_scheduler():
    """Starts the background scheduler, scheduling the sending job with robust settings."""
    if not scheduler.running:
        scheduler.add_job(
            send_scheduled_wishes,
            'interval',
            minutes=1,
            id='send_scheduled_wishes_job',
            replace_existing=True,
            max_instances=1,
            coalesce=True
        )
        scheduler.start()
        logger.info("AutoWish APScheduler started successfully")
        
        # Graceful shutdown configuration
        atexit.register(lambda: shutdown_scheduler())

def shutdown_scheduler():
    """Shuts down the scheduler gracefully if running."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("AutoWish APScheduler shut down gracefully")

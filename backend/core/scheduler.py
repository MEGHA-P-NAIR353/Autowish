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
    """APScheduler job to check and send due scheduled wishes using the unified due-schedule processor."""
    try:
        from .tasks import process_due_schedules
        count = process_due_schedules()
        if count > 0:
            logger.info(f"APScheduler processed {count} due wish(es).")
    except Exception as e:
        logger.error(f"Error in APScheduler send_scheduled_wishes: {e}")

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

from django.utils import timezone
from core.models import ActivityLog
import logging
from django.db import transaction

logger = logging.getLogger(__name__)

# Time window (seconds) within which duplicate activities are suppressed
DUPLICATE_WINDOW_SECONDS = 300  # 5 minutes


def create_activity(
    user,
    action_type,
    title,
    description=None,
    entity_type=None,
    entity_id=None,
    metadata=None,
    idempotency_key=None,
):
    """
    Centralized utility to create an activity log entry.

    Args:
        user: The authenticated user who performed the action.
        action_type: One of ActivityLog.ACTION_CHOICES.
        title: Short human-readable title (e.g. "New contact added: John Doe").
        description: Optional longer description.
        entity_type: Optional related model name (e.g. "contact", "scheduled_wish").
        entity_id: Optional related model primary key.
        metadata: Optional dict of extra context (no sensitive data).
        idempotency_key: Optional string to prevent duplicate activities within a
            short time window. If provided, an existing activity with the same
            user, action_type, entity_type, entity_id, and idempotency_key
            created within DUPLICATE_WINDOW_SECONDS will not be re-created.

    Returns:
        ActivityLog instance or None on failure.
    """
    try:
        if metadata is None:
            metadata = {}

        # Validate required fields
        if not user or not user.is_authenticated:
            logger.warning("create_activity called without an authenticated user.")
            return None

        if not action_type:
            logger.warning("create_activity called without action_type.")
            return None

        if not title:
            logger.warning("create_activity called without title.")
            return None

        # Validate action_type against choices
        valid_choices = {choice[0] for choice in ActivityLog.ACTION_CHOICES}
        if action_type not in valid_choices:
            logger.warning(f"create_activity called with invalid action_type: {action_type}")
            return None

        # Idempotency / duplicate prevention
        if idempotency_key:
            cutoff = timezone.now() - timezone.timedelta(seconds=DUPLICATE_WINDOW_SECONDS)
            existing = ActivityLog.objects.filter(
                user=user,
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                created_at__gte=cutoff,
            )
            # If an idempotency_key is provided, we also store it in metadata
            # and check for it on subsequent calls.
            if idempotency_key:
                existing = existing.filter(metadata__idempotency_key=idempotency_key)
            if existing.exists():
                logger.debug(
                    f"Duplicate activity suppressed for user={user.id}, "
                    f"action={action_type}, key={idempotency_key}"
                )
                return existing.first()

        # Store idempotency key in metadata if provided
        if idempotency_key:
            metadata = {**metadata, "idempotency_key": idempotency_key}

        with transaction.atomic():
            activity = ActivityLog.objects.create(
                user=user,
                action_type=action_type,
                title=title,
                description=description,
                entity_type=entity_type,
                entity_id=entity_id,
                metadata=metadata,
            )
        return activity
    except Exception as e:
        logger.error(f"Failed to create activity log: {e}")
        return None

"""
Subscription usage tracking and plan limit enforcement.
"""
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from core.models import GeneratedGreeting, ScheduledWish, UserProfile
from core.plan_config import PLAN_DEFINITIONS, get_plan_definition


def _get_month_start():
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_user_plan_id(user):
    if not hasattr(user, 'profile'):
        return 'FREE'
    return user.profile.subscription_plan or 'FREE'


def get_effective_limits(user):
    """
    Return effective monthly limits for the user.
    None limit means unlimited (Enterprise with unset custom limits).
    """
    profile = user.profile
    plan_id = profile.subscription_plan
    plan = get_plan_definition(plan_id)

    if plan_id == 'ENTERPRISE':
        return {
            'plan_id': plan_id,
            'scheduled_wish_limit': profile.custom_scheduled_wish_limit,
            'ai_generation_limit': profile.custom_ai_generation_limit,
        }

    return {
        'plan_id': plan_id,
        'scheduled_wish_limit': plan['scheduled_wish_limit'],
        'ai_generation_limit': plan['ai_generation_limit'],
    }


def count_monthly_scheduled_wishes(user):
    return ScheduledWish.objects.filter(
        user=user,
        created_at__gte=_get_month_start(),
    ).count()


def count_monthly_ai_generations(user):
    return GeneratedGreeting.objects.filter(
        user=user,
        created_at__gte=_get_month_start(),
    ).count()


def _remaining(used, limit):
    if limit is None:
        return None
    return max(0, limit - used)


def get_usage_summary(user):
    limits = get_effective_limits(user)
    wishes_used = count_monthly_scheduled_wishes(user)
    ai_used = count_monthly_ai_generations(user)
    wish_limit = limits['scheduled_wish_limit']
    ai_limit = limits['ai_generation_limit']

    return {
        'plan': limits['plan_id'],
        'scheduled_wishes': {
            'used': wishes_used,
            'limit': wish_limit,
            'remaining': _remaining(wishes_used, wish_limit),
        },
        'ai_generations': {
            'used': ai_used,
            'limit': ai_limit,
            'remaining': _remaining(ai_used, ai_limit),
        },
    }


def _limit_reached(used, limit):
    if limit is None:
        return False
    return used >= limit


def check_scheduled_wish_limit(user):
    limits = get_effective_limits(user)
    used = count_monthly_scheduled_wishes(user)
    if _limit_reached(used, limits['scheduled_wish_limit']):
        raise PermissionDenied({
            'detail': 'You have reached your monthly scheduled wish limit for your current plan.',
            'code': 'SCHEDULED_WISH_LIMIT_REACHED',
        })


def check_ai_generation_limit(user):
    limits = get_effective_limits(user)
    used = count_monthly_ai_generations(user)
    if _limit_reached(used, limits['ai_generation_limit']):
        raise PermissionDenied({
            'detail': "You've used all your AI wishes for this plan. Upgrade your plan to generate more personalized greetings!",
            'code': 'AI_WISH_LIMIT_REACHED',
            'error': 'AI Wish Limit Reached',
            'plan': limits['plan_id'],
            'limit': limits['ai_generation_limit'],
            'used': used,
            'remaining': 0,
        })


NOTIFICATION_TYPE_FEATURE_MAP = {
    'Email': 'email',
    'SMS': 'sms',
    'WhatsApp': 'whatsapp',
    'Push': 'email',  # Push notifications available on all plans with email
}


def check_delivery_channel(user, notification_type):
    """Verify the user's plan allows the requested delivery channel."""
    feature_key = NOTIFICATION_TYPE_FEATURE_MAP.get(notification_type, 'email')
    if feature_key == 'email':
        return

    plan_id = get_user_plan_id(user)
    flags = get_plan_definition(plan_id).get('feature_flags', {})
    if not flags.get(feature_key, False):
        raise PermissionDenied({
            'detail': f'Your current plan does not include {notification_type} delivery. Please upgrade to access this channel.',
            'code': 'PLAN_FEATURE_NOT_AVAILABLE',
        })


def user_has_feature(user, feature_key):
    plan_id = get_user_plan_id(user)
    flags = get_plan_definition(plan_id).get('feature_flags', {})
    return flags.get(feature_key, False)


def user_can_attach_greeting_cards(user):
    """
    Check if a user is entitled to attach greeting cards to scheduled wishes.
    Superusers, staff, and roles in ('super_admin', 'admin', 'premium') are always entitled.
    Otherwise, entitlement is determined by the 'attach_greeting_cards' feature flag on their plan.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    if hasattr(user, 'profile'):
        role = getattr(user.profile, 'role', 'free')
        if role in ('super_admin', 'admin', 'premium'):
            return True
        plan_id = getattr(user.profile, 'subscription_plan', 'FREE') or 'FREE'
        if plan_id in ('PRO', 'BUSINESS', 'ENTERPRISE'):
            return True
    return user_has_feature(user, 'attach_greeting_cards')


def check_greeting_card_attachment_allowed(user):
    """
    Raise PermissionDenied if the user's subscription does not entitle them
    to attach greeting cards to scheduled wishes.
    """
    if not user_can_attach_greeting_cards(user):
        raise PermissionDenied({
            'detail': 'Attaching greeting cards to scheduled wishes is a premium feature. Please upgrade your plan to attach greeting cards.',
            'code': 'PLAN_FEATURE_NOT_AVAILABLE',
            'feature': 'attach_greeting_cards',
        })


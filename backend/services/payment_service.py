"""
Dummy/sandbox payment processing for Auto-Wish AI subscriptions.
No real payment providers — metadata only, no card data stored.
"""
import secrets
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core.models import SubscriptionTransaction, Notification
from core.plan_config import CHECKOUT_AMOUNTS, CURRENCY, get_plan_definition, get_checkout_amount
from services.activity_service import create_activity


PURCHASABLE_PLANS = ('PRO', 'BUSINESS')
PLAN_RANK = SubscriptionTransaction.PLAN_RANK


def _generate_transaction_id():
    return f"AWAI-{secrets.token_hex(4).upper()}"


def _normalize_status(status):
    """Map legacy status values to current choices."""
    mapping = {
        'Pending': 'PENDING',
        'Completed': 'SUCCESS',
        'Failed': 'FAILED',
        'Cancelled': 'CANCELLED',
    }
    return mapping.get(status, status)


def _payment_to_dict(payment):
    return {
        'payment_id': payment.id,
        'transaction_id': payment.transaction_id,
        'plan': payment.plan,
        'plan_name': get_plan_definition(payment.plan).get('name', payment.plan),
        'amount': float(payment.amount),
        'currency': payment.currency,
        'status': _normalize_status(payment.status),
        'gateway': payment.gateway,
        'created_at': payment.created_at.isoformat(),
        'updated_at': payment.updated_at.isoformat(),
    }


def _validate_purchasable_plan(user, plan_id):
    plan_id = (plan_id or '').upper()
    if plan_id not in PURCHASABLE_PLANS:
        raise ValueError('INVALID_PLAN')

    current_plan = user.profile.subscription_plan
    if current_plan == plan_id:
        raise ValueError('ALREADY_SUBSCRIBED')

    if PLAN_RANK.get(current_plan, 0) > PLAN_RANK.get(plan_id, 0):
        raise ValueError('PLAN_DOWNGRADE_NOT_ALLOWED')

    amount = get_checkout_amount(plan_id)
    if amount is None:
        raise ValueError('CHECKOUT_NOT_AVAILABLE')

    return plan_id, Decimal(str(amount))


def create_dummy_payment(user, plan_id):
    plan_id, amount = _validate_purchasable_plan(user, plan_id)

    payment = SubscriptionTransaction.objects.create(
        user=user,
        gateway='mock',
        transaction_id=_generate_transaction_id(),
        amount=amount,
        currency=CURRENCY,
        plan=plan_id,
        status='PENDING',
    )
    return _payment_to_dict(payment)


def get_payment_for_user(user, payment_id):
    try:
        payment = SubscriptionTransaction.objects.get(pk=payment_id, user=user)
    except SubscriptionTransaction.DoesNotExist:
        return None
    return _payment_to_dict(payment)


def list_payments_for_user(user):
    payments = SubscriptionTransaction.objects.filter(user=user).order_by('-created_at')[:50]
    return [_payment_to_dict(p) for p in payments]


def _activate_subscription(user, plan_id):
    profile = user.profile
    profile.subscription_plan = plan_id
    profile.save(update_fields=['subscription_plan'])


@transaction.atomic
def process_dummy_payment(user, payment_id, outcome):
    """
    Process a dummy payment outcome: 'success' or 'failed'.
    Idempotent — repeated success calls return existing result without re-activating.
    """
    try:
        payment = SubscriptionTransaction.objects.select_for_update().get(
            pk=payment_id, user=user
        )
    except SubscriptionTransaction.DoesNotExist:
        raise ValueError('PAYMENT_NOT_FOUND')

    normalized = _normalize_status(payment.status)

    if normalized == 'SUCCESS':
        return {
            'success': True,
            'payment_status': 'SUCCESS',
            'transaction_id': payment.transaction_id,
            'plan': payment.plan,
            'amount': float(payment.amount),
            'currency': payment.currency,
            'already_processed': True,
        }

    if normalized in ('FAILED', 'CANCELLED'):
        return {
            'success': False,
            'payment_status': normalized,
            'transaction_id': payment.transaction_id,
            'plan': payment.plan,
            'amount': float(payment.amount),
            'currency': payment.currency,
            'already_processed': True,
        }

    if outcome == 'success':
        payment.status = 'SUCCESS'
        payment.save(update_fields=['status', 'updated_at'])
        _activate_subscription(user, payment.plan)

        create_activity(
            user=user,
            action_type='SUBSCRIPTION_UPDATED',
            title=f"Subscription upgraded to {payment.plan}",
            entity_type='subscription_transaction',
            entity_id=payment.id,
            metadata={
                'plan': payment.plan,
                'gateway': payment.gateway,
                'amount': str(payment.amount),
                'transaction_id': payment.transaction_id,
            },
        )

        Notification.objects.create(
            user=user,
            title='Subscription Upgraded!',
            message=f'Thank you! Your account has been upgraded to the {payment.plan} plan successfully.',
            type='system',
        )

        return {
            'success': True,
            'payment_status': 'SUCCESS',
            'transaction_id': payment.transaction_id,
            'plan': payment.plan,
            'amount': float(payment.amount),
            'currency': payment.currency,
            'already_processed': False,
        }

    if outcome == 'failed':
        payment.status = 'FAILED'
        payment.save(update_fields=['status', 'updated_at'])
        return {
            'success': False,
            'payment_status': 'FAILED',
            'transaction_id': payment.transaction_id,
            'plan': payment.plan,
            'amount': float(payment.amount),
            'currency': payment.currency,
            'already_processed': False,
        }

    raise ValueError('INVALID_OUTCOME')


@transaction.atomic
def cancel_dummy_payment(user, payment_id):
    try:
        payment = SubscriptionTransaction.objects.select_for_update().get(
            pk=payment_id, user=user
        )
    except SubscriptionTransaction.DoesNotExist:
        raise ValueError('PAYMENT_NOT_FOUND')

    normalized = _normalize_status(payment.status)
    if normalized == 'SUCCESS':
        raise ValueError('PAYMENT_ALREADY_COMPLETED')

    if normalized == 'CANCELLED':
        return _payment_to_dict(payment)

    if normalized == 'PENDING':
        payment.status = 'CANCELLED'
        payment.save(update_fields=['status', 'updated_at'])

    return _payment_to_dict(payment)

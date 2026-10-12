import os
import logging
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction

logger = logging.getLogger(__name__)


def ensure_admin_user(admin_email=None, admin_password=None, sync_password=False):
    """
    Idempotently creates or updates the default administrator account
    using environment variables ADMIN_EMAIL and ADMIN_PASSWORD.
    
    Guarantees:
    - Never logs or exposes the password.
    - Idempotent: safe to run during migrations, startup, and login.
    - Ensures proper is_staff, is_superuser flags, and super_admin profile role.
    - Preserves existing password unless sync_password=True or password is unusable.
    - Does not create duplicate accounts.
    """
    email = (admin_email or getattr(settings, 'ADMIN_EMAIL', None) or os.getenv('ADMIN_EMAIL', '')).strip()
    password = admin_password if admin_password is not None else (getattr(settings, 'ADMIN_PASSWORD', None) or os.getenv('ADMIN_PASSWORD', ''))

    if not email:
        logger.debug("Admin provisioning skipped: ADMIN_EMAIL is not configured.")
        return None

    if not password and not sync_password:
        logger.debug("Admin provisioning note: ADMIN_PASSWORD is not provided.")

    try:
        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()

            if not user:
                # Fallback check by common username
                base_username = email.split('@')[0].strip() or 'admin'
                user = User.objects.filter(username__iexact=base_username).first()

            if not user:
                # Ensure username uniqueness
                username = base_username
                counter = 1
                while User.objects.filter(username__iexact=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1

                user = User.objects.create(
                    username=username,
                    email=email,
                    is_staff=True,
                    is_superuser=True,
                    is_active=True
                )
                if password:
                    user.set_password(password)
                else:
                    user.set_unusable_password()
                user.save()
                logger.info(f"Administrator account created idempotently for {email}.")
            else:
                dirty = False
                if not user.is_staff:
                    user.is_staff = True
                    dirty = True
                if not user.is_superuser:
                    user.is_superuser = True
                    dirty = True
                if not user.is_active:
                    user.is_active = True
                    dirty = True
                if user.email.lower() != email.lower():
                    user.email = email
                    dirty = True

                if password and (sync_password or not user.has_usable_password()):
                    user.set_password(password)
                    dirty = True

                if dirty:
                    user.save()
                    logger.info(f"Administrator account permissions verified and synced for {email}.")

            # Ensure UserProfile exists with super_admin role and ENTERPRISE plan
            from core.models import UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'role': 'super_admin',
                    'subscription_plan': 'ENTERPRISE',
                    'email_verified': True
                }
            )
            profile_dirty = False
            if profile.role != 'super_admin':
                profile.role = 'super_admin'
                profile_dirty = True
            if profile.subscription_plan != 'ENTERPRISE':
                profile.subscription_plan = 'ENTERPRISE'
                profile_dirty = True
            if not profile.email_verified:
                profile.email_verified = True
                profile_dirty = True

            if profile_dirty:
                profile.save()

            return user
    except Exception as e:
        logger.error(f"Failed to ensure admin user: {e}")
        return None

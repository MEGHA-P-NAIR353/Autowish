from . import serializers
import os
import csv
import io
import logging
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status, viewsets, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
import secrets
from datetime import timedelta
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    Contact, Event, GreetingTemplate, ScheduledWish, EmailLog,
    GeneratedGreeting, UserProfile, AIPrompt, Notification,
    SubscriptionTransaction, AuditLog, ActivityLog,
    GreetingCardTemplate, GreetingCard, GreetingCardFavorite,
    SentGreetingCard, SentAIGreeting, PasswordResetOTP
)
import traceback
from .serializers import (
    ContactSerializer, EventSerializer, GreetingTemplateSerializer,
    ScheduledWishSerializer, EmailLogSerializer, GeneratedGreetingSerializer,
    UserSerializer, UserProfileSerializer, ProfileUpdateSerializer, AIPromptSerializer, AIGenerateRequestSerializer,
    NotificationSerializer, SubscriptionTransactionSerializer, AuditLogSerializer,
    GreetingCardTemplateSerializer, GreetingCardSerializer,
    GreetingCardListSerializer, GreetingCardFavoriteSerializer,
    ActivityLogSerializer,
    ForgotPasswordRequestSerializer, VerifyResetOTPSerializer, ResetPasswordSubmitSerializer
)
from .tasks import send_email_task
from services.email_service import send_password_reset_otp_email
from services.activity_service import create_activity
from services.subscription_service import (
    check_ai_generation_limit,
    check_scheduled_wish_limit,
    check_delivery_channel,
    get_usage_summary,
)
from services.payment_service import (
    create_dummy_payment,
    process_dummy_payment,
    cancel_dummy_payment,
    get_payment_for_user,
    list_payments_for_user,
)
from core.plan_config import PLAN_IDS, build_plan_api_payload, get_checkout_amount
from services.ai import (
    generate_ai_wish,
    build_greeting_prompt,
    build_system_prompt,
    LANGUAGE_MAP,
    AIValidationError,
)
from services.fallback_wishes import generate_fallback_wish
from services.ai.openrouter_service import (
    generate_text as openrouter_generate,
    masked_key as openrouter_masked_key,
)

logger = logging.getLogger(__name__)

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# Helper: Log User Activity
def log_activity(user, action, details, request=None, actor_name=None, event_type=None, previous_name=None, updated_name=None):
    try:
        ip = get_client_ip(request) if request else None
        if not actor_name and user:
            first = getattr(user, 'first_name', '') or ''
            last = getattr(user, 'last_name', '') or ''
            name = f"{first} {last}".strip()
            actor_name = name or getattr(user, 'username', 'System')
        AuditLog.objects.create(
            user=user,
            action=action,
            event_type=event_type or action.lower().replace(' ', '_'),
            actor_name=actor_name,
            previous_name=previous_name,
            updated_name=updated_name,
            details=details,
            ip_address=ip
        )
    except Exception as log_err:
        # Logging must NEVER mask a successful primary action (e.g. email send).
        logger.warning(f"log_activity failed (ignored): {log_err}")

# Custom Permissions
class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return hasattr(request.user, 'profile') and request.user.profile.role == 'super_admin'

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        return hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'super_admin']


# --- AUTH VIEWS ---

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)
        
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=400)
    
    username = name or email.split('@')[0]
    # Ensure username uniqueness
    original_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{original_username}{counter}"
        counter += 1
        
    with transaction.atomic():
        user = User.objects.create_user(username=username, email=email, password=password)
        if name:
            parts = name.strip().split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
            user.save()
        # Create token for email verification
        refresh = RefreshToken.for_user(user)
        verification_token = str(refresh.access_token)
        
        # Log Audit
        reg_display_name = f"{user.first_name} {user.last_name}".strip() or user.username
        log_activity(user, 'Register', 'Registered new user account.', request, actor_name=reg_display_name, event_type='register')
        
        # Send Welcome & Verification Email
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        email_body = f"Welcome to AutoWish AI!\n\nPlease verify your email by clicking: {verify_url}\n\nHappy Wishing!"
        try:
            send_email_task.delay(user.email, "Verify Your Email - AutoWish AI", email_body)
        except Exception as e:
            logger.error(f"Failed to queue registration email task: {e}")
            
    return Response({
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh)
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)
        
    try:
        user_obj = User.objects.get(email=email)
        user = authenticate(username=user_obj.username, password=password)
    except User.DoesNotExist:
        user = None
        
    if not user:
        return Response({'error': 'Invalid email or password'}, status=401)
        
    refresh = RefreshToken.for_user(user)
    login_display_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username
    log_activity(user, 'Login', 'User logged in successfully.', request, actor_name=login_display_name, event_type='login')
    
    return Response({
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh)
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'Token is required'}, status=400)
        
    try:
        # Validate token
        untyped_token = UntypedToken(token)
        user_id = untyped_token.payload.get('user_id')
        user = User.objects.get(id=user_id)
        
        profile = user.profile
        profile.email_verified = True
        profile.save()
        
        log_activity(user, 'Verify Email', 'Email verified successfully.')
        return Response({'message': 'Email verified successfully.'})
    except Exception as e:
        return Response({'error': 'Invalid or expired token'}, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    POST /api/auth/forgot-password/
    Generates a secure 6-digit OTP, stores its hash, applies a 60s cooldown,
    and dispatches an email via Django email backend.
    Returns generic message preventing email enumeration.
    """
    serializer = ForgotPasswordRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].strip().lower()
    cooldown_seconds = getattr(settings, 'PASSWORD_RESET_COOLDOWN_SECONDS', 60)
    now = timezone.now()

    # Check resend cooldown on recent active OTP for this email
    recent_otp = PasswordResetOTP.objects.filter(
        email__iexact=email,
        is_invalidated=False,
        is_used=False,
        created_at__gte=now - timedelta(seconds=cooldown_seconds)
    ).order_by('-created_at').first()

    if recent_otp:
        elapsed = (now - recent_otp.created_at).total_seconds()
        remaining_wait = max(1, int(cooldown_seconds - elapsed))
        return Response({
            'error': f'Please wait {remaining_wait} seconds before requesting a new verification code.',
            'cooldown_seconds': remaining_wait
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Invalidate older non-used OTPs for this email to prevent replay/stale codes
    PasswordResetOTP.objects.filter(email__iexact=email, is_used=False).update(is_invalidated=True)

    generic_success_msg = "If an account with that email exists, a 6-digit verification code has been sent."

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Prevent timing attacks and account enumeration by returning generic response
        return Response({
            'message': generic_success_msg,
            'cooldown_seconds': cooldown_seconds
        }, status=status.HTTP_200_OK)

    if not user.is_active:
        return Response({
            'message': generic_success_msg,
            'cooldown_seconds': cooldown_seconds
        }, status=status.HTTP_200_OK)

    # Cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(1000000):06d}"
    otp_hash = make_password(otp_code)
    otp_expiry_minutes = getattr(settings, 'PASSWORD_RESET_OTP_EXPIRY_MINUTES', 5)
    expires_at = now + timedelta(minutes=otp_expiry_minutes)

    ip = get_client_ip(request)
    PasswordResetOTP.objects.create(
        user=user,
        email=user.email,
        otp_hash=otp_hash,
        expires_at=expires_at,
        max_attempts=getattr(settings, 'PASSWORD_RESET_MAX_ATTEMPTS', 5),
        ip_address=ip
    )

    # Dispatch email (plain text + branded HTML)
    send_password_reset_otp_email(user.email, otp_code, user=user)

    log_activity(user, 'Forgot Password', 'Password reset OTP requested.', request)

    return Response({
        'message': generic_success_msg,
        'cooldown_seconds': cooldown_seconds
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_reset_otp(request):
    """
    POST /api/auth/verify-reset-otp/
    Verifies a 6-digit OTP for the given email.
    Uses select_for_update inside an atomic transaction to prevent race conditions.
    Enforces a max 5-attempt limit, rejection of expired/used/invalidated OTPs.
    Returns a short-lived reset authorization token upon success.
    """
    serializer = VerifyResetOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].strip().lower()
    otp_input = serializer.validated_data['otp'].strip()

    with transaction.atomic():
        otp_record = (
            PasswordResetOTP.objects
            .select_for_update()
            .filter(email__iexact=email, is_invalidated=False, is_used=False)
            .order_by('-created_at')
            .first()
        )

        if not otp_record:
            return Response({
                'error': 'Invalid or expired verification code. Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.is_verified:
            return Response({
                'error': 'This verification code has already been verified.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.is_expired():
            otp_record.is_invalidated = True
            otp_record.save(update_fields=['is_invalidated'])
            return Response({
                'error': 'Verification code has expired. Please request a new code.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.attempts >= otp_record.max_attempts:
            otp_record.is_invalidated = True
            otp_record.save(update_fields=['is_invalidated'])
            return Response({
                'error': 'Too many failed attempts. This code is now invalid. Please request a new one.',
                'attempts_remaining': 0
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check OTP hash securely
        if not otp_record.verify_otp(otp_input):
            otp_record.attempts += 1
            remaining = otp_record.max_attempts - otp_record.attempts
            if remaining <= 0:
                otp_record.is_invalidated = True
                otp_record.save(update_fields=['attempts', 'is_invalidated'])
                return Response({
                    'error': 'Too many failed attempts. This code has been invalidated. Please request a new one.',
                    'attempts_remaining': 0
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                otp_record.save(update_fields=['attempts'])
                return Response({
                    'error': f'Invalid verification code. {remaining} attempt(s) remaining.',
                    'attempts_remaining': remaining
                }, status=status.HTTP_400_BAD_REQUEST)

        # OTP is correct! Issue a cryptographically secure, single-use reset authorization token
        raw_reset_token = secrets.token_urlsafe(32)
        token_expiry_minutes = getattr(settings, 'PASSWORD_RESET_TOKEN_EXPIRY_MINUTES', 15)

        otp_record.is_verified = True
        otp_record.verified_at = timezone.now()
        otp_record.reset_token = raw_reset_token
        otp_record.reset_token_expires_at = timezone.now() + timedelta(minutes=token_expiry_minutes)
        otp_record.save(update_fields=['is_verified', 'verified_at', 'reset_token', 'reset_token_expires_at'])

        log_activity(otp_record.user, 'Verify Reset OTP', 'Password reset OTP verified successfully.', request)

        return Response({
            'message': 'Verification code verified successfully.',
            'reset_token': raw_reset_token
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    POST /api/auth/reset-password/
    Consumes a verified reset authorization token, validates the new password against
    Django password validators, updates the password hash, and invalidates the session & OTP.
    """
    data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    if 'new_password' in data and 'password' not in data:
        data['password'] = data['new_password']

    serializer = ResetPasswordSubmitSerializer(data=data)
    if not serializer.is_valid():
        err_msg = 'Invalid input.'
        if 'confirm_password' in serializer.errors:
            err_msg = serializer.errors['confirm_password'][0]
        elif 'password' in serializer.errors:
            err_msg = serializer.errors['password'][0]
        elif 'reset_token' in serializer.errors:
            err_msg = serializer.errors['reset_token'][0]
        return Response({'error': err_msg, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    reset_token = serializer.validated_data['reset_token'].strip()
    new_password = serializer.validated_data['password']

    with transaction.atomic():
        otp_record = (
            PasswordResetOTP.objects
            .select_for_update()
            .filter(reset_token=reset_token, is_verified=True, is_used=False)
            .first()
        )

        if not otp_record or otp_record.is_invalidated:
            return Response({
                'error': 'Invalid or expired reset session. Please request a new verification code.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.is_reset_token_expired():
            otp_record.is_invalidated = True
            otp_record.save(update_fields=['is_invalidated'])
            return Response({
                'error': 'Reset session has expired. Please request a new verification code.'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = otp_record.user

        # Validate password using Django's configured password validators
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as val_err:
            return Response({
                'error': val_err.messages[0] if isinstance(val_err.messages, list) else str(val_err),
                'errors': list(val_err.messages) if isinstance(val_err.messages, list) else [str(val_err)]
            }, status=status.HTTP_400_BAD_REQUEST)

        # Update password hash
        user.set_password(new_password)
        user.save()

        # Invalidate OTP and reset authorization (single-use)
        now = timezone.now()
        otp_record.is_used = True
        otp_record.used_at = now
        otp_record.is_invalidated = True
        otp_record.save(update_fields=['is_used', 'used_at', 'is_invalidated'])

        # Invalidate all other pending OTPs for this user
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_invalidated=True)

        # Session invalidation & security logging
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=user)
            for tok in tokens:
                BlacklistedToken.objects.get_or_create(token=tok)
        except Exception:
            pass

        log_activity(user, 'Reset Password', 'Password was successfully reset using verified OTP.', request)

        return Response({
            'message': 'Password has been reset successfully. You can now log in with your new password.'
        }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    if not old_password or not new_password:
        return Response({'error': 'Old password and new password are required.'}, status=400)
        
    user = request.user
    if not user.check_password(old_password):
        return Response({'error': 'Incorrect old password'}, status=400)
        
    user.set_password(new_password)
    user.save()
    log_activity(user, 'Change Password', 'Password changed successfully.', request)
    return Response({'message': 'Password changed successfully.'})

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    user = request.user
    
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
        
    elif request.method in ('PUT', 'PATCH'):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        validated_data = serializer.validated_data
        
        # Resolve user strictly from server-side authenticated session
        db_user = User.objects.select_related('profile').get(id=user.id)
        
        # Check username uniqueness if submitted and changing
        if 'username' in validated_data:
            new_username = validated_data['username']
            if new_username != db_user.username and User.objects.filter(username=new_username).exclude(id=db_user.id).exists():
                return Response({'error': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Fetch persisted old values before modifying
        old_first = db_user.first_name or ''
        old_last = db_user.last_name or ''
        old_display_name = f"{old_first} {old_last}".strip() or db_user.username
        
        new_first = validated_data['first_name'] if 'first_name' in validated_data else old_first
        new_last = validated_data['last_name'] if 'last_name' in validated_data else old_last
        new_username = validated_data.get('username', db_user.username)
        new_display_name = f"{new_first} {new_last}".strip() or new_username
        
        name_changed = (new_first != old_first) or (new_last != old_last)
        profile_fields = ['phone', 'country', 'timezone', 'preferred_language']
        profile_changed = any(field in validated_data for field in profile_fields)
        
        with transaction.atomic():
            if 'first_name' in validated_data:
                db_user.first_name = new_first
            if 'last_name' in validated_data:
                db_user.last_name = new_last
            if 'username' in validated_data:
                db_user.username = new_username
            db_user.save()
            
            profile = db_user.profile
            for field in profile_fields:
                if field in validated_data:
                    setattr(profile, field, validated_data[field])
            profile.save()
            
            # Record audit and notification only if persisted values actually changed
            if name_changed:
                change_desc = f"{new_display_name} changed their profile name from {old_display_name} to {new_display_name}."
                AuditLog.objects.create(
                    user=db_user,
                    action='profile_name_changed',
                    event_type='profile_name_changed',
                    actor_name=new_display_name,
                    previous_name=old_display_name,
                    updated_name=new_display_name,
                    details=change_desc,
                    ip_address=get_client_ip(request)
                )
                
                # Persistent in-app notification for all authorized administrators
                admin_users = User.objects.filter(
                    Q(is_superuser=True) | Q(is_staff=True) | Q(profile__role__in=['admin', 'super_admin'])
                ).distinct()
                
                for admin in admin_users:
                    Notification.objects.create(
                        user=admin,
                        title="User Profile Name Changed",
                        message=change_desc,
                        type='system',
                        event_type='profile_name_changed',
                        category='User Management',
                        related_user=db_user,
                        is_read=False
                    )
            elif profile_changed:
                log_activity(db_user, 'Update Profile', 'Updated profile information.', request, actor_name=old_display_name)
                
        return Response(UserSerializer(db_user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    user = request.user
    if 'avatar' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)
        
    avatar_file = request.FILES['avatar']
    
    # Simple validation
    if avatar_file.size > 2 * 1024 * 1024:
        return Response({'error': 'File size exceeds 2MB limit'}, status=400)
        
    profile = user.profile
    profile.avatar = avatar_file
    profile.save()
    
    log_activity(user, 'Upload Avatar', 'Uploaded a new profile picture.', request)
    
    # Return URL of avatar
    avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else ""
    return Response({'avatar_url': avatar_url})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    password = request.data.get('password')
    if not password:
        return Response({'error': 'Password is required to delete account'}, status=400)
        
    user = request.user
    if not user.check_password(password):
        return Response({'error': 'Incorrect password'}, status=400)
        
    log_activity(user, 'Delete Account', 'Account deleted.', request)
    user.delete()
    return Response({'message': 'Account deleted successfully.'})


# --- CONTACT VIEWSET (CRUD & CSV) ---

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Contact.objects.filter(user=self.request.user)
        search_query = self.request.query_params.get('search', None)
        group_query = self.request.query_params.get('group', None)
        favorite_query = self.request.query_params.get('favorite', None)
        
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) | 
                Q(email__icontains=search_query) | 
                Q(phone__icontains=search_query) |
                Q(tags__icontains=search_query)
            )
        if group_query:
            queryset = queryset.filter(group__iexact=group_query)
            
        if favorite_query is not None:
            is_fav = favorite_query.lower() == 'true'
            queryset = queryset.filter(is_favorite=is_fav)
            
        return queryset

    def perform_create(self, serializer):
        contact = serializer.save(user=self.request.user)
        create_activity(
            user=self.request.user,
            action_type='CONTACT_CREATED',
            title=f"New contact added: {contact.name}",
            entity_type='contact',
            entity_id=contact.id,
            metadata={'contact_name': contact.name}
        )

    def perform_update(self, serializer):
        contact = serializer.save()
        create_activity(
            user=self.request.user,
            action_type='CONTACT_UPDATED',
            title=f"Contact updated: {contact.name}",
            entity_type='contact',
            entity_id=contact.id,
            metadata={'contact_name': contact.name}
        )

    def perform_destroy(self, instance):
        contact_name = instance.name
        contact_id = instance.id
        instance.delete()
        create_activity(
            user=self.request.user,
            action_type='CONTACT_DELETED',
            title=f"Contact deleted: {contact_name}",
            entity_type='contact',
            entity_id=contact_id,
            metadata={'contact_name': contact_name}
        )

    @action(detail=False, methods=['POST'], parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        if 'file' not in request.FILES:
            return Response({'error': 'No CSV file provided.'}, status=400)
            
        csv_file = request.FILES['file']
        decoded_file = csv_file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.reader(io_string)
        
        header = next(reader, None)
        # standard expected: name, email, phone, birthday, anniversary, relationship, group, tags
        imported_count = 0
        duplicate_count = 0
        
        for row in reader:
            if not row or len(row) < 2:
                continue
                
            name = row[0].strip()
            email = row[1].strip()
            phone = row[2].strip() if len(row) > 2 else ''
            birthday = row[3].strip() if len(row) > 3 else ''
            anniversary = row[4].strip() if len(row) > 4 else ''
            relationship = row[5].strip() if len(row) > 5 else 'Friend'
            group = row[6].strip() if len(row) > 6 else 'General'
            tags = row[7].strip() if len(row) > 7 else ''
            
            # Check for duplicate
            if Contact.objects.filter(user=request.user, email=email).exists():
                duplicate_count += 1
                continue
                
            Contact.objects.create(
                user=request.user,
                name=name,
                email=email,
                phone=phone,
                birthday=birthday,
                anniversary=anniversary,
                relationship=relationship,
                group=group,
                tags=tags
            )
            imported_count += 1
            
        log_activity(request.user, 'CSV Import', f"Imported {imported_count} contacts. Skipped {duplicate_count} duplicates.", request)
        return Response({
            'success': True,
            'imported': imported_count,
            'duplicates_skipped': duplicate_count
        })

    @action(detail=False, methods=['POST'], parser_classes=[MultiPartParser, FormParser], url_path='import-csv')
    def import_csv_hyphen(self, request):
        return self.import_csv(request)

    @action(detail=False, methods=['GET'], url_path='export_csv')
    def export_csv(self, request):
        contacts = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="autowish_contacts.csv"'
        response.write('\ufeff')  # UTF-8 BOM for Microsoft Excel compatibility
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Email', 'Phone', 'Birthday', 'Anniversary', 'Relationship', 'Group', 'Tags'])
        
        for contact in contacts:
            writer.writerow([
                contact.name, contact.email, contact.phone, 
                contact.birthday, contact.anniversary, contact.relationship, 
                contact.group, contact.tags or ''
            ])
            
        log_activity(request.user, 'CSV Export', 'Exported contacts to CSV file.', request)
        return response

    @action(detail=False, methods=['GET'], url_path='export-csv')
    def export_csv_hyphen(self, request):
        return self.export_csv(request)

    @action(detail=False, methods=['GET'])
    def detect_duplicates(self, request):
        contacts = Contact.objects.filter(user=request.user)
        emails = {}
        duplicates = []
        
        for contact in contacts:
            if not contact.email:
                continue
            if contact.email in emails:
                emails[contact.email].append(ContactSerializer(contact).data)
            else:
                emails[contact.email] = [ContactSerializer(contact).data]
                
        for email, items in emails.items():
            if len(items) > 1:
                duplicates.append({
                    'email': email,
                    'contacts': items
                })
                
        return Response({'duplicates': duplicates})

    @action(detail=False, methods=['GET'])
    def favorites(self, request):
        qs = self.get_queryset().filter(is_favorite=True)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=['POST'])
    def toggle_favorite(self, request, pk=None):
        contact = self.get_object()
        contact.is_favorite = not contact.is_favorite
        contact.save()
        return Response({'is_favorite': contact.is_favorite})


# --- EVENT VIEWSET ---

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Event.objects.filter(user=self.request.user)
        search_query = self.request.query_params.get('search', None)
        type_query = self.request.query_params.get('type', None)
        
        if search_query:
            queryset = queryset.filter(title__icontains=search_query)
        if type_query:
            queryset = queryset.filter(type=type_query)
            
        return queryset

    def perform_create(self, serializer):
        event = serializer.save(user=self.request.user)
        create_activity(
            user=self.request.user,
            action_type='EVENT_CREATED',
            title=f"New event created: {event.title}",
            entity_type='event',
            entity_id=event.id,
            metadata={'event_title': event.title, 'recipient': event.recipient}
        )

    def perform_update(self, serializer):
        event = serializer.save()
        create_activity(
            user=self.request.user,
            action_type='EVENT_UPDATED',
            title=f"Event updated: {event.title}",
            entity_type='event',
            entity_id=event.id,
            metadata={'event_title': event.title, 'recipient': event.recipient}
        )

    def perform_destroy(self, instance):
        event_title = instance.title
        event_id = instance.id
        instance.delete()
        create_activity(
            user=self.request.user,
            action_type='EVENT_DELETED',
            title=f"Event deleted: {event_title}",
            entity_type='event',
            entity_id=event_id,
            metadata={'event_title': event_title}
        )

    @action(detail=False, methods=['GET'])
    def upcoming(self, request):
        """Return events in the next 30 days."""
        from datetime import timedelta
        today = timezone.now().date()
        end = today + timedelta(days=30)
        qs = self.get_queryset().filter(date__gte=today, date__lte=end).order_by('date')
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['GET'])
    def calendar(self, request):
        """
        Production-grade calendar aggregator endpoint.
        Returns all relevant occasions (events, contact birthdays/anniversaries,
        and shared public holidays/festivals) within the specified date range.
        Links active ScheduledWish records where available.
        """
        import calendar as py_calendar
        import re
        from dateutil import parser as dateutil_parser
        from datetime import date, datetime

        user = request.user

        # Determine user's local current date/year
        tz_name = getattr(user.profile, 'timezone', 'Asia/Kolkata') if hasattr(user, 'profile') else 'Asia/Kolkata'
        try:
            import zoneinfo
            user_tz = zoneinfo.ZoneInfo(tz_name)
            current_local = datetime.now(user_tz).date()
        except Exception:
            current_local = timezone.now().date()

        # Parse query params
        start_param = request.query_params.get('start')
        end_param = request.query_params.get('end')
        year_param = request.query_params.get('year')
        month_param = request.query_params.get('month')
        type_param = request.query_params.get('type')
        search_param = request.query_params.get('search')

        try:
            if start_param and end_param:
                start_date = datetime.strptime(start_param[:10], '%Y-%m-%d').date()
                end_date = datetime.strptime(end_param[:10], '%Y-%m-%d').date()
            elif year_param and month_param:
                y = int(year_param)
                m = int(month_param)
                last_day = py_calendar.monthrange(y, m)[1]
                start_date = date(y, m, 1)
                end_date = date(y, m, last_day)
            elif year_param:
                y = int(year_param)
                start_date = date(y, 1, 1)
                end_date = date(y, 12, 31)
            else:
                y = current_local.year
                m = current_local.month
                last_day = py_calendar.monthrange(y, m)[1]
                start_date = date(y, m, 1)
                end_date = date(y, m, last_day)
        except Exception:
            start_date = date(current_local.year, current_local.month, 1)
            last_day = py_calendar.monthrange(current_local.year, current_local.month)[1]
            end_date = date(current_local.year, current_local.month, last_day)

        if start_date > end_date:
            start_date, end_date = end_date, start_date

        year_range = range(start_date.year, end_date.year + 1)
        results = []
        seen_keys = set()

        # 1. User's explicit Event records
        user_events = Event.objects.filter(user=user)
        for ev in user_events:
            ev_date = ev.date
            ev_type = ev.type or 'Custom'
            ev_title = ev.title or f"{ev.recipient}'s {ev_type}"

            projected_dates = []
            if not ev.recurring or ev.recurring_type == 'once':
                if start_date <= ev_date <= end_date:
                    projected_dates.append(ev_date)
            elif ev.recurring_type == 'yearly' or (ev.recurring and ev.recurring_type != 'monthly'):
                for y in year_range:
                    if ev_date.month == 2 and ev_date.day == 29:
                        p_day = 29 if py_calendar.isleap(y) else 28
                    else:
                        p_day = min(ev_date.day, py_calendar.monthrange(y, ev_date.month)[1])
                    p_date = date(y, ev_date.month, p_day)
                    if start_date <= p_date <= end_date:
                        projected_dates.append(p_date)
            elif ev.recurring_type == 'monthly':
                curr_y = start_date.year
                curr_m = start_date.month
                while (curr_y < end_date.year) or (curr_y == end_date.year and curr_m <= end_date.month):
                    max_d = py_calendar.monthrange(curr_y, curr_m)[1]
                    p_day = min(ev_date.day, max_d)
                    p_date = date(curr_y, curr_m, p_day)
                    if start_date <= p_date <= end_date:
                        projected_dates.append(p_date)
                    if curr_m == 12:
                        curr_y += 1
                        curr_m = 1
                    else:
                        curr_m += 1

            for p_date in projected_dates:
                p_iso = p_date.isoformat()
                key = (ev.recipient.lower().strip(), ev_type.lower().strip(), p_iso)
                seen_keys.add(key)
                results.append({
                    'id': f"event-{ev.id}-{p_iso}",
                    'event_id': ev.id,
                    'title': ev_title,
                    'recipient': ev.recipient,
                    'type': ev_type,
                    'date': p_iso,
                    'original_date': ev_date.isoformat(),
                    'recurring': ev.recurring,
                    'recurring_type': ev.recurring_type,
                    'reminder_days': ev.reminder_days,
                    'status': ev.status or 'Upcoming',
                    'source': 'event',
                    'can_edit': True,
                })

        # 2. Contact Birthdays & Anniversaries
        user_contacts = Contact.objects.filter(user=user)
        def _parse_contact_date(raw_str):
            if not raw_str or not raw_str.strip():
                return None
            clean_str = re.sub(r'\s*,\s*', ', ', raw_str.strip())
            try:
                dt = dateutil_parser.parse(clean_str, fuzzy=True)
                year_match = re.search(r'\b(19\d\d|20\d\d)\b', clean_str)
                orig_year = int(year_match.group(1)) if year_match else None
                return (dt.month, dt.day, orig_year)
            except Exception:
                return None

        for c in user_contacts:
            c_name = c.name or 'Unknown'
            # Check birthday
            bday_info = _parse_contact_date(c.birthday)
            if bday_info:
                b_month, b_day, b_orig_year = bday_info
                for y in year_range:
                    if b_month == 2 and b_day == 29:
                        p_day = 29 if py_calendar.isleap(y) else 28
                    else:
                        p_day = min(b_day, py_calendar.monthrange(y, b_month)[1])
                    p_date = date(y, b_month, p_day)
                    if start_date <= p_date <= end_date:
                        p_iso = p_date.isoformat()
                        key = (c_name.lower().strip(), 'birthday', p_iso)
                        if key not in seen_keys:
                            seen_keys.add(key)
                            age = (y - b_orig_year) if (b_orig_year and y >= b_orig_year) else None
                            results.append({
                                'id': f"contact-bday-{c.id}-{p_iso}",
                                'title': f"{c_name}'s Birthday",
                                'recipient': c_name,
                                'recipient_email': c.email or '',
                                'recipient_phone': c.phone or '',
                                'relationship': c.relationship or 'Friend',
                                'type': 'Birthday',
                                'date': p_iso,
                                'source': 'contact',
                                'contact_id': c.id,
                                'recurring': True,
                                'recurring_type': 'yearly',
                                'age': age,
                                'notes': c.notes or '',
                                'group': c.group or '',
                                'status': 'Upcoming',
                                'can_edit': False,
                            })

            # Check anniversary
            anniv_info = _parse_contact_date(c.anniversary)
            if anniv_info:
                a_month, a_day, a_orig_year = anniv_info
                for y in year_range:
                    if a_month == 2 and a_day == 29:
                        p_day = 29 if py_calendar.isleap(y) else 28
                    else:
                        p_day = min(a_day, py_calendar.monthrange(y, a_month)[1])
                    p_date = date(y, a_month, p_day)
                    if start_date <= p_date <= end_date:
                        p_iso = p_date.isoformat()
                        key = (c_name.lower().strip(), 'anniversary', p_iso)
                        if key not in seen_keys:
                            seen_keys.add(key)
                            years_count = (y - a_orig_year) if (a_orig_year and y >= a_orig_year) else None
                            results.append({
                                'id': f"contact-anniv-{c.id}-{p_iso}",
                                'title': f"{c_name}'s Anniversary",
                                'recipient': c_name,
                                'recipient_email': c.email or '',
                                'recipient_phone': c.phone or '',
                                'relationship': c.relationship or 'Friend',
                                'type': 'Anniversary',
                                'date': p_iso,
                                'source': 'contact',
                                'contact_id': c.id,
                                'recurring': True,
                                'recurring_type': 'yearly',
                                'anniversary_years': years_count,
                                'notes': c.notes or '',
                                'group': c.group or '',
                                'status': 'Upcoming',
                                'can_edit': False,
                            })

        # 3. Standard Public Holidays and Festivals
        STANDARD_HOLIDAYS = [
            (1, 1, "New Year's Day", 'Holiday'),
            (2, 14, "Valentine's Day", 'Holiday'),
            (3, 8, "International Women's Day", 'Holiday'),
            (3, 17, "St. Patrick's Day", 'Festival'),
            (4, 22, "Earth Day", 'Holiday'),
            (7, 4, "Independence Day", 'Holiday'),
            (8, 15, "India Independence Day", 'Holiday'),
            (10, 31, "Halloween", 'Festival'),
            (12, 24, "Christmas Eve", 'Holiday'),
            (12, 25, "Christmas Day", 'Festival'),
            (12, 31, "New Year's Eve", 'Holiday'),
        ]

        # Calculate floating holidays
        for y in year_range:
            # Mother's Day: 2nd Sunday in May
            may_sundays = [d for d in range(1, 32) if py_calendar.monthrange(y, 5)[1] >= d and date(y, 5, d).weekday() == 6]
            if len(may_sundays) >= 2:
                m_day = date(y, 5, may_sundays[1])
                if start_date <= m_day <= end_date:
                    h_iso = m_day.isoformat()
                    results.append({
                        'id': f"holiday-mothers-day-{h_iso}",
                        'title': "Mother's Day",
                        'recipient': 'Everyone',
                        'type': 'Holiday',
                        'date': h_iso,
                        'source': 'public_holiday',
                        'recurring': True,
                        'recurring_type': 'yearly',
                        'status': 'Public',
                        'can_edit': False,
                    })
            # Father's Day: 3rd Sunday in June
            june_sundays = [d for d in range(1, 31) if py_calendar.monthrange(y, 6)[1] >= d and date(y, 6, d).weekday() == 6]
            if len(june_sundays) >= 3:
                f_day = date(y, 6, june_sundays[2])
                if start_date <= f_day <= end_date:
                    h_iso = f_day.isoformat()
                    results.append({
                        'id': f"holiday-fathers-day-{h_iso}",
                        'title': "Father's Day",
                        'recipient': 'Everyone',
                        'type': 'Holiday',
                        'date': h_iso,
                        'source': 'public_holiday',
                        'recurring': True,
                        'recurring_type': 'yearly',
                        'status': 'Public',
                        'can_edit': False,
                    })
            # Thanksgiving: 4th Thursday in Nov
            nov_thursdays = [d for d in range(1, 31) if py_calendar.monthrange(y, 11)[1] >= d and date(y, 11, d).weekday() == 3]
            if len(nov_thursdays) >= 4:
                th_day = date(y, 11, nov_thursdays[3])
                if start_date <= th_day <= end_date:
                    h_iso = th_day.isoformat()
                    results.append({
                        'id': f"holiday-thanksgiving-{h_iso}",
                        'title': "Thanksgiving",
                        'recipient': 'Everyone',
                        'type': 'Holiday',
                        'date': h_iso,
                        'source': 'public_holiday',
                        'recurring': True,
                        'recurring_type': 'yearly',
                        'status': 'Public',
                        'can_edit': False,
                    })

            for h_m, h_d, h_title, h_type in STANDARD_HOLIDAYS:
                h_date = date(y, h_m, h_d)
                if start_date <= h_date <= end_date:
                    h_iso = h_date.isoformat()
                    key = ('everyone', h_type.lower(), h_iso)
                    if key not in seen_keys:
                        results.append({
                            'id': f"holiday-{h_m}-{h_d}-{h_iso}",
                            'title': h_title,
                            'recipient': 'Everyone',
                            'type': h_type,
                            'date': h_iso,
                            'source': 'public_holiday',
                            'recurring': True,
                            'recurring_type': 'yearly',
                            'status': 'Public',
                            'can_edit': False,
                        })

        # 4. Attach ScheduledWish status
        scheduled_wishes = ScheduledWish.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        ).select_related('contact')

        wishes_by_contact_date = {}
        wishes_by_recipient_date = {}
        for w in scheduled_wishes:
            w_date_str = w.date.isoformat()
            if w.contact_id:
                wishes_by_contact_date[(w.contact_id, w_date_str)] = w
            if w.contact and w.contact.name:
                wishes_by_recipient_date[(w.contact.name.lower().strip(), w_date_str)] = w

        for item in results:
            item_date = item['date']
            wish = None
            if item.get('contact_id'):
                wish = wishes_by_contact_date.get((item['contact_id'], item_date))
            if not wish and item.get('recipient'):
                wish = wishes_by_recipient_date.get((item['recipient'].lower().strip(), item_date))

            if wish:
                item['scheduled_wish'] = {
                    'id': wish.id,
                    'status': wish.status,
                    'time': wish.time.strftime('%H:%M') if wish.time else None,
                    'occasion': wish.occasion,
                    'notification_type': wish.notification_type or 'Email',
                }
            else:
                item['scheduled_wish'] = None

        # 5. Filter by type
        if type_param and type_param.lower() != 'all':
            results = [r for r in results if r['type'].lower() == type_param.lower()]

        # 6. Filter by search
        if search_param and search_param.strip():
            sq = search_param.strip().lower()
            results = [
                r for r in results
                if sq in r['title'].lower()
                or sq in r['recipient'].lower()
                or sq in (r.get('notes') or '').lower()
                or sq in r['type'].lower()
            ]

        # 7. Sort by date then title
        results.sort(key=lambda x: (x['date'], x['title']))

        return Response({
            'count': len(results),
            'start': start_date.isoformat(),
            'end': end_date.isoformat(),
            'results': results,
        })


# --- TEMPLATE VIEWSET ---

class GreetingTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = GreetingTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Allow default templates (user__isnull=True) + user templates
        return GreetingTemplate.objects.filter(user=self.request.user) | GreetingTemplate.objects.filter(user__isnull=True)

    def perform_create(self, serializer):
        template = serializer.save(user=self.request.user)
        create_activity(
            user=self.request.user,
            action_type='TEMPLATE_CREATED',
            title=f"Template created: {template.name}",
            entity_type='greeting_template',
            entity_id=template.id,
            metadata={'template_name': template.name, 'occasion': template.occasion}
        )

    def perform_update(self, serializer):
        template = serializer.save()
        create_activity(
            user=self.request.user,
            action_type='TEMPLATE_UPDATED',
            title=f"Template updated: {template.name}",
            entity_type='greeting_template',
            entity_id=template.id,
            metadata={'template_name': template.name, 'occasion': template.occasion}
        )

    def perform_destroy(self, instance):
        template_name = instance.name
        template_id = instance.id
        instance.delete()
        create_activity(
            user=self.request.user,
            action_type='TEMPLATE_UPDATED',
            title=f"Template deleted: {template_name}",
            entity_type='greeting_template',
            entity_id=template_id,
            metadata={'template_name': template_name}
        )

    @action(detail=True, methods=['POST'])
    def toggle_favorite(self, request, pk=None):
        template = self.get_object()
        template.is_favorite = not template.is_favorite
        template.save()
        return Response({'is_favorite': template.is_favorite})


# --- SCHEDULED WISH VIEWSET (BACKWARD COMPATIBLE) ---

class ScheduledWishViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduledWishSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScheduledWish.objects.filter(user=self.request.user).select_related('contact')

    def perform_create(self, serializer):
        check_scheduled_wish_limit(self.request.user)
        notification_type = self.request.data.get('notification_type', 'Email')
        check_delivery_channel(self.request.user, notification_type)
        wish = serializer.save(user=self.request.user, status='Pending')
        create_activity(
            user=self.request.user,
            action_type='WISH_SCHEDULED',
            title=f"Wish scheduled for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
        )

    def perform_update(self, serializer):
        notification_type = self.request.data.get('notification_type')
        if notification_type:
            check_delivery_channel(self.request.user, notification_type)
        wish = serializer.save()
        create_activity(
            user=self.request.user,
            action_type='WISH_SCHEDULED',
            title=f"Wish updated for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
        )

    def perform_destroy(self, instance):
        contact_name = instance.contact.name
        wish_id = instance.id
        instance.delete()
        create_activity(
            user=self.request.user,
            action_type='WISH_CANCELLED',
            title=f"Wish cancelled for {contact_name}",
            entity_type='scheduled_wish',
            entity_id=wish_id,
            metadata={'contact_name': contact_name}
        )

    @action(detail=True, methods=['POST'])
    def cancel(self, request, pk=None):
        wish = self.get_object()
        if wish.status == 'Scheduled':
            wish.status = 'Cancelled'
            wish.save()
            log_activity(request.user, 'Cancel Wish', f"Cancelled scheduled wish ID {wish.id}.")
            create_activity(
                user=request.user,
                action_type='WISH_CANCELLED',
                title=f"Wish cancelled for {wish.contact.name}",
                entity_type='scheduled_wish',
                entity_id=wish.id,
                metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
            )
        return Response({'status': wish.status})


# --- ENTERPRISE SCHEDULES VIEWSET ---

import pytz
from autowish.celery import app as celery_app
from core.tasks import send_scheduled_wish_task

class SchedulesViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduledWishSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ScheduledWish.objects.filter(user=self.request.user).select_related('contact')
        
        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(contact__name__icontains=search) |
                Q(contact__email__icontains=search) |
                Q(contact__phone__icontains=search) |
                Q(occasion__icontains=search) |
                Q(message__icontains=search)
            )
            
        # Filtering
        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        occasion_param = self.request.query_params.get('occasion', None)
        if occasion_param:
            queryset = queryset.filter(occasion=occasion_param)
            
        template_param = self.request.query_params.get('template', None)
        if template_param:
            queryset = queryset.filter(template=template_param)
            
        is_ai = self.request.query_params.get('is_ai_generated', None)
        if is_ai is not None:
            queryset = queryset.filter(is_ai_generated=is_ai.lower() == 'true')
            
        tz_param = self.request.query_params.get('timezone', None)
        if tz_param:
            queryset = queryset.filter(timezone=tz_param)
            
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        # Sorting
        sort = self.request.query_params.get('sort', 'newest')
        if sort == 'newest':
            queryset = queryset.order_by('-created_at')
        elif sort == 'oldest':
            queryset = queryset.order_by('created_at')
        elif sort == 'upcoming':
            queryset = queryset.filter(status__in=['Pending', 'Scheduled']).order_by('date', 'time')
        elif sort == 'completed':
            queryset = queryset.filter(status='Sent').order_by('-sent_at')
        elif sort == 'failed':
            queryset = queryset.filter(status='Failed').order_by('-updated_at')
            
        return queryset

    def perform_create(self, serializer):
        data = self.request.data
        date_str = data.get('date')
        time_str = data.get('time', '09:00')
        tz_name = data.get('timezone', 'Asia/Kolkata')
        
        # Validation
        if not date_str:
            raise ValidationError({"date": "Scheduled date is required."})

        try:
            wish_date = datetime.strptime(date_str, '%Y-%m-%d').date() if isinstance(date_str, str) else date_str
        except (ValueError, TypeError):
            raise ValidationError({"date": "Invalid date format. Use YYYY-MM-DD."})

        if isinstance(time_str, str):
            try:
                wish_time = datetime.strptime(time_str, '%H:%M').time()
            except ValueError:
                try:
                    wish_time = datetime.strptime(time_str, '%H:%M:%S').time()
                except ValueError:
                    wish_time = datetime.strptime('09:00', '%H:%M').time()
        elif isinstance(time_str, datetime.time):
            wish_time = time_str
        else:
            wish_time = datetime.strptime('09:00', '%H:%M').time()
            
        # Validate future only
        naive_dt = datetime.combine(wish_date, wish_time)
        try:
            tz = pytz.timezone(tz_name)
            aware_dt = tz.localize(naive_dt)
        except Exception:
            tz = pytz.timezone('Asia/Kolkata')
            aware_dt = tz.localize(naive_dt)
            
        if aware_dt <= timezone.localtime(timezone.now(), tz):
            raise ValidationError({"date": "Scheduled date and time must be in the future."})

        check_scheduled_wish_limit(self.request.user)
        notification_type = data.get('notification_type', 'Email')
        check_delivery_channel(self.request.user, notification_type)
            
        # Save initial schedule status strictly as Pending. Never send immediately!
        wish = serializer.save(user=self.request.user, status='Pending')
        
        log_activity(self.request.user, 'Schedule Created', f"Scheduled wish ID {wish.id} for {wish.contact.name}.", self.request)
        create_activity(
            user=self.request.user,
            action_type='WISH_SCHEDULED',
            title=f"Wish scheduled for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.status == 'Sent':
            raise ValidationError("Cannot edit already sent wishes.")
            
        data = self.request.data
        date_str = data.get('date', str(instance.date))
        time_str = data.get('time', instance.time.strftime('%H:%M') if instance.time else '09:00')
        tz_name = data.get('timezone', instance.timezone)
        
        try:
            wish_date = datetime.strptime(date_str, '%Y-%m-%d').date() if isinstance(date_str, str) else date_str
        except (ValueError, TypeError):
            raise ValidationError({"date": "Invalid date format. Use YYYY-MM-DD."})

        if isinstance(time_str, str):
            try:
                wish_time = datetime.strptime(time_str, '%H:%M').time()
            except ValueError:
                try:
                    wish_time = datetime.strptime(time_str, '%H:%M:%S').time()
                except ValueError:
                    wish_time = datetime.strptime('09:00', '%H:%M').time()
        elif isinstance(time_str, datetime.time):
            wish_time = time_str
        else:
            wish_time = datetime.strptime('09:00', '%H:%M').time()
            
        # Validate future only
        naive_dt = datetime.combine(wish_date, wish_time)
        try:
            tz = pytz.timezone(tz_name)
            aware_dt = tz.localize(naive_dt)
        except Exception:
            tz = pytz.timezone('Asia/Kolkata')
            aware_dt = tz.localize(naive_dt)
            
        if aware_dt <= timezone.localtime(timezone.now(), tz):
            raise ValidationError({"date": "Scheduled date and time must be in the future."})

        notification_type = data.get('notification_type')
        if notification_type:
            check_delivery_channel(self.request.user, notification_type)
            
        wish = serializer.save()

        # If previously Failed or Cancelled, reset to Pending with error cleared
        if wish.status in ['Failed', 'Cancelled']:
            wish.status = 'Pending'
            wish.last_error = None
            wish.save(update_fields=['status', 'last_error', 'updated_at'])
            
        log_activity(self.request.user, 'Schedule Updated', f"Updated wish ID {wish.id}.", self.request)
        create_activity(
            user=self.request.user,
            action_type='WISH_SCHEDULED',
            title=f"Wish updated for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
        )

    def perform_destroy(self, instance):
        if instance.task_id:
            try:
                celery_app.control.revoke(instance.task_id, terminate=True)
            except Exception as e:
                logger.error(f"Failed to revoke task {instance.task_id}: {e}")
        contact_name = instance.contact.name if instance.contact else 'Unknown'
        wish_id = instance.id
        instance.delete()
        log_activity(self.request.user, 'Schedule Deleted', f"Deleted wish ID {wish_id}.", self.request)
        create_activity(
            user=self.request.user,
            action_type='WISH_CANCELLED',
            title=f"Wish cancelled for {contact_name}",
            entity_type='scheduled_wish',
            entity_id=wish_id,
            metadata={'contact_name': contact_name}
        )

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        wish = self.get_object()
        if wish.status == 'Sent':
            return Response({'error': 'Cannot cancel a wish that has already been sent.'}, status=400)
            
        if wish.task_id:
            try:
                celery_app.control.revoke(wish.task_id, terminate=True)
            except Exception as e:
                logger.error(f"Failed to revoke task {wish.task_id}: {e}")
                
        wish.status = 'Cancelled'
        wish.cancelled_at = timezone.now()
        wish.save()

        log_activity(request.user, 'Cancel Wish', f"Cancelled scheduled wish ID {wish.id}.", request)
        create_activity(
            user=request.user,
            action_type='WISH_CANCELLED',
            title=f"Wish cancelled for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
        )
        return Response(self.get_serializer(wish).data)

    @action(detail=True, methods=['patch'])
    def resume(self, request, pk=None):
        wish = self.get_object()
        if wish.status == 'Sent':
            return Response({'error': 'Cannot resume a wish that has already been sent.'}, status=400)
            
        # Re-validate that scheduled time is in the future
        naive_dt = datetime.combine(wish.date, wish.time)
        try:
            tz = pytz.timezone(wish.timezone)
            aware_dt = tz.localize(naive_dt)
        except Exception:
            tz = pytz.timezone('Asia/Kolkata')
            aware_dt = tz.localize(naive_dt)
            
        if aware_dt <= timezone.localtime(timezone.now(), tz):
            return Response({'error': 'Cannot resume wish. Scheduled date/time must be in the future. Please update date/time first.'}, status=400)
            
        wish.status = 'Pending'
        wish.cancelled_at = None
        wish.last_error = None
        wish.save(update_fields=['status', 'cancelled_at', 'last_error', 'updated_at'])
        
        log_activity(request.user, 'Resume Wish', f"Resumed scheduled wish ID {wish.id}.", request)
        create_activity(
            user=request.user,
            action_type='WISH_SCHEDULED',
            title=f"Wish resumed for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
        )
        return Response(self.get_serializer(wish).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        wish = self.get_object()
        
        # Clone it
        from datetime import timedelta
        cloned = ScheduledWish.objects.create(
            user=request.user,
            contact=wish.contact,
            date=wish.date + timedelta(days=1), # default to tomorrow
            time=wish.time,
            occasion=wish.occasion,
            template=wish.template,
            message=wish.message,
            timezone=wish.timezone,
            reminder_minutes=wish.reminder_minutes,
            status='Pending', # Start as pending/draft until saved
            email_subject=wish.email_subject,
            language=wish.language,
            tone=wish.tone,
            notification_type=wish.notification_type,
            is_ai_generated=wish.is_ai_generated
        )
        
        log_activity(request.user, 'Duplicate Wish', f"Duplicated wish ID {wish.id} to new wish ID {cloned.id}.", request)
        create_activity(
            user=request.user,
            action_type='WISH_SCHEDULED',
            title=f"Wish duplicated for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=cloned.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion, 'original_wish_id': wish.id}
        )
        return Response(self.get_serializer(cloned).data)

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        wish = self.get_object()
        logs = EmailLog.objects.filter(user=request.user, recipient=wish.contact.email).order_by('-created_at')
        serializer = EmailLogSerializer(logs, many=True)
        return Response({
            'retry_count': wish.retry_count,
            'last_error': wish.last_error,
            'task_id': wish.task_id,
            'delivery_status': wish.delivery_status,
            'sent_at': wish.sent_at,
            'email_logs': serializer.data
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        user = request.user
        today_date = timezone.localdate()
        
        today_count = ScheduledWish.objects.filter(user=user, date=today_date).count()
        upcoming_count = ScheduledWish.objects.filter(user=user, date__gt=today_date, status__in=['Pending', 'Scheduled']).count()
        pending_count = ScheduledWish.objects.filter(user=user, status='Pending').count()
        scheduled_count = ScheduledWish.objects.filter(user=user, status='Scheduled').count()
        sent_count = ScheduledWish.objects.filter(user=user, status='Sent').count()
        cancelled_count = ScheduledWish.objects.filter(user=user, status='Cancelled').count()
        failed_count = ScheduledWish.objects.filter(user=user, status='Failed').count()
        
        return Response({
            'today': today_count,
            'upcoming': upcoming_count,
            'pending': pending_count,
            'scheduled': scheduled_count,
            'sent': sent_count,
            'cancelled': cancelled_count,
            'failed': failed_count
        })


# --- EMAIL LOGS ---

class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmailLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmailLog.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['GET'], url_path='export_csv')
    def export_csv(self, request):
        logs = self.get_queryset()
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="email_logs.csv"'
        response.write('\ufeff')  # UTF-8 BOM
        writer = csv.writer(response)
        writer.writerow(['Recipient', 'Subject', 'Status', 'Date', 'Delivery Status'])
        for log in logs:
            writer.writerow([
                log.recipient, log.subject, log.status, log.date, log.delivery
            ])
        log_activity(request.user, 'CSV Export', 'Exported email logs to CSV file.', request)
        return response

    @action(detail=False, methods=['GET'], url_path='export-csv')
    def export_csv_hyphen(self, request):
        return self.export_csv(request)


# --- OPENROUTER AI GENERATION ---

# Language code to language name mapping for strict language enforcement
LANGUAGE_MAP = {
    'en': 'English',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'ml': 'Malayalam',
    'te': 'Telugu',
    'kn': 'Kannada',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ar': 'Arabic',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
}

def build_greeting_prompt(recipient_name, occasion, tone, language, relationship, age, interests, custom_context):
    """
    Build a concise, structured prompt containing only recipient input parameters.
    System instructions are kept entirely in the system_prompt to keep this minimal.
    """
    lang_name = LANGUAGE_MAP.get(language, 'English')

    prompt_parts = [
        f"Recipient Name: {recipient_name}",
        f"Occasion: {occasion}",
        f"Tone: {tone}",
        f"Language: {lang_name}",
        f"Relationship: {relationship}",
    ]

    if age:
        prompt_parts.append(f"Age: {age}")

    if interests:
        interests_str = ", ".join(interests) if isinstance(interests, list) else interests
        prompt_parts.append(f"Interests: {interests_str}")

    if custom_context:
        prompt_parts.append(f"Context: {custom_context}")

    return "\n".join(prompt_parts)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_ai_greeting(request):
    """
    POST /api/ai/generate/
    Generate a personalized greeting using Multi-Provider AI (Gemini -> Groq -> OpenRouter).
    If contact_id is supplied, auto-populate from Contact fields.
    Saves result to GeneratedGreeting and returns the object.
    """
    check_ai_generation_limit(request.user)

    try:
        logger.info(f"[AI_GREETING_PAYLOAD] {request.data}")

        serializer = AIGenerateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"[AI_GREETING_VALIDATION_ERROR] {serializer.errors}")
            return Response({'error': 'Validation failed', 'details': serializer.errors}, status=400)

        data = serializer.validated_data
        contact_id = data.get('contact_id')
        occasion = data.get('occasion', 'Birthday') or 'Birthday'
        tone = data.get('tone', 'Friendly') or 'Friendly'
        language = data.get('language', 'en') or 'en'
        age = data.get('age')
        relationship = data.get('relationship', 'Friend') or 'Friend'
        interests = data.get('interests', [])
        custom_context = data.get('custom_context', '') or ''
        mode = data.get('mode', 'standard') or 'standard'
        force_regenerate = data.get('force_regenerate', False)
        use_cache = data.get('use_cache', True) and not force_regenerate

        # Resolve contact details
        contact = None
        recipient_name = data.get('recipient_name', 'Friend') or 'Friend'

        if contact_id:
            try:
                contact = Contact.objects.get(pk=contact_id, user=request.user)
                recipient_name = contact.name
                if not relationship or relationship == 'Friend':
                    relationship = contact.relationship or 'Friend'
                if not age and contact.birthday:
                    try:
                        from datetime import datetime
                        bd = datetime.strptime(contact.birthday, '%Y-%m-%d')
                        today = datetime.now()
                        age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
                    except Exception:
                        pass
            except Contact.DoesNotExist:
                return Response({'error': 'Contact not found.'}, status=404)

        logger.info(
            f"[AI_GREETING_REQUEST] user={request.user.id}, recipient={recipient_name}, "
            f"occasion={occasion}, tone={tone}, language={language}, mode={mode}, force_regenerate={force_regenerate}"
        )

        # ── AI generation with graceful fallback ────────────────────────────
        is_fallback = False
        try:
            ai_result = generate_ai_wish(
                recipient_name=recipient_name,
                occasion=occasion,
                tone=tone,
                language=language,
                relationship=relationship,
                age=age,
                interests=interests,
                custom_context=custom_context,
                mode=mode,
                user_id=request.user.id,
                use_cache=use_cache,
            )
            greeting_text = ai_result.get("content", "")
            provider_used = ai_result.get("provider", "gemini")
            is_cached = ai_result.get("cached", False)

            # If AI returned an empty string, treat as failure and use fallback
            if not greeting_text or not greeting_text.strip():
                logger.warning(
                    "[AI_GREETING_EMPTY] AI provider=%s returned empty content. "
                    "Activating fallback for user=%s.",
                    provider_used, request.user.id
                )
                raise RuntimeError("AI provider returned empty content")

        except ValueError as e:
            # Validation errors from the request itself — return 400 (not fallback)
            logger.warning("[AI_GREETING_VALUE_ERROR] user=%s: %s", request.user.id, e)
            return Response({'error': str(e)}, status=400)

        except AIValidationError as e:
            # Quality validation failure — activate fallback instead of 503
            logger.warning(
                "[AI_GREETING_QUALITY_FAIL] All models failed quality validation. "
                "Activating fallback. user=%s reason=%s",
                request.user.id, e.reason
            )
            fallback_result = generate_fallback_wish(
                recipient_name=recipient_name,
                occasion=occasion,
                tone=tone,
                language=language,
                relationship=relationship,
                failure_reason=f"ai_quality_validation: {e.reason}",
                user_id=request.user.id,
            )
            greeting_text = fallback_result["content"]
            provider_used = fallback_result["provider"]
            is_cached = False
            is_fallback = True

        except Exception as e:
            # Any other AI failure (timeout, rate-limit, all providers down, etc.)
            failure_reason = type(e).__name__
            logger.exception(
                "[AI_GREETING_ERROR] AI generation failed for user=%s recipient=%s "
                "occasion=%s error_type=%s — activating fallback.",
                request.user.id, recipient_name, occasion, failure_reason
            )
            fallback_result = generate_fallback_wish(
                recipient_name=recipient_name,
                occasion=occasion,
                tone=tone,
                language=language,
                relationship=relationship,
                failure_reason=failure_reason,
                user_id=request.user.id,
            )
            greeting_text = fallback_result["content"]
            provider_used = fallback_result["provider"]
            is_cached = False
            is_fallback = True

        # Save to GeneratedGreeting
        greeting = GeneratedGreeting.objects.create(
            user=request.user,
            recipient=recipient_name,
            occasion=occasion,
            tone=tone,
            content=greeting_text,
        )

        create_activity(
            user=request.user,
            action_type='AI_GREETING_GENERATED',
            title=f"AI greeting generated for {recipient_name}",
            entity_type='generated_greeting',
            metadata={
                'recipient_name': recipient_name,
                'occasion': occasion,
                'provider': provider_used,
                'cached': is_cached,
                'is_fallback': is_fallback,  # internal observability; not sent to client
            }
        )

        return Response({
            'id': greeting.id,
            'greeting': greeting_text,
            'recipient': recipient_name,
            'occasion': occasion,
            'tone': tone,
            'language': language,
            'relationship': relationship,
            'age': age,
            'interests': interests,
            'custom_context': custom_context,
            'provider': provider_used,
            'cached': is_cached,
            'contact': {
                'id': contact.id,
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone,
                'relationship': contact.relationship,
            } if contact else None,
        })
    except Exception as e:
        logger.exception("AI Greeting Generation Failed")
        return Response({
            "error": "An unexpected error occurred while generating your greeting. Please try again.",
            "success": False
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_greeting_email(request):
    """
    POST /api/ai/send/
    Send generated greeting to contact's email.
    Creates SentAIGreeting, EmailLog and Notification on success.
    """
    contact_id = request.data.get('contact_id')
    greeting_text = request.data.get('greeting_text', '')
    occasion = request.data.get('occasion', 'Greetings')
    greeting_id = request.data.get('greeting_id', None)

    if not contact_id:
        return Response({'error': 'contact_id is required.'}, status=400)
    if not greeting_text:
        return Response({'error': 'greeting_text is required.'}, status=400)

    try:
        contact = Contact.objects.get(pk=contact_id, user=request.user)
    except Contact.DoesNotExist:
        return Response({'error': 'Contact not found.'}, status=404)

    if not contact.email:
        return Response({'error': f'Contact {contact.name} has no email address.'}, status=400)

    subject = f"Happy {occasion} from AutoWish AI 🎉"
    body = f"Dear {contact.name},\n\n{greeting_text}\n\nWith warm regards,\n{request.user.first_name or request.user.username} via AutoWish AI"

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[contact.email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"send_greeting_email failed for contact {contact_id}: {e}")
        return Response({'error': 'Failed to send email. Please check your email configuration.'}, status=500)

    # Create SentAIGreeting
    generated_greeting = None
    if greeting_id:
        try:
            generated_greeting = GeneratedGreeting.objects.get(pk=greeting_id, user=request.user)
        except GeneratedGreeting.DoesNotExist:
            pass

    SentAIGreeting.objects.create(
        user=request.user,
        contact=contact,
        generated_greeting=generated_greeting,
        greeting_text=greeting_text,
        occasion=occasion,
        recipient_email=contact.email,
        delivery_status='Sent'
    )

    # Create EmailLog
    EmailLog.objects.create(
        user=request.user,
        recipient=contact.email,
        subject=subject,
        status='Delivered',
        date=timezone.now().strftime("%b %d, %Y"),
        delivery='Email',
    )

    create_activity(
        user=request.user,
        action_type='WISH_SENT',
        title=f"Birthday wish sent to {contact.name}" if occasion.lower() == 'birthday' else f"{occasion} wish sent to {contact.name}",
        entity_type='sent_ai_greeting',
        metadata={'contact_name': contact.name, 'occasion': occasion}
    )

    # Create in-app Notification
    Notification.objects.create(
        user=request.user,
        title=f"Email Sent to {contact.name}",
        message=f"Your {occasion} greeting was successfully sent to {contact.email}.",
        is_read=False,
    )

    log_activity(request.user, 'Send Greeting', f"Sent {occasion} greeting to {contact.name} ({contact.email}).", request)

    return Response({
        'success': True,
        'message': f"Greeting sent to {contact.name} at {contact.email}.",
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_greeting(request):
    """
    POST /api/ai/schedule/
    Create a ScheduledWish linked to a Contact with AI-generated message.
    """
    contact_id = request.data.get('contact_id')
    greeting_text = request.data.get('greeting_text', '')
    occasion = request.data.get('occasion', 'Birthday')
    date_str = request.data.get('date')
    time_str = request.data.get('time', '09:00')
    tz = request.data.get('timezone', 'Asia/Kolkata')
    reminder_minutes = int(request.data.get('reminder_minutes', 15))

    if not contact_id:
        return Response({'error': 'contact_id is required.'}, status=400)
    if not date_str:
        return Response({'error': 'date is required.'}, status=400)

    check_scheduled_wish_limit(request.user)

    try:
        contact = Contact.objects.get(pk=contact_id, user=request.user)
    except Contact.DoesNotExist:
        return Response({'error': 'Contact not found.'}, status=404)

    try:
        wish_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

    try:
        wish_time_obj = datetime.strptime(time_str, '%H:%M').time()
    except ValueError:
        wish_time_obj = datetime.strptime('09:00', '%H:%M').time()

    # Future date/time validation
    naive_dt = datetime.combine(wish_date, wish_time_obj)
    try:
        user_tz = pytz.timezone(tz)
        aware_dt = user_tz.localize(naive_dt)
    except Exception:
        user_tz = pytz.timezone('Asia/Kolkata')
        aware_dt = user_tz.localize(naive_dt)

    if aware_dt <= timezone.localtime(timezone.now(), user_tz):
        return Response({'error': 'Scheduled date and time must be in the future.'}, status=400)

    wish = ScheduledWish.objects.create(
        user=request.user,
        contact=contact,
        date=wish_date,
        time=wish_time_obj,
        occasion=occasion,
        message=greeting_text,
        timezone=tz,
        reminder_minutes=reminder_minutes,
        status='Pending',
    )

    create_activity(
        user=request.user,
        action_type='WISH_SCHEDULED',
        title=f"Wish scheduled for {contact.name}",
        entity_type='scheduled_wish',
        entity_id=wish.id,
        metadata={'contact_name': contact.name, 'occasion': occasion, 'date': str(wish_date)}
    )

    log_activity(request.user, 'Schedule Greeting', f"Scheduled {occasion} greeting for {contact.name} on {date_str}.", request)

    return Response({
        'success': True,
        'id': wish.id,
        'message': f"Greeting scheduled for {contact.name} on {date_str} at {time_str}.",
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_greeting_template(request):
    """
    POST /api/ai/template/
    Save AI-generated greeting as a reusable GreetingTemplate.
    """
    name = request.data.get('name', '').strip()
    occasion = request.data.get('occasion', 'Birthday')
    tone = request.data.get('tone', 'Friendly')
    content = request.data.get('content', '').strip()
    is_favorite = request.data.get('is_favorite', False)

    if not name:
        return Response({'error': 'Template name is required.'}, status=400)
    if not content:
        return Response({'error': 'Template content is required.'}, status=400)

    template = GreetingTemplate.objects.create(
        user=request.user,
        name=name,
        occasion=occasion,
        tone=tone,
        content=content,
        is_favorite=is_favorite,
    )

    create_activity(
        user=request.user,
        action_type='TEMPLATE_SAVED',
        title=f"Template saved: {name}",
        entity_type='greeting_template',
        entity_id=template.id,
        metadata={'template_name': name, 'occasion': occasion}
    )

    log_activity(request.user, 'Save Template', f"Saved greeting template '{name}'.", request)

    return Response({
        'success': True,
        'id': template.id,
        'name': template.name,
        'message': f"Template '{name}' saved successfully.",
    })




# --- NOTIFICATIONS CENTER ---

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
        
    @action(detail=True, methods=['POST'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'is_read': True})

    @action(detail=False, methods=['GET'])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})
        
    @action(detail=False, methods=['POST'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})


# --- SUBSCRIPTIONS & PAYMENTS ---

@api_view(['GET'])
@permission_classes([AllowAny])
def subscription_plans(request):
    plans = [build_plan_api_payload(plan_id) for plan_id in PLAN_IDS]
    payload = {
        'plans': plans,
        'currency': 'INR',
    }
    if request.user.is_authenticated:
        payload['usage'] = get_usage_summary(request.user)
        payload['current_plan'] = request.user.profile.subscription_plan
    return Response(payload)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Legacy alias — creates a pending dummy payment without activating subscription."""
    plan_id = request.data.get('planId') or request.data.get('plan')
    try:
        payment = create_dummy_payment(request.user, plan_id)
        return Response({
            'paymentId': payment['payment_id'],
            'transactionId': payment['transaction_id'],
            'message': 'Sandbox payment session created.',
        })
    except ValueError as e:
        return _payment_error_response(e)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dummy_payment_create(request):
    plan_id = request.data.get('plan') or request.data.get('planId')
    try:
        payment = create_dummy_payment(request.user, plan_id)
        return Response(payment, status=201)
    except ValueError as e:
        return _payment_error_response(e)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dummy_payment_process(request):
    payment_id = request.data.get('payment_id') or request.data.get('paymentId')
    outcome = (request.data.get('outcome') or '').lower()

    if not payment_id:
        return Response({'detail': 'payment_id is required.', 'code': 'MISSING_PAYMENT_ID'}, status=400)

    try:
        result = process_dummy_payment(request.user, payment_id, outcome)
        if result['payment_status'] == 'SUCCESS':
            log_activity(request.user, 'Upgrade Plan', f"Upgraded plan to {result['plan']} via dummy payment.", request)
        return Response(result)
    except ValueError as e:
        return _payment_error_response(e)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dummy_payment_cancel(request):
    payment_id = request.data.get('payment_id') or request.data.get('paymentId')
    if not payment_id:
        return Response({'detail': 'payment_id is required.', 'code': 'MISSING_PAYMENT_ID'}, status=400)
    try:
        payment = cancel_dummy_payment(request.user, payment_id)
        return Response({'success': True, 'payment': payment})
    except ValueError as e:
        return _payment_error_response(e)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_list(request):
    payments = list_payments_for_user(request.user)
    return Response({'payments': payments})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_detail(request, payment_id):
    payment = get_payment_for_user(request.user, payment_id)
    if not payment:
        return Response({'detail': 'Payment not found.', 'code': 'PAYMENT_NOT_FOUND'}, status=404)
    return Response(payment)


def _payment_error_response(exc):
    code = str(exc)
    messages = {
        'INVALID_PLAN': ('Invalid or non-purchasable plan.', 400),
        'ALREADY_SUBSCRIBED': ('You are already subscribed to this plan.', 400),
        'PLAN_DOWNGRADE_NOT_ALLOWED': ('You cannot downgrade through checkout. Contact support.', 400),
        'CHECKOUT_NOT_AVAILABLE': ('Checkout is not available for this plan.', 400),
        'PAYMENT_NOT_FOUND': ('Payment not found.', 404),
        'PAYMENT_ALREADY_COMPLETED': ('This payment has already been completed.', 400),
        'INVALID_OUTCOME': ('Invalid payment outcome. Use "success" or "failed".', 400),
    }
    detail, status_code = messages.get(code, ('Payment processing failed.', 400))
    return Response({'detail': detail, 'code': code}, status=status_code)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_webhook(request):
    """Legacy webhook — kept for backward compatibility. Prefer dummy/process API."""
    transaction_id = request.data.get('transactionId')
    status_payment = request.data.get('status', 'Completed')

    try:
        tx = SubscriptionTransaction.objects.get(transaction_id=transaction_id)
        if status_payment in ('Completed', 'SUCCESS') and tx.status != 'SUCCESS':
            tx.status = 'SUCCESS'
            tx.save(update_fields=['status', 'updated_at'])
            profile = tx.user.profile
            profile.subscription_plan = tx.plan
            profile.save(update_fields=['subscription_plan'])
            log_activity(tx.user, 'Upgrade Plan', f"Upgraded plan to {tx.plan} via payment.", request)
            create_activity(
                user=tx.user,
                action_type='SUBSCRIPTION_UPDATED',
                title=f"Subscription upgraded to {tx.plan}",
                entity_type='subscription_transaction',
                entity_id=tx.id,
                metadata={'plan': tx.plan, 'gateway': tx.gateway, 'amount': str(tx.amount)},
            )
            Notification.objects.create(
                user=tx.user,
                title="Subscription Upgraded!",
                message=f"Thank you! Your account has been upgraded to the {tx.plan} plan successfully.",
                type='system',
            )
            return Response({'success': True, 'message': 'User subscription upgraded.'})
    except SubscriptionTransaction.DoesNotExist:
        pass

    return Response({'success': False, 'error': 'Transaction not found'}, status=400)


# --- DASHBOARD & ANALYTICS VIEWS ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    total_contacts = Contact.objects.filter(user=user).count()
    upcoming = Event.objects.filter(user=user, status='Upcoming').count()
    wishes_sent = EmailLog.objects.filter(user=user, status__in=['Sent', 'Delivered']).count()
    failed = ScheduledWish.objects.filter(user=user, status='Failed').count()
    
    # Dynamic recent logs
    recent_logs = EmailLog.objects.filter(user=user).order_by('-created_at')[:5]
    recent_logs_data = EmailLogSerializer(recent_logs, many=True).data
    
    # Monthly email send counts for chart
    chart_data = [
        {'name': 'Jan', 'sent': 12},
        {'name': 'Feb', 'sent': 18},
        {'name': 'Mar', 'sent': 22},
        {'name': 'Apr', 'sent': 34},
        {'name': 'May', 'sent': 40},
        {'name': 'Jun', 'sent': 52},
        {'name': 'Jul', 'sent': wishes_sent}
    ]
    
    return Response({
        'totalContacts': total_contacts,
        'upcomingEvents': upcoming,
        'wishesSent': wishes_sent,
        'pendingReplies': 0,
        'failedEmails': failed,
        'totalScheduled': ScheduledWish.objects.filter(user=user, status='Scheduled').count(),
        'successRate': round((wishes_sent / (wishes_sent + failed) * 100), 1) if (wishes_sent + failed) > 0 else 100.0,
        'recentLogs': recent_logs_data,
        'chartData': chart_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def greeting_analytics(request):
    """
    GET /api/analytics/greetings/
    Returns analytics for AI greetings and greeting cards.
    """
    from django.utils import timezone
    from datetime import timedelta

    user = request.user
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # AI Greetings Stats
    ai_greetings = SentAIGreeting.objects.filter(user=user)
    ai_today = ai_greetings.filter(sent_at__gte=today_start).count()
    ai_week = ai_greetings.filter(sent_at__gte=week_start).count()
    ai_month = ai_greetings.filter(sent_at__gte=month_start).count()
    ai_total = ai_greetings.count()

    # Greeting Cards Stats
    greeting_cards = SentGreetingCard.objects.filter(user=user)
    cards_today = greeting_cards.filter(sent_at__gte=today_start).count()
    cards_week = greeting_cards.filter(sent_at__gte=week_start).count()
    cards_month = greeting_cards.filter(sent_at__gte=month_start).count()
    cards_total = greeting_cards.count()

    return Response({
        'aiGreetings': {
            'today': ai_today,
            'week': ai_week,
            'month': ai_month,
            'total': ai_total
        },
        'greetingCards': {
            'today': cards_today,
            'week': cards_week,
            'month': cards_month,
            'total': cards_total
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    """
    GET /api/dashboard/recent-activity/
    Returns the most recent activities for the authenticated user.
    """
    try:
        limit = int(request.query_params.get('limit', 10))
        if limit > 50:
            limit = 50
        if limit < 1:
            limit = 10

        qs = ActivityLog.objects.filter(user=request.user).select_related('user').order_by('-created_at')
        total_count = qs.count()
        activities = qs[:limit]
        serializer = ActivityLogSerializer(activities, many=True)

        return Response({
            'results': serializer.data,
            'count': total_count,
        })
    except Exception as e:
        logger.error(f"recent_activity failed: {e}")
        return Response({
            'results': [],
            'count': 0,
            'error': 'Failed to load recent activity.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- ADMIN PANEL ENDPOINTS ---

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrSuperAdmin])
def admin_dashboard_stats(request):
    total_users = User.objects.count()
    total_contacts = Contact.objects.count()
    total_wishes = ScheduledWish.objects.count()
    completed_tx = SubscriptionTransaction.objects.filter(status='Completed')
    total_revenue = sum(tx.amount for tx in completed_tx)
    
    plan_distribution = {
        'FREE': UserProfile.objects.filter(subscription_plan='FREE').count(),
        'PRO': UserProfile.objects.filter(subscription_plan='PRO').count(),
        'BUSINESS': UserProfile.objects.filter(subscription_plan='BUSINESS').count(),
        'ENTERPRISE': UserProfile.objects.filter(subscription_plan='ENTERPRISE').count()
    }
    
    return Response({
        'totalUsers': total_users,
        'totalContacts': total_contacts,
        'totalWishesScheduled': total_wishes,
        'totalRevenue': total_revenue,
        'planDistribution': plan_distribution
    })

# Admin: Prompt Template Management CRUD ViewSet
class AIPromptViewSet(viewsets.ModelViewSet):
    serializer_class = AIPromptSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    queryset = AIPrompt.objects.all().order_by('-created_at')

# Admin: Audit Activity Logs
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get_queryset(self):
        qs = AuditLog.objects.select_related('user').order_by('-created_at')
        search = self.request.query_params.get('search') or self.request.query_params.get('q')
        if search:
            qs = qs.filter(
                Q(action__icontains=search) |
                Q(event_type__icontains=search) |
                Q(actor_name__icontains=search) |
                Q(user__username__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(details__icontains=search) |
                Q(ip_address__icontains=search) |
                Q(previous_name__icontains=search) |
                Q(updated_name__icontains=search)
            )
        event_type = self.request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

# Admin: User management
class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get_queryset(self):
        return User.objects.select_related('profile').order_by('-date_joined')
    
    @action(detail=True, methods=['POST'])
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        log_activity(request.user, 'Admin Toggle User', f"{('Activated' if user.is_active else 'Deactivated')} user {user.username}.", request)
        return Response({'is_active': user.is_active})

    @action(detail=True, methods=['POST'])
    def update_plan(self, request, pk=None):
        user = self.get_object()
        plan = request.data.get('plan')
        role = request.data.get('role')
        
        valid_plans = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']
        if plan and plan not in valid_plans:
            return Response({'error': 'Invalid plan'}, status=400)
            
        profile = user.profile
        if plan:
            profile.subscription_plan = plan
        if role:
            profile.role = role
        profile.save()
        
        log_activity(request.user, 'Admin Update User', f"Updated user {user.username}: plan={plan}, role={role}.", request)
        return Response({'success': True, 'message': 'User updated.'})


# ─────────────────────────────────────────────────────────────────────────────
# Greeting Card System ViewSets
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


class GreetingCardTemplateViewSet(viewsets.ModelViewSet):
    """Template library API. Read = any authenticated user; write = admin only."""
    serializer_class = GreetingCardTemplateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    ordering_fields = ['sort_order', 'title', 'created_at', 'updated_at']
    search_fields = ['title', 'slug', 'description', 'tags']

    def get_queryset(self):
        # Admins see everything; regular users only see active templates.
        user = self.request.user
        is_admin = user.is_authenticated and user.profile.role in ('admin', 'super_admin')
        if is_admin:
            qs = GreetingCardTemplate.objects.all()
        else:
            qs = GreetingCardTemplate.objects.filter(is_active=True)

        occasion = self.request.query_params.get('occasion')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        premium = self.request.query_params.get('premium')
        featured = self.request.query_params.get('featured')
        active = self.request.query_params.get('active')

        if occasion:
            qs = qs.filter(occasion=occasion)
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
                | Q(slug__icontains=search)
            )
        if premium is not None:
            qs = qs.filter(is_premium=(premium.lower() == 'true'))
        if featured is not None:
            qs = qs.filter(is_featured=(featured.lower() == 'true'))
        if active is not None and is_admin:
            qs = qs.filter(is_active=(active.lower() == 'true'))
        return qs

    def get_permissions(self):
        # Write operations restricted to admins.
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """Return all available occasions and categories."""
        occasions = [{'value': v, 'label': l} for v, l in GreetingCardTemplate.OCCASION_CHOICES]
        categories = [{'value': v, 'label': l} for v, l in GreetingCardTemplate.CATEGORY_CHOICES]
        return Response({'occasions': occasions, 'categories': categories})


class GreetingCardViewSet(viewsets.ModelViewSet):
    """Full CRUD for user greeting cards with custom actions."""
    permission_classes = [IsAuthenticated]
    # MultiPartParser/FormParser for image uploads (create/update/upload-image);
    # JSONParser for JSON-only actions such as send_card, save_preview, etc.
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return GreetingCardListSerializer
        return GreetingCardSerializer

    def get_queryset(self):
        qs = GreetingCard.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        occasion = self.request.query_params.get('occasion')
        search = self.request.query_params.get('search')
        is_favorite = self.request.query_params.get('is_favorite')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if occasion:
            qs = qs.filter(occasion=occasion)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(recipient_name__icontains=search))
        if is_favorite is not None:
            qs = qs.filter(is_favorite=(is_favorite.lower() == 'true'))
        return qs

    def perform_create(self, serializer):
        card = serializer.save(user=self.request.user)
        create_activity(
            user=self.request.user,
            action_type='GREETING_CARD_CREATED',
            title=f"Greeting card created for {card.recipient_name}" if card.recipient_name else "Greeting card created",
            entity_type='greeting_card',
            entity_id=card.id,
            metadata={'occasion': card.occasion, 'recipient_name': card.recipient_name}
        )

    def perform_update(self, serializer):
        card = serializer.save()
        create_activity(
            user=self.request.user,
            action_type='GREETING_CARD_UPDATED',
            title=f"Greeting card updated: {card.title}",
            entity_type='greeting_card',
            entity_id=card.id,
            metadata={'card_title': card.title, 'occasion': card.occasion}
        )

    def perform_destroy(self, instance):
        card_title = instance.title
        card_id = instance.id
        instance.delete()
        create_activity(
            user=self.request.user,
            action_type='GREETING_CARD_UPDATED',
            title=f"Greeting card deleted: {card_title}",
            entity_type='greeting_card',
            entity_id=card_id,
            metadata={'card_title': card_title}
        )

    def _validate_image(self, file):
        if file.size > MAX_IMAGE_SIZE:
            return Response({'error': 'Image exceeds 10 MB limit.'}, status=400)
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            return Response({'error': f'Unsupported file type: {file.content_type}'}, status=400)
        return None

    @action(detail=False, methods=['post'], url_path='upload-image')
    def upload_image(self, request):
        """Upload a card background or photo and return its URL."""
        file = request.FILES.get('image')
        if not file:
            return Response({'error': 'No image provided.'}, status=400)
        err = self._validate_image(file)
        if err:
            return err
        import uuid
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        ext = file.name.rsplit('.', 1)[-1] if '.' in file.name else 'jpg'
        filename = f'greeting_cards/uploads/{request.user.id}/{uuid.uuid4().hex}.{ext}'
        path = default_storage.save(filename, ContentFile(file.read()))
        url = request.build_absolute_uri(default_storage.url(path))
        return Response({'url': url, 'path': path})

    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate(self, request, pk=None):
        """Duplicate a card for the current user."""
        card = self.get_object()
        new_card = GreetingCard.objects.create(
            user=request.user,
            template=card.template,
            title=f"{card.title} (Copy)",
            occasion=card.occasion,
            recipient_name=card.recipient_name,
            heading=card.heading,
            message=card.message,
            footer=card.footer,
            signature=card.signature,
            card_size=card.card_size,
            card_theme=card.card_theme,
            card_width=card.card_width,
            card_height=card.card_height,
            background_color=card.background_color,
            background_blur=card.background_blur,
            background_opacity=card.background_opacity,
            border_radius=card.border_radius,
            shadow=card.shadow,
            font_family=card.font_family,
            font_size=card.font_size,
            font_color=card.font_color,
            text_style=card.text_style,
            elements_json=card.elements_json,
            status='draft',
        )
        serializer = GreetingCardSerializer(new_card, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='favorite')
    def favorite(self, request, pk=None):
        """Toggle favorite status for the card."""
        card = self.get_object()
        card.is_favorite = not card.is_favorite
        card.save(update_fields=['is_favorite'])
        return Response({'is_favorite': card.is_favorite})

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """Archive a card."""
        card = self.get_object()
        previous_status = card.status
        card.status = 'archived'
        card.save(update_fields=['status'])
        create_activity(
            user=request.user,
            action_type='GREETING_CARD_UPDATED',
            title=f"Greeting card archived: {card.title}",
            entity_type='greeting_card',
            entity_id=card.id,
            metadata={'card_title': card.title, 'previous_status': previous_status, 'new_status': 'archived'}
        )
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        """Publish a draft card."""
        card = self.get_object()
        previous_status = card.status
        card.status = 'published'
        card.save(update_fields=['status'])
        create_activity(
            user=request.user,
            action_type='GREETING_CARD_UPDATED',
            title=f"Greeting card published: {card.title}",
            entity_type='greeting_card',
            entity_id=card.id,
            metadata={'card_title': card.title, 'previous_status': previous_status, 'new_status': 'published'}
        )
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'], url_path='save-preview')
    def save_preview(self, request, pk=None):
        """Accept a base64 PNG preview from the frontend and store it."""
        import base64
        from django.core.files.base import ContentFile
        card = self.get_object()
        preview_data = request.data.get('preview_base64')
        if not preview_data:
            return Response({'error': 'No preview data.'}, status=400)
        try:
            # Strip data URL prefix if present
            if ',' in preview_data:
                preview_data = preview_data.split(',', 1)[1]
            img_bytes = base64.b64decode(preview_data)
            filename = f'greeting_cards/previews/{card.id}_preview.png'
            card.preview_image.save(filename, ContentFile(img_bytes), save=True)
            url = request.build_absolute_uri(card.preview_image.url)
            return Response({'preview_image_url': url})
        except Exception as e:
            logger.error(f"Card preview save failed: {e}")
            return Response({'error': 'Preview save failed.'}, status=500)

    @action(detail=True, methods=['get'], url_path='export')
    def export_card(self, request, pk=None):
        """Server-side export: returns the card file in png, jpeg, or pdf."""
        card = self.get_object()
        fmt = request.query_params.get('format', 'png').lower()
        if fmt not in ('png', 'jpeg', 'jpg', 'pdf'):
            fmt = 'png'

        safe_title = "".join(c for c in (card.title or 'greeting-card') if c.isalnum() or c in (' ', '_', '-')).strip() or 'greeting-card'

        if card.preview_image:
            try:
                with card.preview_image.open('rb') as f:
                    data = f.read()

                if fmt == 'pdf':
                    try:
                        from PIL import Image as PILImage
                        import io
                        img = PILImage.open(io.BytesIO(data))
                        if img.mode in ('RGBA', 'LA', 'P'):
                            img = img.convert('RGB')
                        pdf_io = io.BytesIO()
                        img.save(pdf_io, format='PDF')
                        pdf_io.seek(0)
                        resp = HttpResponse(pdf_io.read(), content_type='application/pdf')
                        resp['Content-Disposition'] = f'attachment; filename="{safe_title}.pdf"'
                        return resp
                    except Exception as e:
                        logger.warning(f"Card PDF conversion fallback: {e}")
                        resp = HttpResponse(data, content_type='image/png')
                        resp['Content-Disposition'] = f'attachment; filename="{safe_title}.png"'
                        return resp

                content_type = 'image/png' if fmt == 'png' else 'image/jpeg'
                resp = HttpResponse(data, content_type=content_type)
                resp['Content-Disposition'] = f'attachment; filename="{safe_title}.{fmt}"'
                return resp
            except Exception as e:
                logger.error(f"Error reading card preview image: {e}")
                return Response({'error': 'Failed to read card preview file.'}, status=500)

        return Response({'error': 'No preview image generated yet. Please open the editor to generate a preview.'}, status=404)

    @action(detail=True, methods=['post'], url_path='send')
    def send_card(self, request, pk=None):
        """Send greeting card to selected contact via email."""
        from django.core.mail import EmailMultiAlternatives
        from django.core.mail import send_mail

        card = self.get_object()
        
        # Validate contact selected and has email
        contact_id = request.data.get('contact_id')
        if not contact_id:
            return Response({'error': 'No contact selected.'}, status=400)
        
        try:
            contact = Contact.objects.get(pk=contact_id, user=request.user)
        except Contact.DoesNotExist:
            return Response({'error': 'Contact not found.'}, status=404)
        
        if not contact.email:
            return Response({'error': 'Contact has no email address.'}, status=400)
        
        # Update card's contact and recipient name
        card.contact = contact
        card.recipient_name = contact.name
        card.status = 'published'
        card.save()
        
        # Prepare email
        subject = "A Special Greeting from AutoWish AI"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <div style="padding: 20px; background: #f5f5f5; border-radius: 8px;">
                <h2 style="color: #4f46e5;">Hello {contact.name}!</h2>
                <p>You've received a personalized greeting card!</p>
                <p style="color: #6b7280;">With warm regards,<br>AutoWish AI</p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""Hello {contact.name},\n\nYou've received a personalized greeting card!\n\nWith warm regards,\nAutoWish AI"""
        
        try:
            # Send email with preview as attachment
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[contact.email]
            )
            email.attach_alternative(html_content, "text/html")
            
            # Attach preview image if available
            if card.preview_image:
                try:
                    with card.preview_image.open('rb') as f:
                        email.attach(f"{card.title}.png", f.read(), 'image/png')
                except Exception as attach_err:
                    logger.warning(f"Greeting card attachment skipped: {attach_err}")
            
            email.send(fail_silently=False)
        except Exception as e:
            # Surface the REAL error — do not hide it behind a generic message.
            err_type = type(e).__name__
            err_msg = str(e)
            logger.error(f"send_card email FAILED [{err_type}]: {err_msg}")
            return Response({
                'error': f'Email send failed: {err_type}',
                'detail': err_msg,
            }, status=500)
        
        # Create SentGreetingCard record
        SentGreetingCard.objects.create(
            user=request.user,
            contact=contact,
            greeting_card=card,
            recipient_email=contact.email,
            delivery_status='Sent'
        )
        
        # Create EmailLog
        EmailLog.objects.create(
            user=request.user,
            recipient=contact.email,
            subject=subject,
            status='Sent',
            date=timezone.now().strftime("%b %d, %Y"),
            delivery='Email',
        )

        create_activity(
            user=request.user,
            action_type='GREETING_CARD_SENT',
            title=f"Greeting card sent to {contact.name}",
            entity_type='sent_greeting_card',
            metadata={'contact_name': contact.name, 'card_title': card.title}
        )

        # Create in-app Notification
        Notification.objects.create(
            user=request.user,
            title=f"Card Sent to {contact.name}",
            message=f"Your greeting card was successfully sent to {contact.email}.",
            is_read=False,
        )
        
        log_activity(request.user, 'Send Card', f"Sent greeting card to {contact.name} ({contact.email}).", request)
        
        return Response({
            'success': True,
            'message': f"Greeting card sent to {contact.name} at {contact.email}.",
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """
    Production-ready global search API.
    Performs real-time search across:
      - Contacts (name, email, phone, tags, relationship, group)
      - Events (title, recipient, type, status)
      - Scheduled Wishes (contact name, email, occasion, message, template, status)
      - Greeting Cards (title, recipient_name, occasion, heading, status, card_theme)
        (+ GreetingCardTemplate fallback)

    Features:
      - Scoped strictly to request.user (permission-based data filtering)
      - Input validation (trimming, max length, limit bounds)
      - Highly optimized queries (select_related, indexed fields)
      - Rich metadata per result category for frontend navigation and display
    """
    import urllib.parse

    raw_query = request.query_params.get('q', '').strip()
    category = request.query_params.get('category', 'all').strip().lower()

    # Input validation: query length
    if len(raw_query) > 100:
        return Response({
            'error': 'Search query exceeds maximum length of 100 characters.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate and constrain limit
    try:
        limit = int(request.query_params.get('limit', 5))
        limit = max(1, min(limit, 20))
    except (ValueError, TypeError):
        limit = 5

    empty_response = {
        'query': raw_query,
        'results': [],
        'grouped': {
            'contacts': [],
            'events': [],
            'scheduled_wishes': [],
            'greeting_cards': []
        },
        'counts': {
            'total': 0,
            'contacts': 0,
            'events': 0,
            'scheduled_wishes': 0,
            'greeting_cards': 0
        }
    }

    if not raw_query:
        return Response(empty_response, status=status.HTTP_200_OK)

    user = request.user
    q = raw_query

    contacts_list = []
    events_list = []
    wishes_list = []
    cards_list = []

    # 1. Contacts Search
    if category in ('all', 'contacts'):
        contacts_qs = Contact.objects.filter(user=user).filter(
            Q(name__icontains=q) |
            Q(email__icontains=q) |
            Q(phone__icontains=q) |
            Q(relationship__icontains=q) |
            Q(tags__icontains=q) |
            Q(group__icontains=q)
        ).order_by('-is_favorite', 'name')[:limit]

        for c in contacts_qs:
            sub = c.relationship or 'Contact'
            if c.email:
                sub += f" • {c.email}"
            contacts_list.append({
                'id': c.id,
                'category': 'contacts',
                'category_label': 'Contacts',
                'title': c.name,
                'subtitle': sub,
                'url': f"/contacts?search={urllib.parse.quote(c.name)}&id={c.id}",
                'meta': {
                    'email': c.email,
                    'phone': c.phone or '',
                    'relationship': c.relationship or '',
                    'group': c.group or '',
                    'is_favorite': c.is_favorite,
                    'birthday': c.birthday or '',
                }
            })

    # 2. Events Search
    if category in ('all', 'events'):
        events_qs = Event.objects.filter(user=user).filter(
            Q(title__icontains=q) |
            Q(recipient__icontains=q) |
            Q(type__icontains=q) |
            Q(status__icontains=q)
        ).order_by('date', 'title')[:limit]

        for e in events_qs:
            sub = f"{e.type} for {e.recipient}"
            if e.date:
                formatted_date = e.date.strftime('%b %d, %Y') if hasattr(e.date, 'strftime') else str(e.date)
                sub += f" • {formatted_date}"
            events_list.append({
                'id': e.id,
                'category': 'events',
                'category_label': 'Events',
                'title': e.title,
                'subtitle': sub,
                'url': f"/events?search={urllib.parse.quote(e.title)}&id={e.id}",
                'meta': {
                    'recipient': e.recipient,
                    'type': e.type,
                    'date': str(e.date) if e.date else '',
                    'status': e.status,
                    'recurring': e.recurring,
                }
            })

    # 3. Scheduled Wishes Search
    if category in ('all', 'scheduled_wishes', 'schedules', 'wishes'):
        wishes_qs = ScheduledWish.objects.filter(user=user).select_related('contact').filter(
            Q(contact__name__icontains=q) |
            Q(contact__email__icontains=q) |
            Q(occasion__icontains=q) |
            Q(message__icontains=q) |
            Q(template__icontains=q) |
            Q(status__icontains=q)
        ).order_by('date', 'time')[:limit]

        for w in wishes_qs:
            c_name = w.contact.name if w.contact else 'Unknown Recipient'
            date_str = str(w.date) if w.date else ''
            time_str = str(w.time) if w.time else ''
            datetime_str = f"{date_str} {time_str}".strip()
            sub = f"{w.status}"
            if datetime_str:
                sub += f" • {datetime_str}"
            wishes_list.append({
                'id': w.id,
                'category': 'scheduled_wishes',
                'category_label': 'Scheduled Wishes',
                'title': f"{w.occasion} Wish for {c_name}",
                'subtitle': sub,
                'url': f"/schedule?search={urllib.parse.quote(c_name)}&id={w.id}",
                'meta': {
                    'contact_name': c_name,
                    'occasion': w.occasion,
                    'date': date_str,
                    'time': time_str,
                    'status': w.status,
                    'preview': (w.message[:90] + '...') if len(w.message or '') > 90 else (w.message or ''),
                }
            })

    # 4. Greeting Cards Search
    if category in ('all', 'greeting_cards', 'cards'):
        cards_qs = GreetingCard.objects.filter(user=user).filter(
            Q(title__icontains=q) |
            Q(recipient_name__icontains=q) |
            Q(occasion__icontains=q) |
            Q(heading__icontains=q) |
            Q(status__icontains=q) |
            Q(card_theme__icontains=q)
        ).order_by('-updated_at')[:limit]

        for card in cards_qs:
            sub = card.occasion or 'Greeting Card'
            if card.recipient_name:
                sub += f" for {card.recipient_name}"
            sub += f" • {card.status.capitalize()}"
            preview_img = request.build_absolute_uri(card.preview_image.url) if card.preview_image else None
            target_url = f"/greeting-cards/preview/{card.id}" if card.status == 'published' else f"/greeting-cards/create/{card.id}"
            cards_list.append({
                'id': card.id,
                'category': 'greeting_cards',
                'category_label': 'Greeting Cards',
                'title': card.title or 'Untitled Card',
                'subtitle': sub,
                'preview_image_url': preview_img,
                'url': target_url,
                'meta': {
                    'occasion': card.occasion,
                    'recipient_name': card.recipient_name,
                    'status': card.status,
                    'card_size': card.card_size,
                    'is_template': False,
                }
            })

        # If user has fewer cards than limit, also search active card templates
        remaining = limit - len(cards_list)
        if remaining > 0:
            templates_qs = GreetingCardTemplate.objects.filter(is_active=True).filter(
                Q(title__icontains=q) |
                Q(occasion__icontains=q) |
                Q(category__icontains=q)
            ).order_by('sort_order', 'title')[:remaining]

            for tmpl in templates_qs:
                preview_img = request.build_absolute_uri(tmpl.preview_image.url) if tmpl.preview_image else None
                cards_list.append({
                    'id': tmpl.id,
                    'category': 'greeting_cards',
                    'category_label': 'Greeting Cards',
                    'title': f"Template: {tmpl.title}",
                    'subtitle': f"{tmpl.occasion} • {tmpl.category} Template",
                    'preview_image_url': preview_img,
                    'url': f"/greeting-cards/create?template={tmpl.id}",
                    'meta': {
                        'occasion': tmpl.occasion,
                        'category': tmpl.category,
                        'is_template': True,
                    }
                })

    all_results = contacts_list + events_list + wishes_list + cards_list

    return Response({
        'query': q,
        'results': all_results,
        'grouped': {
            'contacts': contacts_list,
            'events': events_list,
            'scheduled_wishes': wishes_list,
            'greeting_cards': cards_list,
        },
        'counts': {
            'total': len(all_results),
            'contacts': len(contacts_list),
            'events': len(events_list),
            'scheduled_wishes': len(wishes_list),
            'greeting_cards': len(cards_list),
        }
    }, status=status.HTTP_200_OK)





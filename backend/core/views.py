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
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from .models import (
    Contact, Event, GreetingTemplate, ScheduledWish, EmailLog,
    GeneratedGreeting, UserProfile, AIPrompt, Notification,
    SubscriptionTransaction, AuditLog, ActivityLog,
    GreetingCardTemplate, GreetingCard, GreetingCardFavorite,
    SentGreetingCard, SentAIGreeting
)
import traceback
from .serializers import (
    ContactSerializer, EventSerializer, GreetingTemplateSerializer,
    ScheduledWishSerializer, EmailLogSerializer, GeneratedGreetingSerializer,
    UserSerializer, UserProfileSerializer, AIPromptSerializer, AIGenerateRequestSerializer,
    NotificationSerializer, SubscriptionTransactionSerializer, AuditLogSerializer,
    GreetingCardTemplateSerializer, GreetingCardSerializer,
    GreetingCardListSerializer, GreetingCardFavoriteSerializer,
    ActivityLogSerializer
)
from .tasks import send_email_task
from services.activity_service import create_activity
from services.ai.openrouter_service import (
    generate_text as openrouter_generate,
    masked_key as openrouter_masked_key,
    AIValidationError,
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
def log_activity(user, action, details, request=None):
    try:
        ip = get_client_ip(request) if request else None
        AuditLog.objects.create(user=user, action=action, details=details, ip_address=ip)
    except Exception as log_err:
        # Logging must NEVER mask a successful primary action (e.g. email send).
        logger.warning(f"log_activity failed (ignored): {log_err}")

# Custom Permissions
class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.profile.role == 'super_admin'

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.profile.role in ['admin', 'super_admin']


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
        # Create token for email verification
        refresh = RefreshToken.for_user(user)
        verification_token = str(refresh.access_token)
        
        # Log Audit
        log_activity(user, 'Register', 'Registered new user account.', request)
        
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
    log_activity(user, 'Login', 'User logged in successfully.', request)
    
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
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=400)
        
    try:
        user = User.objects.get(email=email)
        refresh = RefreshToken.for_user(user)
        reset_token = str(refresh.access_token)
        
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        email_body = f"Hello,\n\nYou requested a password reset. Please click on the link below:\n\n{reset_url}\n\nIf you did not request this, ignore this email."
        try:
            send_email_task.delay(user.email, "Reset Password - AutoWish AI", email_body)
        except Exception as e:
            logger.error(f"Failed to queue reset password email task: {e}")
        
        log_activity(user, 'Forgot Password', 'Requested password reset email.')
        return Response({'message': 'Password reset link sent.'})
    except User.DoesNotExist:
        return Response({'message': 'If the email exists, a reset link has been sent.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    token = request.data.get('token')
    new_password = request.data.get('password')
    if not token or not new_password:
        return Response({'error': 'Token and password are required'}, status=400)
        
    try:
        untyped_token = UntypedToken(token)
        user_id = untyped_token.payload.get('user_id')
        user = User.objects.get(id=user_id)
        
        user.set_password(new_password)
        user.save()
        
        log_activity(user, 'Reset Password', 'Password reset using token.')
        return Response({'message': 'Password reset successfully.'})
    except Exception:
        return Response({'error': 'Invalid or expired token'}, status=400)

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
    profile = user.profile
    
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
        
    elif request.method in ('PUT', 'PATCH'):
        # Update User first name, last name, username
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'username' in request.data:
            new_username = request.data['username']
            if new_username != user.username and User.objects.filter(username=new_username).exists():
                return Response({'error': 'Username already taken.'}, status=400)
            user.username = new_username
        user.save()
        
        # Update profile fields
        profile_fields = ['phone', 'country', 'timezone', 'preferred_language']
        for field in profile_fields:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        
        log_activity(user, 'Update Profile', 'Updated profile information.', request)
        return Response(UserSerializer(user).data)


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

    @action(detail=False, methods=['GET'])
    def export_csv(self, request):
        contacts = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="autowish_contacts.csv"'
        
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
        wish = serializer.save(user=self.request.user)
        create_activity(
            user=self.request.user,
            action_type='WISH_SCHEDULED',
            title=f"Wish scheduled for {wish.contact.name}",
            entity_type='scheduled_wish',
            entity_id=wish.id,
            metadata={'contact_name': wish.contact.name, 'occasion': wish.occasion}
        )

    def perform_update(self, serializer):
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
            queryset = queryset.filter(status='Scheduled').order_by('date', 'time')
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
        wish_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        try:
            wish_time = datetime.strptime(time_str, '%H:%M').time()
        except ValueError:
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
            raise serializers.ValidationError({"date": "Scheduled date and time must be in the future."})
            
        # Save
        wish = serializer.save(user=self.request.user)
        
        # Schedule Celery task if not draft/Pending
        if wish.status == 'Scheduled':
            utc_dt = aware_dt.astimezone(pytz.UTC)
            task = send_scheduled_wish_task.apply_async((wish.id,), eta=utc_dt)
            wish.task_id = task.id
            wish.save()
        
        log_activity(self.request.user, 'Schedule Created', f"Scheduled wish ID {wish.id} for {wish.contact.name}.", self.request)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.status == 'Sent':
            raise serializers.ValidationError("Cannot edit already sent wishes.")
            
        data = self.request.data
        date_str = data.get('date', str(instance.date))
        time_str = data.get('time', instance.time.strftime('%H:%M') if instance.time else '09:00')
        tz_name = data.get('timezone', instance.timezone)
        
        wish_date = datetime.strptime(date_str, '%Y-%m-%d').date() if isinstance(date_str, str) else date_str
        if isinstance(time_str, str):
            try:
                wish_time = datetime.strptime(time_str, '%H:%M').time()
            except ValueError:
                wish_time = datetime.strptime('09:00', '%H:%M').time()
        else:
            wish_time = time_str
            
        # Validate future only
        naive_dt = datetime.combine(wish_date, wish_time)
        try:
            tz = pytz.timezone(tz_name)
            aware_dt = tz.localize(naive_dt)
        except Exception:
            tz = pytz.timezone('Asia/Kolkata')
            aware_dt = tz.localize(naive_dt)
            
        if aware_dt <= timezone.localtime(timezone.now(), tz):
            raise serializers.ValidationError({"date": "Scheduled date and time must be in the future."})
            
        # If date/time/timezone changed, revoke old and schedule new
        date_changed = wish_date != instance.date or wish_time != instance.time or tz_name != instance.timezone
        
        wish = serializer.save()
        
        if date_changed and wish.status == 'Scheduled':
            # Revoke old task
            if instance.task_id:
                try:
                    celery_app.control.revoke(instance.task_id, terminate=True)
                except Exception as e:
                    logger.error(f"Failed to revoke task {instance.task_id}: {e}")
            
            # Schedule new task
            utc_dt = aware_dt.astimezone(pytz.UTC)
            task = send_scheduled_wish_task.apply_async((wish.id,), eta=utc_dt)
            wish.task_id = task.id
            wish.save()
            
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
            
        # Revoke old just in case
        if wish.task_id:
            try:
                celery_app.control.revoke(wish.task_id, terminate=True)
            except Exception:
                pass
                
        wish.status = 'Scheduled'
        wish.cancelled_at = None
        wish.last_error = None
        
        # Schedule new task
        utc_dt = aware_dt.astimezone(pytz.UTC)
        task = send_scheduled_wish_task.apply_async((wish.id,), eta=utc_dt)
        wish.task_id = task.id
        wish.save()
        
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
        upcoming_count = ScheduledWish.objects.filter(user=user, date__gt=today_date, status='Scheduled').count()
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
    Generate a personalized greeting using OpenRouter AI.
    If contact_id is supplied, auto-populate from Contact fields.
    Saves result to GeneratedGreeting and returns the object.
    """
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

        prompt = build_greeting_prompt(
            recipient_name=recipient_name,
            occasion=occasion,
            tone=tone,
            language=language,
            relationship=relationship,
            age=age,
            interests=interests,
            custom_context=custom_context,
        )

        lang_name = LANGUAGE_MAP.get(language, 'English')

        if mode == 'card':
            # ── Greeting Card Mode: compact, card-safe message ────────────────────────
            # Generates a concise greeting card message (3-4 sentences, 35-60 words).
            # Returns ONLY the final greeting text — no reasoning, counting, or labels.
            system_prompt = (
                f"You are an expert, native {lang_name} greeting card writer. "
                f"Write ONLY in {lang_name}. Never mix languages. "
                f"Generate a concise, heartfelt greeting card message for {recipient_name} "
                f"on the occasion of {occasion} in a {tone.lower()} tone.\n"
                f"LENGTH & STRUCTURE:\n"
                f"- Write 3 to 4 short sentences (approximately 35 to 60 words total).\n"
                f"- Include a warm greeting addressing {recipient_name}, an occasion-specific wish, and a complete warm closing sentence.\n"
                f"STRICT OUTPUT RULES — YOU MUST FOLLOW ALL OF THESE:\n"
                f"- The final response must contain ONLY the greeting message itself.\n"
                f"- Do NOT include any template text, placeholder variables, or sentence labels.\n"
                f"- Do NOT include text like 'Greeting + Name', 'Closing', 'Sentence 1', 'Template', 'Placeholder', 'Prompt', 'Instruction', 'Count', 'Reasoning', 'Analysis'.\n"
                f"- Do NOT explain your reasoning or show your thoughts.\n"
                f"- Do not include sentence labels (like 'Sentence 1:').\n"
                f"- Do not count words or show word counts.\n"
                f"- Do not mention the prompt or instructions.\n"
                f"- Do not include markdown, XML, JSON, or HTML formatting.\n"
                f"- Do not include headers, signatures, or notes.\n"
                f"- The very first character MUST be the first letter of the greeting.\n"
                f"- The very last character MUST be a final punctuation mark (. or !).\n"
                f"- NEVER return template text such as 'Greeting + Name', 'Romantic wish for festival', 'Closing', 'Sentence 1', or any placeholder/variable text.\n"
                f"- If you would normally output template text, instead generate a complete, personalized greeting."
            )
        else:
            # ── Standard AI Generator Mode: full personalized greeting (80-150 words) ─
            system_prompt = (
                f"You are an expert, native {lang_name} greeting message writer. "
                f"Write a complete, highly personalized, warm {tone.lower()} greeting for {recipient_name} "
                f"on the occasion of {occasion}. "
                f"Write ONLY in {lang_name}. Never mix English with non-English languages. "
                f"Rules you MUST follow:\n"
                f"- The very first character of your response MUST be the first character of the greeting.\n"
                f"- The very last character MUST be the final punctuation mark (. ! ? or an emoji).\n"
                f"- Never include reasoning, thinking, planning, word counts, language titles, "
                f"headers, quotes, or any meta-text before or after the greeting.\n"
                f"- Address the recipient directly by name: '{recipient_name}'.\n"
                f"- Length: 80 to 150 words."
            )

        logger.info(
            f"[AI_GREETING_REQUEST] recipient={recipient_name}, occasion={occasion}, "
            f"tone={tone}, language={language}, relationship={relationship}, age={age}, mode={mode}, "
            f"provider=OpenRouter, auth=API_KEY({openrouter_masked_key()}), prompt_len={len(prompt)}"
        )

        try:
            # Card mode uses tighter token budget to enforce concise output
            _max_tokens = 150 if mode == 'card' else 600
            greeting_text = openrouter_generate(
                prompt,
                system_prompt=system_prompt,
                recipient_name=recipient_name,
                temperature=0.85 if mode == 'card' else 0.9,
                top_p=0.92 if mode == 'card' else 0.95,
                max_tokens=_max_tokens,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=400)
        except AIValidationError as e:
            logger.warning(
                "[AI_GREETING_VALIDATION_FAIL] All models failed quality validation. "
                "Returning retry signal to frontend. reason=%s", e.reason
            )
            return Response(e.to_dict(), status=503)
        except RuntimeError as e:
            return Response({'error': str(e)}, status=500)

        if not greeting_text:
            logger.error("OpenRouter returned empty response")
            return Response({
                'error': 'AI service returned an empty response. Please try again.'
            }, status=500)

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
            metadata={'recipient_name': recipient_name, 'occasion': occasion}
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
            "error": str(e),
            "type": type(e).__name__,
            "trace": traceback.format_exc()
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

    wish = ScheduledWish.objects.create(
        user=request.user,
        contact=contact,
        date=wish_date,
        time=wish_time_obj,
        occasion=occasion,
        message=greeting_text,
        timezone=tz,
        reminder_minutes=reminder_minutes,
        status='Scheduled',
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
    plans = [
        {
            'id': 'FREE',
            'name': 'Free Plan',
            'price': 0,
            'features': ['10 Scheduled Wishes/mo', 'Email Delivery', 'Standard AI Generator', 'Basic Support']
        },
        {
            'id': 'PRO',
            'name': 'Pro Plan',
            'price': 9.99,
            'features': ['Unlimited Wishes', 'Email & SMS Delivery', 'Advanced AI Personalization', 'Priority Support', 'CSV Import/Export']
        },
        {
            'id': 'BUSINESS',
            'name': 'Business Plan',
            'price': 29.99,
            'features': ['All Pro features', 'WhatsApp Delivery', 'Team Access (3 seats)', 'Custom Prompt Builder', 'Automated Daily AI Beat']
        },
        {
            'id': 'ENTERPRISE',
            'name': 'Enterprise Plan',
            'price': 99.99,
            'features': ['All Business features', 'Dedicated SMTP/API', 'Custom Recurrence Rules', 'Dedicated Account Manager', 'SLA Support']
        }
    ]
    return Response({'plans': plans})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    plan_id = request.data.get('planId')
    gateway = request.data.get('gateway', 'mock') # mock, stripe, razorpay
    
    if plan_id not in ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']:
        return Response({'error': 'Invalid plan ID'}, status=400)
        
    # Simulate transaction creation
    tx = SubscriptionTransaction.objects.create(
        user=request.user,
        gateway=gateway,
        transaction_id=f"tx_{int(timezone.now().timestamp())}",
        amount=Decimal('9.99') if plan_id == 'PRO' else (Decimal('29.99') if plan_id == 'BUSINESS' else Decimal('99.99')),
        plan=plan_id,
        status='Pending'
    )
    
    # Mocking redirect session
    mock_url = f"{settings.FRONTEND_URL}/billing?session_id={tx.transaction_id}&success=true"
    return Response({
        'checkoutUrl': mock_url,
        'transactionId': tx.transaction_id,
        'message': 'Sandbox checkout session created.'
    })

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_webhook(request):
    # Webhook listener simulation
    transaction_id = request.data.get('transactionId')
    status_payment = request.data.get('status', 'Completed')
    
    try:
        tx = SubscriptionTransaction.objects.get(transaction_id=transaction_id)
        if status_payment == 'Completed':
            tx.status = 'Completed'
            tx.save()
            
            # Upgrade user profile
            profile = tx.user.profile
            profile.subscription_plan = tx.plan
            profile.save()
            
            log_activity(tx.user, 'Upgrade Plan', f"Upgraded plan to {tx.plan} via payment.", request)
            create_activity(
                user=tx.user,
                action_type='SUBSCRIPTION_UPDATED',
                title=f"Subscription upgraded to {tx.plan}",
                entity_type='subscription_transaction',
                entity_id=tx.id,
                metadata={'plan': tx.plan, 'gateway': tx.gateway, 'amount': str(tx.amount)}
            )

            # Send Notification
            Notification.objects.create(
                user=tx.user,
                title="Subscription Upgraded!",
                message=f"Thank you! Your account has been upgraded to the {tx.plan} plan successfully.",
                type='system'
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
    queryset = AuditLog.objects.all().order_by('-created_at')

# Admin: User management
class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    queryset = User.objects.all().order_by('-date_joined')
    
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
        """Server-side export: returns the preview image file."""
        card = self.get_object()
        fmt = request.query_params.get('format', 'png').lower()
        if card.preview_image:
            with card.preview_image.open('rb') as f:
                data = f.read()
            content_type = 'image/png' if fmt == 'png' else 'image/jpeg'
            resp = HttpResponse(data, content_type=content_type)
            resp['Content-Disposition'] = f'attachment; filename="{card.title}.{fmt}"'
            return resp
        return Response({'error': 'No preview image generated yet.'}, status=404)

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




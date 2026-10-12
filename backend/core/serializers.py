from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    UserProfile, Contact, Event, GreetingTemplate, ScheduledWish,
    EmailLog, GeneratedGreeting, AIPrompt, Notification,
    SubscriptionTransaction, AuditLog, ActivityLog,
    GreetingCardTemplate, GreetingCard, GreetingCardFavorite, SentGreetingCard
)

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'phone', 'country', 'timezone', 'preferred_language',
            'avatar', 'subscription_plan', 'role', 'email_verified',
            'created_at', 'last_login_at'
        ]
        read_only_fields = ['subscription_plan', 'role', 'email_verified', 'created_at', 'last_login_at']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'display_name', 'is_staff', 'is_superuser', 'profile'
        ]
        read_only_fields = ['is_staff', 'is_superuser']

    def get_full_name(self, obj):
        name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return name or obj.username

    def get_display_name(self, obj):
        return self.get_full_name(obj)

class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    timezone = serializers.CharField(max_length=100, required=False)
    preferred_language = serializers.CharField(max_length=10, required=False)

    def validate_first_name(self, value):
        return value.strip() if value else ''

    def validate_last_name(self, value):
        return value.strip() if value else ''

    def validate_username(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Username cannot be empty.")
        return value.strip()

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class GreetingTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GreetingTemplate
        fields = '__all__'
        read_only_fields = ['user']

class ScheduledWishSerializer(serializers.ModelSerializer):
    contact = serializers.PrimaryKeyRelatedField(queryset=Contact.objects.all())
    greeting_card = serializers.PrimaryKeyRelatedField(queryset=GreetingCard.objects.all(), required=False, allow_null=True)

    class Meta:
        model = ScheduledWish
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        if isinstance(data, dict):
            if data.get('greeting_card') == '' or data.get('greeting_card') == 'null':
                data['greeting_card'] = None
            if data.get('contact') == '':
                data['contact'] = None
            if data.get('reminder_minutes') == '':
                data['reminder_minutes'] = 15
        return super().to_internal_value(data)

    def validate_contact(self, value):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if value.user != request.user:
                raise serializers.ValidationError("You cannot schedule wishes for another user's contacts.")
        return value

    def validate_greeting_card(self, value):
        if value:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                if value.user != request.user:
                    raise serializers.ValidationError("Greeting card does not belong to you.")
        return value

    def validate(self, attrs):
        wish_date = attrs.get('date', getattr(self.instance, 'date', None))
        wish_time = attrs.get('time', getattr(self.instance, 'time', None))
        tz_name = attrs.get('timezone', getattr(self.instance, 'timezone', 'Asia/Kolkata')) or 'Asia/Kolkata'

        if not wish_date:
            raise serializers.ValidationError({"date": "Scheduled date is required."})
        if not wish_time:
            from datetime import time as dt_time
            wish_time = dt_time(9, 0)
            attrs['time'] = wish_time

        # Validate future only for new wishes or when date/time is modified
        if self.instance is None or 'date' in attrs or 'time' in attrs:
            import pytz
            from datetime import datetime as dt_cls
            naive_dt = dt_cls.combine(wish_date, wish_time)
            try:
                tz = pytz.timezone(tz_name)
                aware_dt = tz.localize(naive_dt)
            except Exception:
                tz = pytz.timezone('Asia/Kolkata')
                aware_dt = tz.localize(naive_dt)

            if aware_dt <= timezone.localtime(timezone.now(), tz):
                raise serializers.ValidationError({"date": "Scheduled date and time must be in the future."})

        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.contact:
            birthday = instance.contact.birthday
            age = None
            if birthday:
                try:
                    from datetime import datetime
                    bd = datetime.strptime(birthday, '%Y-%m-%d')
                    today = datetime.now()
                    age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
                except Exception:
                    pass
            rep['contact'] = {
                'id': instance.contact.id,
                'name': instance.contact.name,
                'email': instance.contact.email,
                'phone': instance.contact.phone,
                'relationship': instance.contact.relationship,
                'birthday': instance.contact.birthday,
                'anniversary': instance.contact.anniversary,
                'group': instance.contact.group,
                'tags': instance.contact.tags,
                'notes': instance.contact.notes,
                'age': age,
            }
        else:
            rep['contact'] = None

        if instance.time:
            rep['time'] = instance.time.strftime('%H:%M')

        # Embed greeting card info
        if instance.greeting_card_id:
            card = instance.greeting_card
            rep['greeting_card_info'] = {
                'id': card.id,
                'title': card.title,
                'occasion': card.occasion,
                'preview_image': card.preview_image.url if card.preview_image else None,
            }
        else:
            rep['greeting_card_info'] = None

        return rep

class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class GeneratedGreetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedGreeting
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class AIPromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIPrompt
        fields = '__all__'

class AIGenerateRequestSerializer(serializers.Serializer):
    contact_id = serializers.IntegerField(required=False, allow_null=True)
    recipient_name = serializers.CharField(required=False, allow_blank=True, default='Friend')
    occasion = serializers.CharField(required=False, allow_blank=True, default='Birthday')
    tone = serializers.CharField(required=False, allow_blank=True, default='Friendly')
    language = serializers.CharField(required=False, allow_blank=True, default='en')
    relationship = serializers.CharField(required=False, allow_blank=True, default='Friend')
    age = serializers.IntegerField(required=False, allow_null=True)
    interests = serializers.ListField(child=serializers.CharField(allow_blank=True), required=False, default=list)
    custom_context = serializers.CharField(required=False, allow_blank=True, default='')
    # 'card' = compact greeting card mode (35-60 words), 'standard' = full AI generator mode (80-150 words)
    mode = serializers.ChoiceField(choices=['card', 'standard'], required=False, default='standard')
    force_regenerate = serializers.BooleanField(required=False, default=False)
    use_cache = serializers.BooleanField(required=False, default=True)


class NotificationSerializer(serializers.ModelSerializer):
    related_user_id = serializers.IntegerField(source='related_user.id', read_only=True)
    related_username = serializers.CharField(source='related_user.username', read_only=True)
    related_user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

    def get_related_user_display_name(self, obj):
        if not obj.related_user:
            return None
        full = f"{obj.related_user.first_name or ''} {obj.related_user.last_name or ''}".strip()
        return full or obj.related_user.username

class SubscriptionTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTransaction
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at', 'transaction_id', 'amount', 'currency', 'plan', 'status']

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'username', 'display_name', 'actor_name',
            'action', 'event_type', 'previous_name', 'updated_name',
            'details', 'ip_address', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_display_name(self, obj):
        if obj.actor_name:
            return obj.actor_name
        if obj.user:
            full = f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip()
            return full or obj.user.username
        return 'System'

    def get_username(self, obj):
        return self.get_display_name(obj)


# ─────────────────────────────────────────────────────────────────────────────
# Greeting Card Serializers
# ─────────────────────────────────────────────────────────────────────────────

class GreetingCardTemplateSerializer(serializers.ModelSerializer):
    """Read + write serializer for the template library (single source of truth)."""
    preview_image_url = serializers.SerializerMethodField()
    thumbnail_image_url = serializers.SerializerMethodField()
    background_image_url = serializers.SerializerMethodField()
    premium = serializers.BooleanField(source='is_premium', read_only=True)
    featured = serializers.BooleanField(source='is_featured', read_only=True)

    class Meta:
        model = GreetingCardTemplate
        fields = [
            'id', 'title', 'slug', 'occasion', 'category', 'description',
            'preview_image', 'preview_image_url',
            'thumbnail_image', 'thumbnail_image_url',
            'background_image', 'background_image_url',
            'primary_color', 'secondary_color', 'accent_color', 'text_color',
            'background_color', 'font_family', 'font_size', 'layout_type',
            'card_width', 'card_height', 'elements_json',
            'premium', 'featured', 'is_active', 'is_premium', 'is_featured',
            'sort_order', 'tags', 'metadata', 'created_at', 'updated_at',
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at', 'premium', 'featured']

    def get_preview_image_url(self, obj):
        request = self.context.get('request')
        if obj.preview_image and request:
            return request.build_absolute_uri(obj.preview_image.url)
        return None

    def get_thumbnail_image_url(self, obj):
        request = self.context.get('request')
        if obj.thumbnail_image and request:
            return request.build_absolute_uri(obj.thumbnail_image.url)
        return None

    def get_background_image_url(self, obj):
        request = self.context.get('request')
        if obj.background_image and request:
            return request.build_absolute_uri(obj.background_image.url)
        return None


class GreetingCardListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    preview_image_url = serializers.SerializerMethodField()

    class Meta:
        model = GreetingCard
        fields = [
            'id', 'title', 'occasion', 'card_size', 'status',
            'is_favorite', 'preview_image_url',
            'recipient_name', 'created_at', 'updated_at'
        ]

    def get_preview_image_url(self, obj):
        request = self.context.get('request')
        if obj.preview_image and request:
            return request.build_absolute_uri(obj.preview_image.url)
        return None


class GreetingCardSerializer(serializers.ModelSerializer):
    preview_image_url = serializers.SerializerMethodField()
    background_image_url = serializers.SerializerMethodField()
    uploaded_photo_url = serializers.SerializerMethodField()
    template_info = serializers.SerializerMethodField()
    contact_info = serializers.SerializerMethodField()

    class Meta:
        model = GreetingCard
        fields = [
            'id', 'user', 'template', 'template_info',
            'title', 'occasion', 'contact', 'contact_info', 'recipient_name',
            'heading', 'message', 'footer', 'signature',
            'card_size', 'card_theme', 'card_width', 'card_height',
            'background_color', 'background_image', 'background_image_url',
            'background_blur', 'background_opacity', 'border_radius', 'shadow',
            'font_family', 'font_size', 'font_color', 'text_style',
            'uploaded_photo', 'uploaded_photo_url',
            'elements_json',
            'preview_image', 'preview_image_url',
            'status', 'is_favorite',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_preview_image_url(self, obj):
        request = self.context.get('request')
        if obj.preview_image and request:
            return request.build_absolute_uri(obj.preview_image.url)
        return None

    def get_background_image_url(self, obj):
        request = self.context.get('request')
        if obj.background_image and request:
            return request.build_absolute_uri(obj.background_image.url)
        return None

    def get_uploaded_photo_url(self, obj):
        request = self.context.get('request')
        if obj.uploaded_photo and request:
            return request.build_absolute_uri(obj.uploaded_photo.url)
        return None

    def get_template_info(self, obj):
        if obj.template:
            return {'id': obj.template.id, 'title': obj.template.title, 'category': obj.template.category}
        return None
        
    def get_contact_info(self, obj):
        if obj.contact:
            return {
                'id': obj.contact.id,
                'name': obj.contact.name,
                'email': obj.contact.email,
                'phone': obj.contact.phone,
                'relationship': obj.contact.relationship,
                'birthday': obj.contact.birthday,
                'anniversary': obj.contact.anniversary,
                'group': obj.contact.group,
                'tags': obj.contact.tags,
                'notes': obj.contact.notes
            }
        return None


class GreetingCardFavoriteSerializer(serializers.ModelSerializer):
    card = GreetingCardListSerializer(read_only=True)

    class Meta:
        model = GreetingCardFavorite
        fields = ['id', 'user', 'card', 'created_at']
        read_only_fields = ['user', 'created_at']

class ActivityLogSerializer(serializers.ModelSerializer):
    relative_time = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'action_type', 'title', 'description', 
            'entity_type', 'entity_id', 'metadata', 
            'created_at', 'relative_time'
        ]
        read_only_fields = ['created_at', 'relative_time']

    def get_relative_time(self, obj):
        from django.utils import timezone
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days == 0:
            if diff.seconds < 60:
                return 'just now'
            elif diff.seconds < 3600:
                minutes = diff.seconds // 60
                return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            else:
                hours = diff.seconds // 3600
                return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.days == 1:
            return 'Yesterday'
        elif diff.days < 7:
            return f"{diff.days} days ago"
        elif diff.days < 30:
            weeks = diff.days // 7
            return f"{weeks} week{'s' if weeks > 1 else ''} ago"
        else:
            months = diff.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class VerifyResetOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_otp(self, value):
        val = str(value).strip()
        if not val.isdigit() or len(val) != 6:
            raise serializers.ValidationError("Verification code must be exactly 6 digits.")
        return val


class ResetPasswordSubmitSerializer(serializers.Serializer):
    reset_token = serializers.CharField(required=True, min_length=16, max_length=128)
    password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        if confirm_password and password != confirm_password:
            raise serializers.ValidationError({'confirm_password': "Passwords do not match."})
        return attrs


from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    UserProfile, Contact, Event, GreetingTemplate, WishTemplate, ScheduledWish,
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

class WishTemplateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(source='message', read_only=True)
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = WishTemplate
        fields = [
            'id', 'name', 'message', 'content', 'occasion', 'tone',
            'language', 'status', 'is_published', 'is_favorite',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'name', 'message', 'content', 'occasion', 'tone',
            'language', 'status', 'is_published', 'is_favorite',
            'created_at', 'updated_at'
        ]

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.favorite_users.filter(id=request.user.id).exists()
        return False

class AdminWishTemplateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(source='message', required=False)
    created_by_name = serializers.SerializerMethodField()
    favorites_count = serializers.SerializerMethodField()

    class Meta:
        model = WishTemplate
        fields = [
            'id', 'name', 'message', 'content', 'occasion', 'tone',
            'language', 'status', 'is_published', 'created_by',
            'created_by_name', 'favorites_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'favorites_count', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        if isinstance(data, dict):
            if 'content' in data and not data.get('message'):
                data['message'] = data['content']
        return super().to_internal_value(data)

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'System'

    def get_favorites_count(self, obj):
        return obj.favorite_users.count()

    def validate_name(self, value):
        stripped = value.strip()
        if len(stripped) < 2:
            raise serializers.ValidationError("Template name must be at least 2 characters long.")
        if len(stripped) > 150:
            raise serializers.ValidationError("Template name cannot exceed 150 characters.")
        return stripped

    def validate_message(self, value):
        stripped = value.strip()
        if len(stripped) < 5:
            raise serializers.ValidationError("Template message must be at least 5 characters long.")
        if len(stripped) > 2500:
            raise serializers.ValidationError("Template message cannot exceed 2500 characters.")
        return stripped

    def validate_occasion(self, value):
        valid = [c[0] for c in WishTemplate.OCCASION_CHOICES]
        for v in valid:
            if v.lower() == value.strip().lower():
                return v
        return value.strip()

    def validate_tone(self, value):
        valid = [c[0] for c in WishTemplate.TONE_CHOICES]
        for v in valid:
            if v.lower() == value.strip().lower():
                return v
        return value.strip()

    def validate_status(self, value):
        val = value.strip().lower()
        if val not in ['draft', 'published', 'archived']:
            raise serializers.ValidationError("Status must be 'draft', 'published', or 'archived'.")
        return val

    def validate(self, attrs):
        if not attrs.get('message') and attrs.get('content'):
            attrs['message'] = attrs['content']
        if not attrs.get('message'):
            raise serializers.ValidationError({'message': 'Template message is required.'})
        return attrs



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
            user = request.user if request and hasattr(request, 'user') and request.user.is_authenticated else getattr(self.instance, 'user', None)
            if user:
                from services.subscription_service import user_can_attach_greeting_cards
                if not user_can_attach_greeting_cards(user):
                    raise serializers.ValidationError("Attaching greeting cards to scheduled wishes is a premium feature. Please upgrade your plan.")
                if value.user_id != user.id:
                    raise serializers.ValidationError("Greeting card does not belong to you.")
                if value.status != 'published':
                    raise serializers.ValidationError("Only published greeting cards can be attached to scheduled wishes.")
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
        if obj.preview_image:
            if request:
                return request.build_absolute_uri(obj.preview_image.url)
            return obj.preview_image.url
        return None

    def get_thumbnail_image_url(self, obj):
        request = self.context.get('request')
        if obj.thumbnail_image:
            if request:
                return request.build_absolute_uri(obj.thumbnail_image.url)
            return obj.thumbnail_image.url
        return None

    def get_background_image_url(self, obj):
        request = self.context.get('request')
        if obj.background_image:
            if request:
                return request.build_absolute_uri(obj.background_image.url)
            return obj.background_image.url
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
        if not obj.preview_image:
            try:
                from core.card_generator import generate_card_preview
                generate_card_preview(obj, save=True)
                obj.refresh_from_db()
            except Exception:
                pass
        if obj.preview_image:
            if request:
                return request.build_absolute_uri(obj.preview_image.url)
            return obj.preview_image.url
        return None


class GreetingCardSerializer(serializers.ModelSerializer):
    personal_message = serializers.CharField(source='message', required=False, allow_blank=True)
    text_color = serializers.CharField(source='font_color', required=False, allow_blank=True)
    preview_image_url = serializers.SerializerMethodField()
    background_image_url = serializers.SerializerMethodField()
    uploaded_photo_url = serializers.SerializerMethodField()
    recipient_photo = serializers.SerializerMethodField()
    template_info = serializers.SerializerMethodField()
    contact_info = serializers.SerializerMethodField()
    emoji = serializers.SerializerMethodField()
    sticker = serializers.SerializerMethodField()
    background_gradient = serializers.SerializerMethodField()
    background_pattern = serializers.SerializerMethodField()
    decor = serializers.SerializerMethodField()
    accent_color = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()

    class Meta:
        model = GreetingCard
        fields = [
            'id', 'user', 'template', 'template_info',
            'title', 'occasion', 'contact', 'contact_info', 'recipient_name',
            'heading', 'message', 'personal_message', 'footer', 'signature',
            'card_size', 'card_theme', 'card_width', 'card_height',
            'background_color', 'background_image', 'background_image_url',
            'background_blur', 'background_opacity', 'border_radius', 'shadow',
            'font_family', 'font_size', 'font_color', 'text_color', 'text_style',
            'uploaded_photo', 'uploaded_photo_url', 'recipient_photo',
            'emoji', 'sticker', 'background_gradient', 'background_pattern',
            'decor', 'accent_color', 'subtitle',
            'elements_json',
            'preview_image', 'preview_image_url',
            'status', 'is_favorite',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        import json
        if hasattr(data, 'copy'):
            data_dict = data.copy()
        elif isinstance(data, dict):
            data_dict = dict(data)
        else:
            data_dict = {}

        # Capture custom decorative/style fields that persist in text_style JSONField
        custom_styles = {}
        for key in ['emoji', 'sticker', 'background_gradient', 'background_pattern', 'decor', 'accent_color', 'subtitle']:
            if key in data_dict:
                val = data_dict[key]
                if isinstance(val, list):
                    val = val[0] if val else ''
                custom_styles[key] = str(val) if val is not None else ''

        # Normalize card_theme and resolve aliases before ChoiceField validation
        if 'card_theme' in data_dict:
            raw_theme = data_dict['card_theme']
            if isinstance(raw_theme, list):
                raw_theme = raw_theme[0] if raw_theme else ''
            from core.theme_config import normalize_card_theme
            data_dict['card_theme'] = normalize_card_theme(raw_theme)

        # Map text_color <-> font_color
        if 'text_color' in data_dict and ('font_color' not in data_dict or not data_dict['font_color']):
            data_dict['font_color'] = data_dict['text_color']

        # Map personal_message <-> message
        if 'personal_message' in data_dict and ('message' not in data_dict or not data_dict['message']):
            data_dict['message'] = data_dict['personal_message']
        elif 'message' in data_dict and ('personal_message' not in data_dict or not data_dict['personal_message']):
            data_dict['personal_message'] = data_dict['message']

        # Map recipient_photo alias for uploaded_photo
        if 'recipient_photo' in data_dict and ('uploaded_photo' not in data_dict or not data_dict['uploaded_photo']):
            data_dict['uploaded_photo'] = data_dict['recipient_photo']

        # Map background_image_url alias for background_image
        if 'background_image_url' in data_dict and ('background_image' not in data_dict or not data_dict['background_image']):
            data_dict['background_image'] = data_dict['background_image_url']

        # Handle existing URL or storage string paths for background_image (ImageField expects UploadedFile)
        string_bg = None
        if 'background_image' in data_dict and isinstance(data_dict['background_image'], str):
            string_bg = data_dict.pop('background_image')
            if isinstance(string_bg, list):
                string_bg = string_bg[0] if string_bg else None

        string_photo = None
        if 'uploaded_photo' in data_dict and isinstance(data_dict['uploaded_photo'], str):
            string_photo = data_dict.pop('uploaded_photo')
            if isinstance(string_photo, list):
                string_photo = string_photo[0] if string_photo else None

        ret = super().to_internal_value(data_dict)

        # Merge custom styles into text_style dictionary
        current_text_style = ret.get('text_style') or {}
        if isinstance(current_text_style, str):
            try:
                current_text_style = json.loads(current_text_style)
            except Exception:
                current_text_style = {}
        elif not isinstance(current_text_style, dict):
            current_text_style = {}
        current_text_style.update(custom_styles)
        ret['text_style'] = current_text_style

        self._string_bg = string_bg
        self._string_photo = string_photo

        return ret

    def _apply_string_images(self, instance):
        from urllib.parse import urlparse
        if hasattr(self, '_string_bg') and self._string_bg is not None:
            val = str(self._string_bg).strip()
            if not val or val == 'null' or val == 'undefined':
                instance.background_image = None
            elif '/media/' in val:
                parsed = urlparse(val)
                path = parsed.path if parsed.path else val
                rel_path = path.split('/media/', 1)[1]
                instance.background_image.name = rel_path
            elif val.startswith('greeting_cards/') or val.startswith('greeting_templates/'):
                instance.background_image.name = val

        if hasattr(self, '_string_photo') and self._string_photo is not None:
            val = str(self._string_photo).strip()
            if not val or val == 'null' or val == 'undefined':
                instance.uploaded_photo = None
            elif '/media/' in val:
                parsed = urlparse(val)
                path = parsed.path if parsed.path else val
                rel_path = path.split('/media/', 1)[1]
                instance.uploaded_photo.name = rel_path
            elif val.startswith('greeting_cards/') or val.startswith('greeting_templates/'):
                instance.uploaded_photo.name = val

    def validate_card_theme(self, value):
        from core.theme_config import normalize_card_theme, is_valid_card_theme, get_supported_theme_keys
        normalized = normalize_card_theme(value)
        if not is_valid_card_theme(normalized):
            supported = ", ".join(get_supported_theme_keys())
            raise serializers.ValidationError(
                f"'{value}' is not a valid choice. Supported themes: {supported}."
            )
        return normalized

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._apply_string_images(instance)
        instance.save()
        if not instance.preview_image:
            try:
                from core.card_generator import generate_card_preview
                generate_card_preview(instance, save=True)
                instance.refresh_from_db()
            except Exception:
                pass
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._apply_string_images(instance)
        instance.save()
        try:
            from core.card_generator import generate_card_preview
            generate_card_preview(instance, save=True)
            instance.refresh_from_db()
        except Exception:
            pass
        return instance

    def get_preview_image_url(self, obj):
        request = self.context.get('request')
        if not obj.preview_image:
            try:
                from core.card_generator import generate_card_preview
                generate_card_preview(obj, save=True)
                obj.refresh_from_db()
            except Exception:
                pass
        if obj.preview_image:
            if request:
                try:
                    return request.build_absolute_uri(obj.preview_image.url)
                except Exception:
                    return obj.preview_image.url
            return obj.preview_image.url
        return None

    def get_background_image_url(self, obj):
        request = self.context.get('request')
        if obj.background_image:
            if request:
                try:
                    return request.build_absolute_uri(obj.background_image.url)
                except Exception:
                    return obj.background_image.url
            return obj.background_image.url
        return None

    def get_uploaded_photo_url(self, obj):
        request = self.context.get('request')
        if obj.uploaded_photo:
            if request:
                try:
                    return request.build_absolute_uri(obj.uploaded_photo.url)
                except Exception:
                    return obj.uploaded_photo.url
            return obj.uploaded_photo.url
        return None

    def get_recipient_photo(self, obj):
        return self.get_uploaded_photo_url(obj)

    def get_emoji(self, obj):
        if isinstance(obj.text_style, dict):
            return obj.text_style.get('emoji', '✨')
        return '✨'

    def get_sticker(self, obj):
        if isinstance(obj.text_style, dict):
            return obj.text_style.get('sticker', '')
        return ''

    def get_background_gradient(self, obj):
        if isinstance(obj.text_style, dict):
            return obj.text_style.get('background_gradient', '')
        return ''

    def get_background_pattern(self, obj):
        if isinstance(obj.text_style, dict):
            return obj.text_style.get('background_pattern', '')
        return ''

    def get_decor(self, obj):
        if isinstance(obj.text_style, dict) and obj.text_style.get('decor'):
            return obj.text_style.get('decor')
        if obj.template and isinstance(obj.template.metadata, dict):
            return obj.template.metadata.get('decor', '')
        return ''

    def get_accent_color(self, obj):
        if isinstance(obj.text_style, dict) and obj.text_style.get('accent_color'):
            return obj.text_style.get('accent_color')
        if obj.template and obj.template.accent_color:
            return obj.template.accent_color
        return ''

    def get_subtitle(self, obj):
        if isinstance(obj.text_style, dict):
            return obj.text_style.get('subtitle', '')
        return ''

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


from rest_framework import serializers
from django.contrib.auth.models import User
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

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']

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

    class Meta:
        model = ScheduledWish
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']

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


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class SubscriptionTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTransaction
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'username', 'action', 'details', 'ip_address', 'created_at']
        read_only_fields = ['created_at']


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

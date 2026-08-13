from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db import models as db_models

from .models import (
    UserProfile, Contact, Event, GreetingTemplate, ScheduledWish,
    EmailLog, GeneratedGreeting, AIPrompt, Notification,
    SubscriptionTransaction, AuditLog, GreetingCardTemplate
)


# ─── Inline: UserProfile inside User ──────────────────────────────────────────
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = (
        'phone', 'country', 'timezone', 'preferred_language',
        'avatar', 'subscription_plan', 'role', 'email_verified',
    )


class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_role', 'get_plan')
    list_select_related = ('profile',)

    def get_role(self, obj):
        return getattr(obj, 'profile', None) and obj.profile.role or '—'
    get_role.short_description = 'Role'

    def get_plan(self, obj):
        return getattr(obj, 'profile', None) and obj.profile.subscription_plan or '—'
    get_plan.short_description = 'Plan'


# Re-register User with extended admin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# ─── Contact ──────────────────────────────────────────────────────────────────
@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'relationship', 'group', 'is_favorite', 'created_at')
    list_filter = ('relationship', 'group', 'is_favorite')
    search_fields = ('name', 'email', 'phone')
    ordering = ('-created_at',)


# ─── Event ────────────────────────────────────────────────────────────────────
@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'date', 'recipient', 'status', 'recurring', 'user')
    list_filter = ('type', 'status', 'recurring')
    search_fields = ('title', 'recipient')
    ordering = ('date',)


# ─── Greeting Template ────────────────────────────────────────────────────────
@admin.register(GreetingTemplate)
class GreetingTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'occasion', 'tone', 'is_favorite', 'user')
    list_filter = ('occasion', 'tone', 'is_favorite')
    search_fields = ('name', 'content')


# ─── Scheduled Wish ───────────────────────────────────────────────────────────
@admin.register(ScheduledWish)
class ScheduledWishAdmin(admin.ModelAdmin):
    list_display = ('contact', 'occasion', 'date', 'time', 'status', 'timezone', 'user', 'created_at', 'updated_at')
    list_filter = ('status', 'occasion')
    search_fields = ('contact__name', 'contact__email', 'occasion')
    autocomplete_fields = ('contact',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('date', 'time')


# ─── Email Log ────────────────────────────────────────────────────────────────
@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'subject', 'status', 'delivery', 'date', 'user')
    list_filter = ('status', 'delivery')
    search_fields = ('recipient', 'subject')
    ordering = ('-created_at',)


# ─── Generated Greeting ───────────────────────────────────────────────────────
@admin.register(GeneratedGreeting)
class GeneratedGreetingAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'occasion', 'tone', 'is_favorite', 'created_at', 'user')
    list_filter = ('occasion', 'tone', 'is_favorite')
    search_fields = ('recipient', 'content')
    ordering = ('-created_at',)


# ─── AI Prompt ────────────────────────────────────────────────────────────────
@admin.register(AIPrompt)
class AIPromptAdmin(admin.ModelAdmin):
    list_display = ('name', 'occasion', 'tone', 'is_active', 'created_at')
    list_filter = ('occasion', 'tone', 'is_active')
    search_fields = ('name', 'prompt_template')


# ─── Notification ─────────────────────────────────────────────────────────────
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'type', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
    search_fields = ('title', 'message', 'user__username')
    ordering = ('-created_at',)


# ─── Subscription Transaction ────────────────────────────────────────────────
@admin.register(SubscriptionTransaction)
class SubscriptionTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'amount', 'gateway', 'status', 'transaction_id', 'created_at')
    list_filter = ('plan', 'gateway', 'status')
    search_fields = ('user__username', 'transaction_id')
    ordering = ('-created_at',)


# ─── Audit Log ─────────────────────────────────────────────────────────────
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'ip_address', 'created_at')
    list_filter = ('action',)
    search_fields = ('user__username', 'action', 'details')
    ordering = ('-created_at',)
    readonly_fields = ('user', 'action', 'details', 'ip_address', 'created_at')


# ─── Greeting Card Template ───────────────────────────────────────────────────
class GreetingCardTemplateAdmin(admin.ModelAdmin):
    """Professional admin for managing the single-source-of-truth template library."""
    list_display = (
        'preview_thumb', 'title', 'occasion', 'category',
        'is_premium', 'is_featured', 'is_active', 'sort_order', 'updated_at',
    )
    list_display_links = ('title',)
    list_filter = ('occasion', 'category', 'is_premium', 'is_featured', 'is_active')
    search_fields = ('title', 'slug', 'description', 'tags')
    list_editable = ('sort_order', 'is_active', 'is_featured', 'is_premium')
    list_per_page = 25
    ordering = ('sort_order', '-created_at')
    readonly_fields = ('created_at', 'updated_at', 'preview_image_preview', 'thumbnail_image_preview', 'background_image_preview')

    fieldsets = (
        ('Identity', {
            'fields': ('title', 'slug', 'occasion', 'category', 'description'),
        }),
        ('Imagery', {
            'fields': (
                'preview_image', 'preview_image_preview',
                'thumbnail_image', 'thumbnail_image_preview',
                'background_image', 'background_image_preview',
            ),
        }),
        ('Design Tokens', {
            'fields': (
                ('primary_color', 'secondary_color', 'accent_color', 'text_color'),
                'background_color', 'font_family', 'font_size', 'layout_type',
            ),
        }),
        ('Card Geometry', {
            'fields': (('card_width', 'card_height'), 'elements_json'),
        }),
        ('Flags & Status', {
            'fields': (('is_premium', 'is_featured', 'is_active'), 'sort_order'),
        }),
        ('Extensibility', {
            'fields': ('tags', 'metadata'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': (('created_at', 'updated_at')),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Preview')
    def preview_thumb(self, obj):
        from django.utils.html import format_html
        if obj.thumbnail_image:
            return format_html(
                '<img src="{}" style="max-height:48px;border-radius:6px;" />',
                obj.thumbnail_image.url,
            )
        if obj.preview_image:
            return format_html(
                '<img src="{}" style="max-height:48px;border-radius:6px;" />',
                obj.preview_image.url,
            )
        return format_html('<span style="color:#888;">—</span>')

    @admin.display(description='Preview Image')
    def preview_image_preview(self, obj):
        from django.utils.html import format_html
        if obj.preview_image:
            return format_html(
                '<img src="{}" style="max-height:200px;border-radius:8px;" />',
                obj.preview_image.url,
            )
        return '—'

    @admin.display(description='Thumbnail Image')
    def thumbnail_image_preview(self, obj):
        from django.utils.html import format_html
        if obj.thumbnail_image:
            return format_html(
                '<img src="{}" style="max-height:200px;border-radius:8px;" />',
                obj.thumbnail_image.url,
            )
        return '—'

    @admin.display(description='Background Image')
    def background_image_preview(self, obj):
        from django.utils.html import format_html
        if obj.background_image:
            return format_html(
                '<img src="{}" style="max-height:200px;border-radius:8px;" />',
                obj.background_image.url,
            )
        return '—'

    # ── Bulk actions ──────────────────────────────────────────────
    @admin.action(description='Publish selected templates')
    def make_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} template(s) published.')

    @admin.action(description='Unpublish selected templates')
    def make_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} template(s) unpublished.')

    @admin.action(description='Feature selected templates')
    def make_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} template(s) marked as featured.')

    @admin.action(description='Remove featured flag')
    def make_unfeatured(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'{updated} template(s) un-featured.')

    @admin.action(description='Mark selected as Premium')
    def make_premium(self, request, queryset):
        updated = queryset.update(is_premium=True)
        self.message_user(request, f'{updated} template(s) marked premium.')

    @admin.action(description='Remove Premium flag')
    def make_non_premium(self, request, queryset):
        updated = queryset.update(is_premium=False)
        self.message_user(request, f'{updated} template(s) set to free.')

    actions = [
        'make_active', 'make_inactive',
        'make_featured', 'make_unfeatured',
        'make_premium', 'make_non_premium',
    ]


admin.site.register(GreetingCardTemplate, GreetingCardTemplateAdmin)

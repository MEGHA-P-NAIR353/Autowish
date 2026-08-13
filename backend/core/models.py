from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

class UserProfile(models.Model):
    PLAN_CHOICES = [
        ('FREE', 'Free'),
        ('PRO', 'Pro'),
        ('BUSINESS', 'Business'),
        ('ENTERPRISE', 'Enterprise')
    ]
    
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('premium', 'Premium User'),
        ('free', 'Free User')
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    timezone = models.CharField(max_length=100, default='Asia/Kolkata')
    preferred_language = models.CharField(max_length=10, default='en')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    subscription_plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='FREE')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='free')
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        role = 'free'
        plan = 'FREE'
        if instance.is_superuser:
            role = 'super_admin'
            plan = 'ENTERPRISE'
        elif instance.is_staff:
            role = 'admin'
            plan = 'BUSINESS'
        UserProfile.objects.create(user=instance, role=role, subscription_plan=plan)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class Contact(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    birthday = models.CharField(max_length=30, blank=True, null=True)
    anniversary = models.CharField(max_length=30, blank=True, null=True)
    relationship = models.CharField(max_length=50, default='Friend')
    group = models.CharField(max_length=50, blank=True, null=True, default='General')
    is_favorite = models.BooleanField(default=False)
    tags = models.CharField(max_length=200, blank=True, null=True) # comma-separated
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Event(models.Model):
    EVENT_TYPES = [
        ('Birthday', 'Birthday'),
        ('Anniversary', 'Anniversary'),
        ('Holiday', 'Holiday'),
        ('Festival', 'Festival'),
        ('Custom', 'Custom'),
    ]
    
    RECURRING_CHOICES = [
        ('once', 'Once'),
        ('yearly', 'Yearly'),
        ('monthly', 'Monthly')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=150)
    type = models.CharField(max_length=30, choices=EVENT_TYPES)
    date = models.DateField()
    recipient = models.CharField(max_length=100)
    status = models.CharField(max_length=20, default='Upcoming')
    recurring = models.BooleanField(default=False)
    recurring_type = models.CharField(max_length=20, choices=RECURRING_CHOICES, default='yearly')
    reminder_days = models.IntegerField(default=0) # days before event to trigger reminder
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class GreetingTemplate(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=120)
    occasion = models.CharField(max_length=50)
    tone = models.CharField(max_length=30)
    content = models.TextField()
    is_favorite = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class ScheduledWish(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Sent', 'Sent'),
        ('Pending', 'Pending'),
        ('Processing', 'Processing'),
        ('Failed', 'Failed'),
        ('Cancelled', 'Cancelled'),
    ]

    OCCASION_CHOICES = [
        ('Birthday', 'Birthday'),
        ('Anniversary', 'Anniversary'),
        ('Festival', 'Festival'),
        ('Holiday', 'Holiday'),
        ('Custom', 'Custom'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scheduled_wishes_by_user", verbose_name="User")
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="scheduled_wishes",
        verbose_name="Contact"
    )
    date = models.DateField(verbose_name="Date")
    time = models.TimeField(verbose_name="Time")
    occasion = models.CharField(max_length=50, choices=OCCASION_CHOICES, default='Birthday', verbose_name="Occasion")
    template = models.CharField(max_length=100, blank=True, verbose_name="Template")
    message = models.TextField(blank=True, verbose_name="Message")
    timezone = models.CharField(max_length=50, default='Asia/Kolkata', verbose_name="Timezone")
    reminder_minutes = models.IntegerField(default=15, verbose_name="Reminder Minutes")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled', verbose_name="Status")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    # Enterprise-grade additional fields
    task_id = models.CharField(max_length=255, blank=True, null=True, verbose_name="Celery Task ID")
    last_error = models.TextField(blank=True, null=True, verbose_name="Last Error")
    retry_count = models.IntegerField(default=0, verbose_name="Retry Count")
    sent_at = models.DateTimeField(blank=True, null=True, verbose_name="Sent At")
    opened_at = models.DateTimeField(blank=True, null=True, verbose_name="Opened At")
    cancelled_at = models.DateTimeField(blank=True, null=True, verbose_name="Cancelled At")
    delivery_status = models.CharField(max_length=50, blank=True, null=True, verbose_name="Delivery Status")
    email_subject = models.CharField(max_length=255, blank=True, null=True, verbose_name="Email Subject")
    language = models.CharField(max_length=10, default='en', verbose_name="Language")
    tone = models.CharField(max_length=50, default='Friendly', verbose_name="Tone")
    notification_type = models.CharField(max_length=20, default='Email', verbose_name="Notification Type") # Email, SMS, Push
    is_ai_generated = models.BooleanField(default=True, verbose_name="Is AI Generated")
    greeting_card = models.ForeignKey(
        'GreetingCard',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_wishes',
        verbose_name="Greeting Card"
    )

    class Meta:
        ordering = ['date', 'time']
        indexes = [
            models.Index(fields=['contact']),
            models.Index(fields=['status']),
            models.Index(fields=['date']),
            models.Index(fields=['time']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = "Scheduled Wish"
        verbose_name_plural = "Scheduled Wishes"

    def __str__(self):
        return f"{self.contact.name} - {self.occasion} on {self.date}"

class EmailLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    recipient = models.EmailField()
    subject = models.CharField(max_length=200)
    status = models.CharField(max_length=20, default='Sent')
    date = models.CharField(max_length=30)
    delivery = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.recipient} - {self.status}"

class GeneratedGreeting(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    recipient = models.CharField(max_length=100)
    occasion = models.CharField(max_length=50)
    tone = models.CharField(max_length=30)
    content = models.TextField()
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Greeting for {self.recipient}"


class SentAIGreeting(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_ai_greetings')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='sent_ai_greetings')
    generated_greeting = models.ForeignKey(GeneratedGreeting, on_delete=models.SET_NULL, null=True, blank=True)
    greeting_text = models.TextField()
    occasion = models.CharField(max_length=50)
    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)
    delivery_status = models.CharField(max_length=50, default='Sent')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['contact']),
        ]
        verbose_name = "Sent AI Greeting"
        verbose_name_plural = "Sent AI Greetings"

    def __str__(self):
        return f"From {self.user.username} to {self.recipient_email} at {self.sent_at}"

class AIPrompt(models.Model):
    name = models.CharField(max_length=100)
    occasion = models.CharField(max_length=50)
    tone = models.CharField(max_length=30)
    prompt_template = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.occasion} - {self.tone})"

class Notification(models.Model):
    TYPE_CHOICES = [
        ('system', 'System'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp')
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=150)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.title}"

class SubscriptionTransaction(models.Model):
    GATEWAY_CHOICES = [
        ('stripe', 'Stripe'),
        ('razorpay', 'Razorpay'),
        ('mock', 'Mock')
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    gateway = models.CharField(max_length=20, choices=GATEWAY_CHOICES, default='mock')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    amount = models.DecimalField(decimal_places=2, max_digits=10)
    plan = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default='Pending') # Pending, Completed, Failed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.plan} ({self.status})"

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'System'} - {self.action}"

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('CONTACT_CREATED', 'Contact Created'),
        ('CONTACT_UPDATED', 'Contact Updated'),
        ('CONTACT_DELETED', 'Contact Deleted'),
        ('EVENT_CREATED', 'Event Created'),
        ('EVENT_UPDATED', 'Event Updated'),
        ('EVENT_DELETED', 'Event Deleted'),
        ('WISH_GENERATED', 'Wish Generated'),
        ('WISH_SCHEDULED', 'Wish Scheduled'),
        ('WISH_SENT', 'Wish Sent'),
        ('WISH_CANCELLED', 'Wish Cancelled'),
        ('WISH_FAILED', 'Wish Failed'),
        ('AI_GREETING_GENERATED', 'AI Greeting Generated'),
        ('GREETING_CARD_CREATED', 'Greeting Card Created'),
        ('GREETING_CARD_UPDATED', 'Greeting Card Updated'),
        ('GREETING_CARD_SENT', 'Greeting Card Sent'),
        ('TEMPLATE_CREATED', 'Template Created'),
        ('TEMPLATE_UPDATED', 'Template Updated'),
        ('TEMPLATE_SAVED', 'Template Saved'),
        ('NOTIFICATION_CREATED', 'Notification Created'),
        ('SUBSCRIPTION_UPDATED', 'Subscription Updated'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    entity_type = models.CharField(max_length=50, blank=True, null=True)
    entity_id = models.IntegerField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action_type']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action_type} - {self.created_at}"


# ─────────────────────────────────────────────────────────────────────────────
# Greeting Card System
# ─────────────────────────────────────────────────────────────────────────────

class GreetingCardTemplate(models.Model):
    OCCASION_CHOICES = [
        ('Birthday', 'Birthday'),
        ('Anniversary', 'Anniversary'),
        ('Wedding', 'Wedding'),
        ('Festival', 'Festival'),
        ('Christmas', 'Christmas'),
        ('NewYear', 'New Year'),
        ('Diwali', 'Diwali'),
        ('Eid', 'Eid'),
        ('Ramadan', 'Ramadan'),
        ('Valentine', 'Valentine'),
        ('MothersDay', "Mother's Day"),
        ('FathersDay', "Father's Day"),
        ('FriendshipDay', 'Friendship Day'),
        ('Graduation', 'Graduation'),
        ('Congratulations', 'Congratulations'),
        ('Custom', 'Custom'),
    ]

    CATEGORY_CHOICES = [
        ('Minimal', 'Minimal'),
        ('Modern', 'Modern'),
        ('Cute', 'Cute'),
        ('Luxury', 'Luxury'),
        ('Corporate', 'Corporate'),
        ('Kids', 'Kids'),
        ('Floral', 'Floral'),
        ('Dark', 'Dark'),
        ('Classic', 'Classic'),
        ('AIGenerated', 'AI Generated'),
    ]

    LAYOUT_CHOICES = [
        ('center', 'Center'),
        ('top', 'Top'),
        ('split', 'Split'),
        ('full', 'Full Bleed'),
        ('collage', 'Collage'),
    ]

    # Identity
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True, null=True,
                            help_text="URL-friendly identifier (auto-generated from title if blank).")
    occasion = models.CharField(max_length=50, choices=OCCASION_CHOICES, default='Birthday')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Modern')
    description = models.TextField(blank=True, help_text="Short marketing description shown in the gallery.")

    # Imagery (stored on disk under MEDIA_ROOT, never in the DB)
    preview_image = models.ImageField(upload_to='greeting_templates/preview/', blank=True, null=True)
    thumbnail_image = models.ImageField(upload_to='greeting_templates/thumbnail/', blank=True, null=True)
    background_image = models.ImageField(upload_to='greeting_templates/background/', blank=True, null=True)

    # Design tokens
    primary_color = models.CharField(max_length=20, default='#6366f1')
    secondary_color = models.CharField(max_length=20, default='#a855f7')
    accent_color = models.CharField(max_length=20, default='#ec4899')
    text_color = models.CharField(max_length=20, default='#ffffff')
    background_color = models.CharField(max_length=50, default='#1a1a2e')
    font_family = models.CharField(max_length=60, default='Inter')
    font_size = models.IntegerField(default=16, help_text="Base font size in px.")
    layout_type = models.CharField(max_length=20, choices=LAYOUT_CHOICES, default='center')

    # Card geometry
    card_width = models.IntegerField(default=500)
    card_height = models.IntegerField(default=500)
    elements_json = models.JSONField(default=list, blank=True,
                                   help_text="Array of element objects (text, image, emoji, shape).")

    # Flags / status
    is_premium = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, help_text="Lower numbers appear first within a group.")

    # Extensibility
    tags = models.JSONField(default=list, blank=True, help_text="List of string tags, e.g. ['romantic','gold'].")
    metadata = models.JSONField(default=dict, blank=True, help_text="Free-form key/value metadata.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']
        indexes = [
            models.Index(fields=['occasion']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_premium']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['sort_order']),
            models.Index(fields=['slug']),
        ]
        verbose_name = "Greeting Card Template"
        verbose_name_plural = "Greeting Card Templates"

    def __str__(self):
        return f"{self.title} ({self.occasion} / {self.category})"

    def save(self, *args, **kwargs):
        # Auto-generate a unique slug when one is not supplied.
        if not self.slug:
            from django.utils.text import slugify
            base = slugify(self.title) or f"template-{self.id or 0}"
            slug = base
            n = 2
            while GreetingCardTemplate.objects.filter(slug=slug).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        # Keep boolean aliases coherent with legacy names used elsewhere.
        self.premium = self.is_premium
        self.featured = self.is_featured
        super().save(*args, **kwargs)


class GreetingCard(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    CARD_SIZE_CHOICES = [
        ('instagram_square', 'Instagram Square (1080×1080)'),
        ('portrait', 'Portrait (1080×1350)'),
        ('landscape', 'Landscape (1920×1080)'),
        ('story', 'Story (1080×1920)'),
        ('email_banner', 'Email Banner (600×200)'),
        ('a5', 'A5 (1748×2480)'),
        ('custom', 'Custom'),
    ]

    CARD_THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('gradient', 'Gradient'),
        ('glass', 'Glass'),
    ]

    OCCASION_CHOICES = GreetingCardTemplate.OCCASION_CHOICES

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='greeting_cards')
    template = models.ForeignKey(
        GreetingCardTemplate,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cards_using_template'
    )
    title = models.CharField(max_length=200, default='Untitled Card')
    occasion = models.CharField(max_length=50, choices=OCCASION_CHOICES, default='Birthday')
    
    # Recipient
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name="greeting_cards")

    # Content Fields
    recipient_name = models.CharField(max_length=150, blank=True)
    heading = models.CharField(max_length=300, blank=True)
    message = models.TextField(blank=True)
    footer = models.CharField(max_length=300, blank=True)
    signature = models.CharField(max_length=150, blank=True)

    # Card Design
    card_size = models.CharField(max_length=30, choices=CARD_SIZE_CHOICES, default='instagram_square')
    card_theme = models.CharField(max_length=20, choices=CARD_THEME_CHOICES, default='dark')
    card_width = models.IntegerField(default=500)
    card_height = models.IntegerField(default=500)
    background_color = models.CharField(max_length=50, default='#1a1a2e')
    background_image = models.ImageField(upload_to='greeting_cards/backgrounds/', blank=True, null=True)
    background_blur = models.IntegerField(default=0)
    background_opacity = models.FloatField(default=1.0)
    border_radius = models.IntegerField(default=16)
    shadow = models.BooleanField(default=True)

    # Typography
    font_family = models.CharField(max_length=100, default='Inter')
    font_size = models.IntegerField(default=16)
    font_color = models.CharField(max_length=50, default='#ffffff')
    text_style = models.JSONField(default=dict, blank=True)

    # Photo
    uploaded_photo = models.ImageField(upload_to='greeting_cards/photos/', blank=True, null=True)

    # Full element tree (JSON array of element objects)
    elements_json = models.JSONField(default=list, blank=True)

    # Generated preview
    preview_image = models.ImageField(upload_to='greeting_cards/previews/', blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_favorite = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'is_favorite']),
            models.Index(fields=['occasion']),
            models.Index(fields=['updated_at']),
        ]
        verbose_name = "Greeting Card"
        verbose_name_plural = "Greeting Cards"

    def __str__(self):
        return f"{self.user.username} — {self.title} ({self.occasion})"


class SentGreetingCard(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_greeting_cards")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="sent_greeting_cards")
    greeting_card = models.ForeignKey(GreetingCard, on_delete=models.CASCADE, related_name="sent_greeting_cards")
    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)
    delivery_status = models.CharField(max_length=50, default="Sent")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["contact"]),
        ]
        verbose_name = "Sent Greeting Card"
        verbose_name_plural = "Sent Greeting Cards"

    def __str__(self):
        return f"From {self.user.username} to {self.recipient_email} at {self.sent_at}"


class GreetingCardFavorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='card_favorites')
    card = models.ForeignKey(GreetingCard, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'card')
        verbose_name = "Greeting Card Favorite"
        verbose_name_plural = "Greeting Card Favorites"

    def __str__(self):
        return f"{self.user.username} ♥ {self.card.title}"

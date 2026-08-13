import datetime
from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone

def parse_time_string(time_str):
    if not time_str:
        return datetime.time(9, 0)
    # Strip whitespace
    time_str = time_str.strip().upper()
    
    # Try different formats
    for fmt in ('%H:%M', '%I:%M %p', '%I:%M%p', '%H:%M:%S'):
        try:
            return datetime.datetime.strptime(time_str, fmt).time()
        except ValueError:
            continue
            
    # Clean non-digits for fallback parsing
    try:
        parts = [int(x) for x in ''.join(c if c.isdigit() or c==':' else ' ' for c in time_str).split(':') if x]
        if len(parts) >= 2:
            hour = parts[0]
            minute = parts[1]
            if 'PM' in time_str and hour < 12:
                hour += 12
            elif 'AM' in time_str and hour == 12:
                hour = 0
            if 0 <= hour < 24 and 0 <= minute < 60:
                return datetime.time(hour, minute)
    except Exception:
        pass
        
    return datetime.time(9, 0)

def migrate_recipients_to_contacts(apps, schema_editor):
    ScheduledWish = apps.get_model('core', 'ScheduledWish')
    Contact = apps.get_model('core', 'Contact')
    User = apps.get_model('auth', 'User')

    for wish in ScheduledWish.objects.all():
        recipient_name = wish.recipient.strip() if wish.recipient else "Unknown"
        if not recipient_name:
            recipient_name = "Unknown"
            
        # Try to find a matching contact for this user by name
        contact = Contact.objects.filter(user=wish.user, name__iexact=recipient_name).first()
        
        if not contact:
            # If not found, look up by email if recipient looks like email
            email_val = ""
            if "@" in recipient_name and "." in recipient_name:
                email_val = recipient_name
                # clean up name from email
                recipient_name = recipient_name.split("@")[0].capitalize()
                contact = Contact.objects.filter(user=wish.user, email__iexact=email_val).first()
            
            if not contact:
                # Create a new Contact
                contact = Contact.objects.create(
                    user=wish.user,
                    name=recipient_name,
                    email=email_val,
                    phone="",
                    relationship="Other",
                    group="Personal",
                    is_favorite=False
                )
        
        wish.contact = contact
        # Convert time string to time object
        wish.new_time = parse_time_string(wish.time)
        wish.save()

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        # 1. Add temporary contact field (nullable)
        migrations.AddField(
            model_name='scheduledwish',
            name='contact',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='scheduled_wishes', to='core.contact', verbose_name='Contact'),
        ),
        # 2. Add temporary new_time field
        migrations.AddField(
            model_name='scheduledwish',
            name='new_time',
            field=models.TimeField(default=datetime.time(9, 0), verbose_name='Time'),
        ),
        # 3. Add updated_at
        migrations.AddField(
            model_name='scheduledwish',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='Updated At'),
        ),
        # 4. Run data migration
        migrations.RunPython(migrate_recipients_to_contacts),
        # 5. Remove old recipient and time fields
        migrations.RemoveField(
            model_name='scheduledwish',
            name='recipient',
        ),
        migrations.RemoveField(
            model_name='scheduledwish',
            name='time',
        ),
        # 6. Rename new_time to time
        migrations.RenameField(
            model_name='scheduledwish',
            old_name='new_time',
            new_name='time',
        ),
        # 7. Make contact non-nullable
        migrations.AlterField(
            model_name='scheduledwish',
            name='contact',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scheduled_wishes', to='core.contact', verbose_name='Contact'),
        ),
        # 8. Add Indexes & Alter Options
        migrations.AlterModelOptions(
            name='scheduledwish',
            options={'ordering': ['date', 'time'], 'verbose_name': 'Scheduled Wish', 'verbose_name_plural': 'Scheduled Wishes'},
        ),
        migrations.AddIndex(
            model_name='scheduledwish',
            index=models.Index(fields=['contact'], name='core_schedu_contact_b15b3e_idx'),
        ),
        migrations.AddIndex(
            model_name='scheduledwish',
            index=models.Index(fields=['status'], name='core_schedu_status_ef0c16_idx'),
        ),
        migrations.AddIndex(
            model_name='scheduledwish',
            index=models.Index(fields=['date'], name='core_schedu_date_027bc9_idx'),
        ),
        migrations.AddIndex(
            model_name='scheduledwish',
            index=models.Index(fields=['user', 'status'], name='core_schedu_user_id_4dbcb7_idx'),
        ),
    ]

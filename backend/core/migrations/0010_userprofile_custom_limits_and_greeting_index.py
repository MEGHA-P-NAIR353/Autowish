from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_activitylog_action_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='custom_ai_generation_limit',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Enterprise custom monthly AI generation limit. Null = unlimited.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='custom_scheduled_wish_limit',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Enterprise custom monthly scheduled wish limit. Null = unlimited.',
                null=True,
            ),
        ),
        migrations.AddIndex(
            model_name='generatedgreeting',
            index=models.Index(fields=['user', 'created_at'], name='core_genera_user_id_created_idx'),
        ),
    ]

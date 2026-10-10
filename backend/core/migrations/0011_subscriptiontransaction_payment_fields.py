from django.db import migrations, models


def migrate_legacy_statuses(apps, schema_editor):
    SubscriptionTransaction = apps.get_model('core', 'SubscriptionTransaction')
    mapping = {
        'Pending': 'PENDING',
        'Completed': 'SUCCESS',
        'Failed': 'FAILED',
        'Cancelled': 'CANCELLED',
    }
    for tx in SubscriptionTransaction.objects.all():
        new_status = mapping.get(tx.status, tx.status)
        if new_status != tx.status:
            tx.status = new_status
            tx.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_userprofile_custom_limits_and_greeting_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptiontransaction',
            name='currency',
            field=models.CharField(default='INR', max_length=3),
        ),
        migrations.AddField(
            model_name='subscriptiontransaction',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='subscriptiontransaction',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('SUCCESS', 'Success'),
                    ('FAILED', 'Failed'),
                    ('CANCELLED', 'Cancelled'),
                ],
                default='PENDING',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='subscriptiontransaction',
            name='transaction_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.RunPython(migrate_legacy_statuses, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name='subscriptiontransaction',
            index=models.Index(fields=['user', 'status'], name='core_subscr_user_id_status_idx'),
        ),
        migrations.AddIndex(
            model_name='subscriptiontransaction',
            index=models.Index(fields=['user', 'created_at'], name='core_subscr_user_id_created_idx'),
        ),
    ]

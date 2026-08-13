# Generated manually to extend GreetingCardTemplate with the full
# production schema (slug, colors, layout, featured, sort, tags, metadata,
# renamed image fields). Safe for both fresh and already-seeded databases.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_sentaigreeting'),
    ]

    operations = [
        # ── New scalar / json fields ───────────────────────────────────────────
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='slug',
            field=models.SlugField(blank=True, max_length=220, null=True),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='primary_color',
            field=models.CharField(default='#6366f1', max_length=20),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='secondary_color',
            field=models.CharField(default='#a855f7', max_length=20),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='accent_color',
            field=models.CharField(default='#ec4899', max_length=20),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='text_color',
            field=models.CharField(default='#ffffff', max_length=20),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='font_family',
            field=models.CharField(default='Inter', max_length=60),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='font_size',
            field=models.IntegerField(default=16),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='layout_type',
            field=models.CharField(
                choices=[('center', 'Center'), ('top', 'Top'), ('split', 'Split'),
                          ('full', 'Full Bleed'), ('collage', 'Collage')],
                default='center', max_length=20),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='sort_order',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='tags',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        # ── New image fields (old `thumbnail` is renamed below) ────────────────
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='preview_image',
            field=models.ImageField(blank=True, null=True, upload_to='greeting_templates/preview/'),
        ),
        migrations.AddField(
            model_name='greetingcardtemplate',
            name='thumbnail_image',
            field=models.ImageField(blank=True, null=True, upload_to='greeting_templates/thumbnail/'),
        ),
        # ── Renames ────────────────────────────────────────────────────────────
        # Rename legacy `premium` -> `is_premium` (keeps column data).
        migrations.RenameField(
            model_name='greetingcardtemplate',
            old_name='premium',
            new_name='is_premium',
        ),
        # Rename `thumbnail` -> `thumbnail_image` (new path). ImageFiles are not
        # physically moved, so reset the pointer to avoid broken upload_to paths.
        migrations.RenameField(
            model_name='greetingcardtemplate',
            old_name='thumbnail',
            new_name='_old_thumbnail',
        ),
        # ── Indexes for the new queryable flags ────────────────────────────────
        migrations.AddIndex(
            model_name='greetingcardtemplate',
            index=models.Index(fields=['is_premium'], name='core_greeti_is_prem_9f3a21_idx'),
        ),
        migrations.AddIndex(
            model_name='greetingcardtemplate',
            index=models.Index(fields=['is_featured'], name='core_greeti_is_feat_a1c2b3_idx'),
        ),
        migrations.AddIndex(
            model_name='greetingcardtemplate',
            index=models.Index(fields=['sort_order'], name='core_greeti_sort_o_7d4e5f_idx'),
        ),
        migrations.AddIndex(
            model_name='greetingcardtemplate',
            index=models.Index(fields=['slug'], name='core_greeti_slug_b6c7d8_idx'),
        ),
        # ── Drop the stale legacy thumbnail pointer (data not needed) ───────────
        migrations.RemoveField(
            model_name='greetingcardtemplate',
            name='_old_thumbnail',
        ),
    ]

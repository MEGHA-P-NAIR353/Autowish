import os
from django.core.management.base import BaseCommand
from django.conf import settings

# ── Pillow for generating default gradient placeholder assets ──────────────────
try:
    from PIL import Image, ImageDraw
except Exception:  # pragma: no cover
    Image = None


# ── Template catalogue (single source of truth seed data) ──────────────────────
# Each entry carries design tokens + imagery colors; images are generated as
# gradient placeholders so every template has a working preview/thumbnail/background.
TEMPLATES = [
    # ─── BIRTHDAY ───────────────────────────────────────────────
    dict(title='Minimal Modern Birthday', occasion='Birthday', category='Minimal',
         description='Clean modern birthday card with soft gradient and sparkle accent.',
         background_color='#fdfbfb', primary_color='#6366f1', secondary_color='#a855f7',
         accent_color='#6366f1', text_color='#1f2937', font_family='Poppins',
         font_size=18, layout_type='center', is_premium=True, is_featured=True,
         tags=['minimal', 'modern', 'birthday'],
         grad=('#fdfbfb', '#ebedee'), decor='sparkle'),
    dict(title='Balloon Party Birthday', occasion='Birthday', category='Cute',
         description='Playful balloon party theme for a fun birthday celebration.',
         background_color='#a18cd1', primary_color='#f472b6', secondary_color='#fbc2eb',
         accent_color='#f472b6', text_color='#ffffff', font_family='Baloo 2',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['balloons', 'party', 'kids'],
         grad=('#a18cd1', '#fbc2eb'), decor='balloons'),
    dict(title='Kids Birthday', occasion='Birthday', category='Kids',
         description='Bright confetti birthday card perfect for kids.',
         background_color='#fceabb', primary_color='#ef4444', secondary_color='#f8b500',
         accent_color='#ef4444', text_color='#7c2d12', font_family='Fredoka',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['kids', 'confetti', 'fun'],
         grad=('#fceabb', '#f8b500'), decor='confetti'),

    # ─── ANNIVERSARY ──────────────────────────────────────────
    dict(title='Golden Love', occasion='Anniversary', category='Luxury',
         description='Elegant gold anniversary card for a romantic milestone.',
         background_color='#bf953f', primary_color='#92400e', secondary_color='#fcf6ba',
         accent_color='#92400e', text_color='#3b2f0b', font_family='Cormorant Garamond',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['gold', 'romance', 'luxury'],
         grad=('#bf953f', '#b38728'), decor='hearts'),
    dict(title='Floral Romance', occasion='Anniversary', category='Floral',
         description='Soft floral anniversary design with romantic typography.',
         background_color='#fbc2eb', primary_color='#db2777', secondary_color='#a6c1ee',
         accent_color='#db2777', text_color='#4c1d95', font_family='Playfair Display',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['floral', 'romance'],
         grad=('#fbc2eb', '#a6c1ee'), decor='florals'),
    dict(title='Luxury Black Gold', occasion='Anniversary', category='Luxury',
         description='Sophisticated black & gold anniversary card.',
         background_color='#0f0f0f', primary_color='#fbbf24', secondary_color='#2a2a2a',
         accent_color='#fbbf24', text_color='#fcd34d', font_family='Playfair Display',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['black', 'gold', 'luxury'],
         grad=('#0f0f0f', '#2a2a2a'), decor='rings'),

    # ─── WEDDING ─────────────────────────────────────────────
    dict(title='Elegant White Wedding', occasion='Wedding', category='Elegant',
         description='Timeless white wedding invitation with elegant script.',
         background_color='#fdfbfb', primary_color='#9ca3af', secondary_color='#f3f4f6',
         accent_color='#9ca3af', text_color='#374151', font_family='Cormorant Garamond',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['white', 'elegant', 'wedding'],
         grad=('#fdfbfb', '#f3f4f6'), decor='florals'),
    dict(title='Royal Gold Wedding', occasion='Wedding', category='Luxury',
         description='Majestic royal gold wedding card.',
         background_color='#1a1a2e', primary_color='#f59e0b', secondary_color='#3f1d4e',
         accent_color='#f59e0b', text_color='#fcd34d', font_family='Cinzel',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['royal', 'gold', 'wedding'],
         grad=('#1a1a2e', '#3f1d4e'), decor='rings'),
    dict(title='Floral Wedding', occasion='Wedding', category='Floral',
         description='Garden-inspired floral wedding design.',
         background_color='#fddb92', primary_color='#b45309', secondary_color='#d1fdff',
         accent_color='#b45309', text_color='#5b21b', font_family='Cormorant Garamond',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['floral', 'garden', 'wedding'],
         grad=('#fddb92', '#d1fdff'), decor='florals'),

    # ─── FESTIVAL ────────────────────────────────────────────
    dict(title='Traditional Festival', occasion='Festival', category='Traditional',
         description='Vibrant traditional festival celebration card.',
         background_color='#f12711', primary_color='#fde047', secondary_color='#f5af19',
         accent_color='#fde047', text_color='#ffffff', font_family='Baloo 2',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['traditional', 'festive'],
         grad=('#f12711', '#f5af19'), decor='confetti'),
    dict(title='Confetti Festival', occasion='Festival', category='Cute',
         description='Joyful confetti festival greeting.',
         background_color='#ee9ca7', primary_color='#ec4899', secondary_color='#ffdde1',
         accent_color='#ec4899', text_color='#be185d', font_family='Poppins',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['confetti', 'party', 'festive'],
         grad=('#ee9ca7', '#ffdde1'), decor='confetti'),

    # ─── CHRISTMAS ───────────────────────────────────────────
    dict(title='Snow Theme', occasion='Christmas', category='Modern',
         description='Cool snowy winter christmas card.',
         background_color='#83a4d4', primary_color='#2563eb', secondary_color='#b6fbff',
         accent_color='#2563eb', text_color='#0f172a', font_family='Mountains of Christmas',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['snow', 'winter', 'christmas'],
         grad=('#83a4d4', '#b6fbff'), decor='snow'),
    dict(title='Luxury Christmas', occasion='Christmas', category='Luxury',
         description='Premium green & gold christmas card.',
         background_color='#063b1f', primary_color='#fbbf24', secondary_color='#0a5c36',
         accent_color='#fbbf24', text_color='#fcd34d', font_family='Playfair Display',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['gold', 'luxury', 'christmas'],
         grad=('#063b1f', '#0a5c36'), decor='snow'),

    # ─── NEW YEAR ─────────────────────────────────────────────
    dict(title='Fireworks Celebration', occasion='NewYear', category='Modern',
         description='Explosive fireworks new year celebration card.',
         background_color='#0b0b2b', primary_color='#f472b6', secondary_color='#3a0ca3',
         accent_color='#f472b6', text_color='#fde047', font_family='Poppins',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['fireworks', 'celebrate', 'newyear'],
         grad=('#0b0b2b', '#3a0ca3'), decor='fireworks'),

    # ─── DIWALI ──────────────────────────────────────────────
    dict(title='Royal Diya', occasion='Diwali', category='Luxury',
         description='Royal diwali card with warm diya glow.',
         background_color='#3a1c00', primary_color='#fbbf24', secondary_color='#ff8008',
         accent_color='#fbbf24', text_color='#fff7ed', font_family='Baloo 2',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['diya', 'royal', 'diwali'],
         grad=('#3a1c00', '#ff8008'), decor='diyas'),

    # ─── EID ───────────────────────────────────────────────────
    dict(title='Moon Gold', occasion='Eid', category='Luxury',
         description='Serene moon & gold eid greeting.',
         background_color='#093028', primary_color='#fcd34d', secondary_color='#237a57',
         accent_color='#fcd34d', text_color='#fef3c7', font_family='Amiri',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['moon', 'gold', 'eid'],
         grad=('#093028', '#237a57'), decor='moon'),

    # ─── MOTHER'S DAY ────────────────────────────────────────
    dict(title='Elegant Floral', occasion="Mother's Day", category='Floral',
         description='Soft pink floral card for mother\'s day.',
         background_color='#ffafbd', primary_color='#db2777', secondary_color='#ffc3a0',
         accent_color='#db2777', text_color='#9d174d', font_family='Poppins',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['floral', 'pink', 'mothersday'],
         grad=('#ffafbd', '#ffc3a0'), decor='florals'),

    # ─── FATHER'S DAY ────────────────────────────────────────
    dict(title='Blue Classic', occasion="Father's Day", category='Classic',
         description='Classic blue father\'s day tribute.',
         background_color='#1e3c72', primary_color='#60a5fa', secondary_color='#2a5298',
         accent_color='#60a5fa', text_color='#dbeafe', font_family='Playfair Display',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['blue', 'classic', 'fathersday'],
         grad=('#1e3c72', '#2a5298'), decor='stars'),

    # ─── GRADUATION ──────────────────────────────────────────
    dict(title='Academic Success', occasion='Graduation', category='Modern',
         description='Proud graduation success congratulations card.',
         background_color='#4b6cb7', primary_color='#38bdf8', secondary_color='#182848',
         accent_color='#38bdf8', text_color='#fde047', font_family='Poppins',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['academic', 'success', 'graduation'],
         grad=('#4b6cb7', '#182848'), decor='stars'),

    # ─── CONGRATULATIONS ─────────────────────────────────────
    dict(title='Corporate Celebration', occasion='Congratulations', category='Corporate',
         description='Polished corporate congratulations card.',
         background_color='#232526', primary_color='#38bdf8', secondary_color='#414345',
         accent_color='#38bdf8', text_color='#e5e7eb', font_family='Inter',
         font_size=18, layout_type='center', is_premium=True, is_featured=False,
         tags=['corporate', 'celebrate'],
         grad=('#232526', '#414345'), decor='sparkle'),

    # ─── BABY SHOWER ────────────────────────────────────────
    dict(title='Cute Teddy', occasion='Baby Shower', category='Cute',
         description='Adorable teddy baby shower invitation.',
         background_color='#a1c4fd', primary_color='#f472b6', secondary_color='#c2e9fb',
         accent_color='#f472b6', text_color='#1e3a8', font_family='Fredoka',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['teddy', 'cute', 'babyshower'],
         grad=('#a1c4fd', '#c2e9fb'), decor='teddy'),

    # ─── VALENTINE'S DAY ─────────────────────────────────────
    dict(title='Romantic Hearts', occasion='Valentine', category='Romantic',
         description='Romantic hearts valentine\'s day card.',
         background_color='#ff5f6d', primary_color='#be123c', secondary_color='#ffc371',
         accent_color='#be123c', text_color='#7f1d1d', font_family='Playfair Display',
         font_size=20, layout_type='center', is_premium=True, is_featured=True,
         tags=['hearts', 'romantic', 'valentine'],
         grad=('#ff5f6d', '#ffc371'), decor='hearts'),

    # ─── FRIENDSHIP DAY ─────────────────────────────────────
    dict(title='Color Splash', occasion='FriendshipDay', category='Modern',
         description='Vibrant color splash friendship day card.',
         background_color='#f093fb', primary_color='#fbbf24', secondary_color='#f5576c',
         accent_color='#fbbf24', text_color='#ffffff', font_family='Poppins',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['colorful', 'splash', 'friendship'],
         grad=('#f093fb', '#f5576c'), decor='confetti'),

    # ─── THANK YOU ───────────────────────────────────────────
    dict(title='Elegant Minimal', occasion='ThankYou', category='Minimal',
         description='Clean minimal thank you card.',
         background_color='#e0eafc', primary_color='#0d9488', secondary_color='#cfdef3',
         accent_color='#0d9488', text_color='#334155', font_family='Inter',
         font_size=18, layout_type='center', is_premium=True, is_featured=False,
         tags=['elegant', 'minimal', 'thankyou'],
         grad=('#e0eafc', '#cfdef3'), decor='leaves'),

    # ─── GET WELL SOON ───────────────────────────────────────
    dict(title='Soft Floral', occasion='GetWellSoon', category='Floral',
         description='Gentle floral get well soon card.',
         background_color='#ffecd2', primary_color='#fb7185', secondary_color='#fcb69f',
         accent_color='#fb7185', text_color='#7c2d12', font_family='Poppins',
         font_size=20, layout_type='center', is_premium=True, is_featured=False,
         tags=['soft', 'floral', 'getwell'],
         grad=('#ffecd2', '#fcb69f'), decor='florals'),

    # ─── CUSTOM BLANK ───────────────────────────────────────
    dict(title='Custom Blank Template', occasion='Custom', category='Modern',
         description='Blank canvas template you can fully customize.',
         background_color='#1e293b', primary_color='#818cf8', secondary_color='#334155',
         accent_color='#818cf8', text_color='#ffffff', font_family='Inter',
         font_size=18, layout_type='center', is_premium=False, is_featured=False,
         tags=['blank', 'custom'],
         grad=('#1e293b', '#334155'), decor='none'),
]


def _hex_to_rgb(hex_color):
    hex_color = (hex_color or '#000000').lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(c * 2 for c in hex_color)
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def _make_gradient(path, color_a, color_b, size=(600, 600)):
    """Render a diagonal gradient PNG placeholder."""
    if Image is None:
        return
    w, h = size
    ca = _hex_to_rgb(color_a)
    cb = _hex_to_rgb(color_b)
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h)
            r = int(ca[0] * (1 - t) + cb[0] * t)
            g = int(ca[1] * (1 - t) + cb[1] * t)
            b = int(ca[2] * (1 - t) + cb[2] * t)
            px[x, y] = (r, g, b)
    # Subtle vignette glow in the center for a "designed" feel.
    overlay = Image.new('RGB', (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(overlay)
    glow = max(40, int(min(w, h) * 0.18))
    draw.ellipse([w // 2 - glow, h // 2 - glow, w // 2 + glow, h // 2 + glow],
                  fill=(255, 255, 255))
    img = Image.blend(img, overlay, 0.06)
    img.save(path, 'PNG')


class Command(BaseCommand):
    help = 'Seeds the premium GreetingCardTemplate library (single source of truth) with default image assets.'

    def handle(self, *args, **options):
        from core.models import GreetingCardTemplate

        defaults_dir = os.path.join(settings.MEDIA_ROOT, 'greeting_templates', 'defaults')
        preview_dir = os.path.join(defaults_dir, 'preview')
        thumb_dir = os.path.join(defaults_dir, 'thumbnail')
        bg_dir = os.path.join(defaults_dir, 'background')
        for d in (preview_dir, thumb_dir, bg_dir):
            os.makedirs(d, exist_ok=True)

        created = 0
        updated = 0
        for idx, tpl in enumerate(TEMPLATES):
            slug_source = tpl['title']
            safe = ''.join(c if c.isalnum() else '_' for c in slug_source).lower()
            preview_path = os.path.join(preview_dir, f'{safe}.png')
            thumb_path = os.path.join(thumb_dir, f'{safe}.png')
            bg_path = os.path.join(bg_dir, f'{safe}.png')

            # Generate default gradient assets once.
            ca, cb = tpl['grad']
            if Image is not None:
                if not os.path.exists(preview_path):
                    _make_gradient(preview_path, ca, cb, (600, 600))
                if not os.path.exists(thumb_path):
                    _make_gradient(thumb_path, ca, cb, (400, 300))
                if not os.path.exists(bg_path):
                    _make_gradient(bg_path, ca, cb, (1080, 1080))

            obj, was_created = GreetingCardTemplate.objects.get_or_create(
                title=tpl['title'],
                defaults={
                    'occasion': tpl['occasion'],
                    'category': tpl['category'],
                    'description': tpl['description'],
                    'background_color': tpl['background_color'],
                    'primary_color': tpl['primary_color'],
                    'secondary_color': tpl['secondary_color'],
                    'accent_color': tpl['accent_color'],
                    'text_color': tpl['text_color'],
                    'font_family': tpl['font_family'],
                    'font_size': tpl['font_size'],
                    'layout_type': tpl['layout_type'],
                    'is_premium': tpl['is_premium'],
                    'is_featured': tpl['is_featured'],
                    'is_active': True,
                    'sort_order': idx,
                    'tags': tpl.get('tags', []),
                    'metadata': {'decor': tpl.get('decor', 'none')},
                    'card_width': 500,
                    'card_height': 500,
                    'elements_json': [],
                }
            )
            if was_created:
                # Attach generated image assets via ImageField (relative to MEDIA_ROOT).
                obj.preview_image.name = os.path.relpath(preview_path, settings.MEDIA_ROOT)
                obj.thumbnail_image.name = os.path.relpath(thumb_path, settings.MEDIA_ROOT)
                obj.background_image.name = os.path.relpath(bg_path, settings.MEDIA_ROOT)
                obj.save(update_fields=['preview_image', 'thumbnail_image', 'background_image', 'slug'])
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Seeded template: {tpl['title']}"))
            else:
                updated += 1

        total = GreetingCardTemplate.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"Done. Created {created} / updated {updated}. Total templates: {total}"
        ))

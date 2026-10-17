import os
import io
import textwrap
import logging
from PIL import Image, ImageDraw, ImageFont
from django.conf import settings
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

# System fonts priority for Windows and Linux fallback
FONT_CANDIDATES = [
    'C:/Windows/Fonts/segoeui.ttf',
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/calibri.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
]

FONT_BOLD_CANDIDATES = [
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/calibrib.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
]

EMOJI_FONT_CANDIDATES = [
    'C:/Windows/Fonts/seguiemj.ttf',
    '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
]


def _get_font(size: int, bold: bool = False):
    candidates = FONT_BOLD_CANDIDATES if bold else FONT_CANDIDATES
    for font_path in candidates:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                continue
    try:
        return ImageFont.load_default()
    except Exception:
        return None


def _get_emoji_font(size: int):
    for font_path in EMOJI_FONT_CANDIDATES:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                continue
    return _get_font(size)


def hex_to_rgb(hex_code: str, default=(15, 23, 42)):
    if not hex_code:
        return default
    hex_code = hex_code.strip().lstrip('#')
    if len(hex_code) == 3:
        hex_code = ''.join(c * 2 for c in hex_code)
    if len(hex_code) == 6:
        try:
            return tuple(int(hex_code[i:i + 2], 16) for i in (0, 2, 4))
        except ValueError:
            return default
    return default


def get_luminance(rgb: tuple) -> float:
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]


def generate_card_preview(card, save: bool = True) -> bytes:
    """
    Generate an authoritative 1000x1000 PNG preview image for a GreetingCard
    using Pillow. Ensures that any card in the system can always have a high-res,
    gorgeous image for email delivery, export, and UI previews.
    """
    WIDTH = 1000
    HEIGHT = 1000

    from core.theme_config import get_theme_config, normalize_card_theme

    theme_key = normalize_card_theme(getattr(card, 'card_theme', None) or 'midnight')
    theme_cfg = get_theme_config(theme_key)

    # 1. Background
    bg_color_hex = getattr(card, 'background_color', None)
    if not bg_color_hex or bg_color_hex.lower() in ('#1a1a2e', ''):
        bg_color_hex = theme_cfg['bg_color']

    bg_rgb = hex_to_rgb(bg_color_hex, default=hex_to_rgb(theme_cfg['bg_color']))
    is_light_bg = (not theme_cfg.get('is_dark', True)) or (get_luminance(bg_rgb) > 135)

    # Text palette based on contrast and theme
    if is_light_bg:
        primary_text = (15, 23, 42, 255)       # Slate 900
        secondary_text = (51, 65, 85, 230)    # Slate 700
        border_color = (15, 23, 42, 35)
        badge_bg = (15, 23, 42, 20)
        badge_text = (15, 23, 42, 220)
        badge_border = (15, 23, 42, 40)
        shadow_color = (255, 255, 255, 120)
    else:
        primary_text = hex_to_rgb(theme_cfg.get('text_color', '#FFFFFF'), default=(255, 255, 255))
        primary_text = (*primary_text, 255)
        secondary_text = (241, 245, 249, 230) # Slate 100
        border_color = (255, 255, 255, 45)
        badge_bg = (255, 255, 255, 25)
        badge_text = (255, 255, 255, 230)
        badge_border = (255, 255, 255, 60)
        shadow_color = (0, 0, 0, 160)

    # Check custom font color
    font_color_hex = getattr(card, 'font_color', None)
    if font_color_hex:
        custom_rgb = hex_to_rgb(font_color_hex)
        # Ensure sufficient contrast with background
        if abs(get_luminance(custom_rgb) - get_luminance(bg_rgb)) > 60:
            primary_text = (*custom_rgb, 255)
            secondary_text = (*custom_rgb, 220)

    # Try loading uploaded background image if available
    bg_img = None
    bg_file = getattr(card, 'background_image', None)
    if bg_file and hasattr(bg_file, 'name') and bg_file.name:
        bg_path = os.path.join(settings.MEDIA_ROOT, bg_file.name)
        if os.path.exists(bg_path):
            try:
                with Image.open(bg_path) as loaded_bg:
                    loaded_bg = loaded_bg.convert('RGBA')
                    bg_w, bg_h = loaded_bg.size
                    scale = max(WIDTH / bg_w, HEIGHT / bg_h)
                    new_w = int(bg_w * scale)
                    new_h = int(bg_h * scale)
                    resized_bg = loaded_bg.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    left = (new_w - WIDTH) // 2
                    top = (new_h - HEIGHT) // 2
                    bg_img = resized_bg.crop((left, top, left + WIDTH, top + HEIGHT))

                    # Recompute luminance from center of background image
                    thumb = bg_img.resize((10, 10)).convert('L')
                    avg_lum = sum(thumb.getdata()) / 100.0
                    if avg_lum > 135:
                        primary_text = (15, 23, 42, 255)
                        secondary_text = (51, 65, 85, 230)
                        border_color = (15, 23, 42, 35)
                        shadow_color = (255, 255, 255, 120)
                    else:
                        primary_text = (255, 255, 255, 255)
                        secondary_text = (241, 245, 249, 230)
                        border_color = (255, 255, 255, 45)
                        shadow_color = (0, 0, 0, 160)
            except Exception as e:
                logger.warning(f"[card_generator] Could not load background image for card {card.id}: {e}")

    if bg_img is None:
        start_rgb = hex_to_rgb(theme_cfg.get('gradient_start', bg_color_hex), default=bg_rgb)
        end_rgb = hex_to_rgb(theme_cfg.get('gradient_end', bg_color_hex), default=bg_rgb)
        bg_img = Image.new('RGBA', (WIDTH, HEIGHT))
        draw_grad = ImageDraw.Draw(bg_img)
        for i in range(HEIGHT):
            t = i / float(HEIGHT - 1)
            r = int(start_rgb[0] + (end_rgb[0] - start_rgb[0]) * t)
            g = int(start_rgb[1] + (end_rgb[1] - start_rgb[1]) * t)
            b = int(start_rgb[2] + (end_rgb[2] - start_rgb[2]) * t)
            draw_grad.line([(0, i), (WIDTH, i)], fill=(r, g, b, 255))

    canvas = bg_img.copy()
    draw = ImageDraw.Draw(canvas)

    # 2. Inner rounded decorative border
    border_inset = 28
    draw.rounded_rectangle(
        [(border_inset, border_inset), (WIDTH - border_inset, HEIGHT - border_inset)],
        radius=36,
        outline=border_color,
        width=2
    )

    # 3. Top Header: Occasion + AutoWish AI Pill
    occasion_text = (getattr(card, 'occasion', None) or 'SPECIAL WISH').upper()
    font_occ = _get_font(20, bold=True)
    draw.text((64, 56), occasion_text, fill=secondary_text, font=font_occ)

    # AutoWish AI badge on top-right
    badge_w, badge_h = 160, 38
    badge_x = WIDTH - 64 - badge_w
    badge_y = 50
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
        radius=19,
        fill=badge_bg,
        outline=badge_border,
        width=1
    )
    font_badge = _get_font(15, bold=True)
    draw.text((badge_x + 18, badge_y + 9), "AutoWish AI", fill=badge_text, font=font_badge)

    current_y = 135

    # 4. Heading / Greeting
    heading_text = getattr(card, 'heading', '') or ''
    if not heading_text and isinstance(getattr(card, 'text_style', None), dict):
        heading_text = card.text_style.get('heading', '')
    if not heading_text:
        elements = getattr(card, 'elements_json', None)
        if isinstance(elements, list):
            for el in elements:
                if isinstance(el, dict) and el.get('id') in ('el_title', 'el_heading') and el.get('content'):
                    heading_text = el['content']
                    break
    if not heading_text:
        occ = (getattr(card, 'occasion', '') or '').lower()
        if 'anniversary' in occ:
            heading_text = "Happy Anniversary!"
        elif 'birthday' in occ:
            heading_text = "Happy Birthday!"
        elif 'wedding' in occ:
            heading_text = "Congratulations!"
        elif 'festival' in occ:
            heading_text = "Happy Festival!"
        elif 'diwali' in occ:
            heading_text = "Happy Diwali!"
        elif 'christmas' in occ:
            heading_text = "Merry Christmas!"
        elif 'valentine' in occ:
            heading_text = "Happy Valentine's Day!"
        elif 'graduation' in occ:
            heading_text = "Congratulations on Graduation!"
        else:
            heading_text = "Warm Wishes!"

    if heading_text:
        head_font_size = 46 if len(heading_text) <= 24 else (36 if len(heading_text) <= 36 else 28)
        font_head = _get_font(head_font_size, bold=True)
        bbox = draw.textbbox((0, 0), heading_text, font=font_head)
        hw = bbox[2] - bbox[0]
        hx = max(50, (WIDTH - hw) // 2)
        draw.text((hx + 2, current_y + 2), heading_text, fill=shadow_color, font=font_head)
        draw.text((hx, current_y), heading_text, fill=primary_text, font=font_head)
        current_y += (head_font_size + 20)

    # 5. Recipient Name
    recipient_name = getattr(card, 'recipient_name', '') or ''
    if recipient_name:
        recip_text = f"For {recipient_name}"
        font_recip = _get_font(34, bold=True)
        bbox = draw.textbbox((0, 0), recip_text, font=font_recip)
        text_w = bbox[2] - bbox[0]
        recip_x = max(50, (WIDTH - text_w) // 2)

        # Shadow & text
        draw.text((recip_x + 1, current_y + 1), recip_text, fill=shadow_color, font=font_recip)
        draw.text((recip_x, current_y), recip_text, fill=secondary_text, font=font_recip)
        current_y += 50

    # 6. Recipient Photo (if exists on disk)
    photo_file = getattr(card, 'uploaded_photo', None) or getattr(card, 'recipient_photo', None)
    if photo_file and hasattr(photo_file, 'name') and photo_file.name:
        photo_path = os.path.join(settings.MEDIA_ROOT, photo_file.name)
        if os.path.exists(photo_path):
            try:
                with Image.open(photo_path) as p_img:
                    p_img = p_img.convert('RGBA')
                    p_size = 150
                    # Square crop
                    min_dim = min(p_img.size)
                    p_crop = p_img.crop((
                        (p_img.width - min_dim) // 2,
                        (p_img.height - min_dim) // 2,
                        (p_img.width + min_dim) // 2,
                        (p_img.height + min_dim) // 2
                    )).resize((p_size, p_size), Image.Resampling.LANCZOS)

                    # Circle mask
                    mask = Image.new('L', (p_size, p_size), 0)
                    mask_draw = ImageDraw.Draw(mask)
                    mask_draw.ellipse((0, 0, p_size, p_size), fill=255)

                    photo_x = (WIDTH - p_size) // 2
                    photo_y = current_y

                    # Outer border ring
                    ring_pad = 4
                    ring_outline = (255, 255, 255, 180) if not is_light_bg else (15, 23, 42, 100)
                    draw.ellipse(
                        [(photo_x - ring_pad, photo_y - ring_pad), (photo_x + p_size + ring_pad, photo_y + p_size + ring_pad)],
                        outline=ring_outline,
                        width=2
                    )

                    canvas.paste(p_crop, (photo_x, photo_y), mask)
                    current_y += p_size + 24
            except Exception as e:
                logger.warning(f"[card_generator] Could not render recipient photo for card {card.id}: {e}")

    # 7. Personal Message
    message = (
        getattr(card, 'personal_message', None)
        or getattr(card, 'message', None)
        or ''
    )

    if not message:
        elements = getattr(card, 'elements_json', None)
        if isinstance(elements, list):
            for el in elements:
                if isinstance(el, dict) and el.get('type') == 'text' and el.get('content'):
                    if len(el['content']) > len(message):
                        message = el['content']

    if not message:
        message = f"Wishing you joy, happiness, and all the best on your special {card.occasion or 'day'}!"

    # Wrap message
    font_msg = _get_font(26, bold=False)
    lines = []
    for paragraph in message.split('\n'):
        if paragraph.strip():
            lines.extend(textwrap.wrap(paragraph.strip(), width=48))
        else:
            lines.append('')

    lines = lines[:7]
    line_height = 38
    total_msg_h = len(lines) * line_height

    space_left = HEIGHT - 140 - current_y
    if space_left > total_msg_h:
        current_y += max(10, (space_left - total_msg_h) // 2 - 15)

    for line in lines:
        if line.strip():
            bbox = draw.textbbox((0, 0), line, font=font_msg)
            lw = bbox[2] - bbox[0]
            lx = (WIDTH - lw) // 2
            draw.text((lx + 1, current_y + 1), line, fill=shadow_color, font=font_msg)
            draw.text((lx, current_y), line, fill=secondary_text, font=font_msg)
        current_y += line_height

    # 8. Signature (if present)
    signature = getattr(card, 'signature', '') or ''
    if not signature and isinstance(getattr(card, 'text_style', None), dict):
        signature = card.text_style.get('signature', '')
    if signature:
        sig_text = signature if signature.lower().startswith('with') or signature.startswith('—') else f"— {signature}"
        font_sig = _get_font(24, bold=False)
        bbox = draw.textbbox((0, 0), sig_text, font=font_sig)
        sw = bbox[2] - bbox[0]
        sx = max(60, (WIDTH - sw) // 2)
        draw.text((sx + 1, current_y + 11), sig_text, fill=shadow_color, font=font_sig)
        draw.text((sx, current_y + 10), sig_text, fill=secondary_text, font=font_sig)

    # 7. Bottom Decorations
    emoji_font = _get_emoji_font(36)
    emoji_char = getattr(card, 'emoji', None) or '✨'
    sticker_char = getattr(card, 'sticker', None) or '🎁'

    try:
        draw.text((70, HEIGHT - 92), emoji_char, fill=primary_text, font=emoji_font)
        draw.text((WIDTH - 110, HEIGHT - 92), sticker_char, fill=primary_text, font=emoji_font)
    except Exception:
        # Fallback to stars
        draw.text((70, HEIGHT - 92), "★", fill=primary_text, font=_get_font(32))
        draw.text((WIDTH - 110, HEIGHT - 92), "★", fill=primary_text, font=_get_font(32))

    # 8. Encode to PNG
    buffer = io.BytesIO()
    canvas.save(buffer, format='PNG', optimize=True)
    img_bytes = buffer.getvalue()

    if save:
        filename = f'{card.id}_preview.png'
        if card.preview_image:
            try:
                card.preview_image.delete(save=False)
            except Exception:
                pass
        card.preview_image.save(filename, ContentFile(img_bytes), save=True)
        logger.info(f"[card_generator] Authoritative fallback preview saved for card {card.id}: {card.preview_image.name} ({len(img_bytes)} bytes)")

    return img_bytes

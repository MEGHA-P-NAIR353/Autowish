"""
AutoWish AI - Greeting Card Theme Configuration

Defines canonical card themes, color palettes, gradients, and aliases used across:
- Minimal Card Creator
- Full Card Editor
- Card Preview Generator (Pillow)
- Email Delivery Worker
- DRF Serializer Validation
"""

CARD_THEMES = {
    'midnight': {
        'key': 'midnight',
        'label': 'Midnight Indigo',
        'bg_color': '#0F172A',
        'gradient': 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
        'gradient_start': '#0F172A',
        'gradient_end': '#1E1B4B',
        'text_color': '#FFFFFF',
        'accent_color': '#818CF8',
        'border_color': 'rgba(129, 140, 248, 0.4)',
        'is_dark': True,
        'decor': 'stars',
    },
    'champagne': {
        'key': 'champagne',
        'label': 'Champagne Gold',
        'bg_color': '#1A1612',
        'gradient': 'linear-gradient(135deg, #1C1917 0%, #292014 100%)',
        'gradient_start': '#1C1917',
        'gradient_end': '#292014',
        'text_color': '#FEF3C7',
        'accent_color': '#F59E0B',
        'border_color': 'rgba(245, 158, 11, 0.4)',
        'is_dark': True,
        'decor': 'sparkles',
    },
    'velvet': {
        'key': 'velvet',
        'label': 'Celebration Velvet',
        'bg_color': '#2E1065',
        'gradient': 'linear-gradient(135deg, #2E1065 0%, #3B0764 100%)',
        'gradient_start': '#2E1065',
        'gradient_end': '#3B0764',
        'text_color': '#FAF5FF',
        'accent_color': '#D946EF',
        'border_color': 'rgba(217, 70, 239, 0.4)',
        'is_dark': True,
        'decor': 'balloons',
    },
    'rose': {
        'key': 'rose',
        'label': 'Rose Romance',
        'bg_color': '#2B1118',
        'gradient': 'linear-gradient(135deg, #2B1118 0%, #4C0519 100%)',
        'gradient_start': '#2B1118',
        'gradient_end': '#4C0519',
        'text_color': '#FFE4E6',
        'accent_color': '#F43F5E',
        'border_color': 'rgba(244, 63, 94, 0.4)',
        'is_dark': True,
        'decor': 'hearts',
    },
    'ocean': {
        'key': 'ocean',
        'label': 'Ocean Azure',
        'bg_color': '#082F49',
        'gradient': 'linear-gradient(135deg, #082F49 0%, #0C4A6E 100%)',
        'gradient_start': '#082F49',
        'gradient_end': '#0C4A6E',
        'text_color': '#F0FDF4',
        'accent_color': '#06B6D4',
        'border_color': 'rgba(6, 182, 212, 0.4)',
        'is_dark': True,
        'decor': 'stars',
    },
    'emerald': {
        'key': 'emerald',
        'label': 'Emerald Glow',
        'bg_color': '#064E3B',
        'gradient': 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)',
        'gradient_start': '#064E3B',
        'gradient_end': '#022C22',
        'text_color': '#ECFDF5',
        'accent_color': '#10B981',
        'border_color': 'rgba(16, 185, 129, 0.4)',
        'is_dark': True,
        'decor': 'sparkles',
    },
    'light': {
        'key': 'light',
        'label': 'Light',
        'bg_color': '#F8FAFC',
        'gradient': 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 100%)',
        'gradient_start': '#FFFFFF',
        'gradient_end': '#E2E8F0',
        'text_color': '#0F172A',
        'accent_color': '#6366F1',
        'border_color': 'rgba(15, 23, 42, 0.15)',
        'is_dark': False,
        'decor': 'stars',
    },
    'dark': {
        'key': 'dark',
        'label': 'Dark',
        'bg_color': '#1A1A2E',
        'gradient': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        'gradient_start': '#0F172A',
        'gradient_end': '#1E293B',
        'text_color': '#FFFFFF',
        'accent_color': '#A855F7',
        'border_color': 'rgba(255, 255, 255, 0.2)',
        'is_dark': True,
        'decor': 'sparkles',
    },
    'gradient': {
        'key': 'gradient',
        'label': 'Gradient',
        'bg_color': '#1E1B4B',
        'gradient': 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 100%)',
        'gradient_start': '#1E1B4B',
        'gradient_end': '#4C1D95',
        'text_color': '#FFFFFF',
        'accent_color': '#EC4899',
        'border_color': 'rgba(236, 72, 153, 0.35)',
        'is_dark': True,
        'decor': 'sparkles',
    },
    'glass': {
        'key': 'glass',
        'label': 'Glass',
        'bg_color': '#111827',
        'gradient': 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
        'gradient_start': '#111827',
        'gradient_end': '#1F2937',
        'text_color': '#F3F4F6',
        'accent_color': '#38BDF8',
        'border_color': 'rgba(56, 189, 248, 0.3)',
        'is_dark': True,
        'decor': 'stars',
    },
}

THEME_ALIASES = {
    'midnight_indigo': 'midnight',
    'midnight-indigo': 'midnight',
    'champagne_gold': 'champagne',
    'champagne-gold': 'champagne',
    'celebration_velvet': 'velvet',
    'celebration-velvet': 'velvet',
    'rose_romance': 'rose',
    'rose-romance': 'rose',
    'ocean_azure': 'ocean',
    'ocean-azure': 'ocean',
    'emerald_glow': 'emerald',
    'emerald-glow': 'emerald',
    'dark_classic': 'dark',
    'classic_dark': 'dark',
    'light_elegance': 'light',
    'dynamic_gradient': 'gradient',
    'frosted_glass': 'glass',
}


def normalize_card_theme(theme_raw: str) -> str:
    """
    Normalizes a theme string by stripping, lowering, and resolving known aliases.
    Returns normalized string, or empty string if None.
    """
    if not theme_raw:
        return ''
    cleaned = str(theme_raw).strip().lower()
    return THEME_ALIASES.get(cleaned, cleaned)


def is_valid_card_theme(theme_key: str) -> bool:
    """Checks whether normalized theme key is supported."""
    normalized = normalize_card_theme(theme_key)
    return normalized in CARD_THEMES


def get_theme_config(theme_key: str) -> dict:
    """Returns the theme config dictionary, falling back to 'dark'."""
    normalized = normalize_card_theme(theme_key)
    return CARD_THEMES.get(normalized, CARD_THEMES['dark'])


def get_supported_theme_keys() -> list:
    """Returns a list of supported canonical theme keys."""
    return list(CARD_THEMES.keys())

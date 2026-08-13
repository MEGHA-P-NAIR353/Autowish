export interface ElementJSON {
  id: string;
  type: 'text' | 'emoji' | 'shape' | 'image' | 'sticker';
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardTemplate {
  id: number;
  title: string;
  slug?: string;
  occasion: string;
  category: string; // theme/style
  description?: string;
  background_color: string;
  background_image_url?: string | null;
  preview_image_url?: string | null;
  thumbnail_image_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  text_color?: string;
  font_family?: string;
  font_size?: number;
  layout_type?: string;
  card_width?: number;
  card_height?: number;
  elements_json: ElementJSON[] | any[];
  premium: boolean;
  featured: boolean;
  is_active?: boolean;
  sort_order?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  thumbnail_url?: string;
  style_badge?: string;
  theme_badge?: string;
}

// ─── Premium template category metadata ──────────────────────────────────────────
export interface TemplateCategory {
  key: string;
  label: string;
  emoji: string;
  gradient: string; // tailwind gradient classes for the filter chip
}

// Crop shape supported by the image cropper
export type CropShape = 'rect' | 'round';

// Cropped image result metadata
export interface CroppedImage {
  url: string;       // object URL or data URL of cropped output
  blob?: Blob;
  width: number;
  height: number;
}

export interface GreetingCardData {
  id?: number;
  title: string;
  occasion?: string;
  recipient_name: string;
  card_size: string;
  card_theme: string;
  card_width: number;
  card_height: number;
  background_color: string;
  background_image?: string;
  background_pattern?: string;
  background_gradient?: string;
  elements_json: ElementJSON[];
  status: 'draft' | 'published';
  is_favorite?: boolean;
  recipient_photo?: string;
  emoji?: string;
  sticker?: string;
  font_family?: string;
  font_size?: number;
  text_color?: string;
  personal_message?: string;
  recipient_email?: string;
  selectedContactId?: number | null;
}

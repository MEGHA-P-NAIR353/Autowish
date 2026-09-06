import { CardTemplate, GreetingCardData, ElementJSON } from '../types';

/**
 * Safely parse JSON template data that might already be parsed or a string.
 */
export function parseTemplateData(value: unknown): any {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.error('Invalid template JSON', error, { value });
      throw new Error('Template data is invalid');
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  throw new Error('Unsupported template data format');
}

/**
 * Normalizes a raw CardTemplate or API card response into a safe GreetingCardData model
 * for the editor and live preview.
 */
export function normalizeTemplateForEditor(
  template: Partial<CardTemplate> | Record<string, any>,
  currentCardData?: Partial<GreetingCardData>
): GreetingCardData {
  let parsedElements: ElementJSON[] = [];

  const rawElements = template.elements_json || template.elements;
  if (rawElements) {
    try {
      const parsed = parseTemplateData(rawElements);
      parsedElements = Array.isArray(parsed) ? parsed : [];
    } catch {
      parsedElements = [];
    }
  }

  return {
    id: typeof template.id === 'number' ? template.id : undefined,
    title: template.title || currentCardData?.title || 'My Custom Greeting Card',
    occasion: template.occasion || currentCardData?.occasion || 'Birthday',
    recipient_name: template.recipient_name || currentCardData?.recipient_name || '',
    card_size: template.card_size || currentCardData?.card_size || 'instagram_square',
    card_theme: template.card_theme || currentCardData?.card_theme || 'dark',
    card_width: Number(template.card_width) || currentCardData?.card_width || 500,
    card_height: Number(template.card_height) || currentCardData?.card_height || 500,
    background_color: template.background_color || currentCardData?.background_color || '#0F172A',
    background_image: template.background_image_url || template.background_image || currentCardData?.background_image || '',
    background_pattern: template.background_pattern || currentCardData?.background_pattern || '',
    background_gradient: template.background_gradient || currentCardData?.background_gradient || '',
    elements_json: parsedElements,
    status: (template.status as 'draft' | 'published') || currentCardData?.status || 'draft',
    font_family: template.font_family || currentCardData?.font_family || 'Inter',
    font_size: Number(template.font_size) || currentCardData?.font_size || 18,
    text_color: template.text_color || template.font_color || currentCardData?.text_color || '#FFFFFF',
    personal_message: template.personal_message || template.message || currentCardData?.personal_message || '',
    recipient_photo: template.recipient_photo || template.uploaded_photo_url || currentCardData?.recipient_photo || '',
    emoji: template.emoji || currentCardData?.emoji || '',
    sticker: template.sticker || currentCardData?.sticker || '',
    selectedContactId: template.selectedContactId || (template.contact_info?.id ?? null) || currentCardData?.selectedContactId || null,
  };
}

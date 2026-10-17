import React, { memo, useMemo, useState, useEffect, ForwardedRef } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { GreetingCardData } from '../types';
import { useAutoFitText } from '../hooks/useAutoFitText';
import { AutoFitResult, UNICODE_FONT_FALLBACKS, DEFAULT_MIN_FONT_SIZE } from '../utils/textMeasurement';
import { DecorLayer, getDefaultDecor, getDefaultHeading } from './DecorLayer';
import { getCardTheme } from '../utils/cardThemes';

// Preloaded google fonts tracker
const loadedFonts = new Set<string>();

const UNICODE_FALLBACK_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap';

export function loadGoogleFont(fontFamily: string) {
  // Always ensure Unicode fallback fonts (Malayalam, Tamil, Devanagari, Arabic) are present
  if (!loadedFonts.has('__unicode_fallbacks__') && typeof document !== 'undefined') {
    loadedFonts.add('__unicode_fallbacks__');
    const uLink = document.createElement('link');
    uLink.href = UNICODE_FALLBACK_FONTS_URL;
    uLink.rel = 'stylesheet';
    document.head.appendChild(uLink);
  }

  if (!fontFamily || fontFamily === 'sans-serif' || fontFamily === 'Inter') return;
  if (loadedFonts.has(fontFamily)) return;
  loadedFonts.add(fontFamily);
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}:wght@400;600;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

export interface GreetingCardRendererProps {
  cardData: GreetingCardData;
  className?: string;
  onAutoFitResult?: (result: AutoFitResult) => void;
  showOverflowWarningBadge?: boolean;
  isExportMode?: boolean;
}

// Flow element IDs from templates that map to structured flow sections
const FLOW_ELEMENT_IDS = new Set([
  'el_title',
  'el_heading',
  'el_subtitle',
  'el_body',
  'el_message',
  'el_cake',
  'el_hearts',
  'el_star',
  'el_balloon',
  'el_popper',
]);

/**
 * Canonical GreetingCardRenderer used across:
 * - Editor Live Preview (Step 3)
 * - Final Step Preview (Step 4)
 * - PNG Download Export (html2canvas)
 * - Save Preview for Email & Saved Cards
 * - Quick Preview Modal in Templates Gallery
 * - GreetingPreview detail page
 */
export const GreetingCardRenderer = React.forwardRef<HTMLDivElement, GreetingCardRendererProps>(
  (
    { cardData, className = '', onAutoFitResult, showOverflowWarningBadge = true, isExportMode = false },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const {
      occasion,
      recipient_name,
      heading,
      subtitle,
      footer,
      signature,
      background_color,
      background_gradient,
      background_pattern,
      background_image,
      personal_message = '',
      font_family = 'Inter',
      font_size = 18,
      text_color = '#FFFFFF',
      accent_color,
      primary_color,
      recipient_photo,
      emoji,
      sticker,
      card_width = 500,
      card_height = 500,
      elements_json = [],
      decor,
      metadata,
    } = cardData;

    const [photoError, setPhotoError] = useState(false);

    useEffect(() => {
      setPhotoError(false);
    }, [recipient_photo]);

    useEffect(() => {
      loadGoogleFont(font_family);
    }, [font_family]);

    const normalizeMediaUrl = (url?: string) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:'))
        return url;
      if (url.startsWith('/media/')) return url;
      if (url.startsWith('media/')) return '/' + url;
      if (url.startsWith('/')) return url;
      return '/media/' + url;
    };

    // Compute background style
    const resolvedBgImage = useMemo(() => normalizeMediaUrl(background_image), [background_image]);
    const resolvedPhoto = useMemo(() => normalizeMediaUrl(recipient_photo), [recipient_photo]);

    const themeObj = useMemo(() => getCardTheme(cardData.card_theme), [cardData.card_theme]);

    const bgStyle = useMemo((): React.CSSProperties => {
      if (resolvedBgImage) {
        return {
          backgroundImage: `url(${resolvedBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        };
      }
      if (background_gradient) {
        return { background: background_gradient };
      }
      if (themeObj?.gradient) {
        return { background: themeObj.gradient };
      }
      return { backgroundColor: background_color || themeObj?.bg || '#0F172A' };
    }, [resolvedBgImage, background_gradient, background_color, themeObj]);

    const hasPhoto = Boolean(resolvedPhoto && !photoError);
    const hasRecipient = Boolean(recipient_name && recipient_name.trim());

    // Resolve decorative vector layer and accent color
    const resolvedDecor = useMemo(() => {
      if (decor && decor !== 'none') return decor;
      if (metadata?.decor && metadata.decor !== 'none') return metadata.decor as string;
      return themeObj?.decor || getDefaultDecor(occasion);
    }, [decor, metadata, occasion, themeObj]);

    const resolvedAccent = useMemo(() => {
      return accent_color || primary_color || themeObj?.accentColor || (text_color && text_color !== '#FFFFFF' ? text_color : '#818cf8');
    }, [accent_color, primary_color, themeObj, text_color]);

    // Resolve heading
    const resolvedHeading = useMemo(() => {
      if (heading && heading.trim()) return heading.trim();
      // Check if elements_json contains an explicit el_title
      const titleEl = elements_json.find(
        (e: any) => (e.id === 'el_title' || e.id === 'el_heading') && typeof e.content === 'string' && e.content.trim()
      );
      if (titleEl && titleEl.content.trim()) return titleEl.content.trim();
      return getDefaultHeading(occasion);
    }, [heading, elements_json, occasion]);

    // Resolve subtitle (e.g., "On Your Wedding Day")
    const resolvedSubtitle = useMemo(() => {
      if (subtitle && subtitle.trim()) return subtitle.trim();
      const subEl = elements_json.find(
        (e: any) => e.id === 'el_subtitle' && typeof e.content === 'string' && e.content.trim()
      );
      if (subEl && subEl.content.trim()) return subEl.content.trim();
      return '';
    }, [subtitle, elements_json]);

    // Dynamic typography scaling
    const headingFontSize = useMemo(() => {
      if (!resolvedHeading) return 24;
      const len = resolvedHeading.length;
      if (len > 35) return 18;
      if (len > 25) return 21;
      if (len > 18) return 24;
      return 27;
    }, [resolvedHeading]);

    const recipientFontSize = useMemo(() => {
      if (!recipient_name) return 16;
      const len = recipient_name.length;
      if (len > 35) return 14;
      if (len > 24) return 16;
      if (len > 16) return 18;
      return 20;
    }, [recipient_name]);

    // Calculate available vertical space for message
    const targetWidth = Math.max(280, (card_width || 500) - 80);
    const targetHeight = useMemo(() => {
      let available = (card_height || 500) - 130; // Top header (40px) + bottom decorations (45px) + safe padding (45px)
      if (resolvedHeading) available -= (headingFontSize + 10);
      if (resolvedSubtitle) available -= 22;
      if (hasRecipient) available -= (recipientFontSize + 10);
      if (hasPhoto) available -= 86;
      if (signature || footer) available -= 24;
      return Math.max(65, available - 8);
    }, [card_height, resolvedHeading, headingFontSize, resolvedSubtitle, hasRecipient, recipientFontSize, hasPhoto, signature, footer]);

    // Binary search auto-fit hook for message text
    const autoFitResult = useAutoFitText({
      text: personal_message,
      targetWidth,
      targetHeight,
      maxFontSize: font_size || 18,
      minFontSize: DEFAULT_MIN_FONT_SIZE,
      fontFamily: font_family,
      lineHeight: 1.6,
      paddingX: 8,
    });

    useEffect(() => {
      if (onAutoFitResult) {
        onAutoFitResult(autoFitResult);
      }
    }, [autoFitResult, onAutoFitResult]);

    const nameColor = text_color || '#FFFFFF';
    const msgColor = text_color ? `${text_color}dd` : 'rgba(255,255,255,0.88)';

    const rootStyle: React.CSSProperties = useMemo(
      () => ({
        ...bgStyle,
        boxSizing: 'border-box',
        ...(isExportMode
          ? {
              width: `${card_width || 500}px`,
              height: `${card_height || 500}px`,
              maxWidth: `${card_width || 500}px`,
              maxHeight: `${card_height || 500}px`,
            }
          : {}),
      }),
      [bgStyle, isExportMode, card_width, card_height]
    );

    // Identify custom elements in elements_json that are NOT part of the standard flow
    const customElements = useMemo(() => {
      if (!Array.isArray(elements_json)) return [];
      return elements_json.filter((el: any) => {
        if (!el || typeof el !== 'object') return false;
        // Skip flow elements that are already handled in the structured flow
        if (FLOW_ELEMENT_IDS.has(el.id)) return false;
        // Skip text elements whose content matches personal_message or resolvedHeading
        if (el.type === 'text' && el.content) {
          const c = String(el.content).trim();
          if (c === personal_message.trim() || c === resolvedHeading.trim()) return false;
        }
        return true;
      });
    }, [elements_json, personal_message, resolvedHeading]);

    return (
      <div
        ref={ref}
        id="greeting-card-canonical-canvas"
        data-card-renderer="true"
        className={`relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 flex flex-col justify-between select-none ${className}`}
        style={rootStyle}
      >
        {/* Background pattern overlay (when no custom image) */}
        {background_pattern && !background_image && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: background_pattern,
              backgroundSize: '16px 16px',
              opacity: 0.35,
              mixBlendMode: 'overlay',
            }}
          />
        )}

        {/* Vector Decorative Art Layer (hearts, florals, rings, balloons, snow, etc.) */}
        <DecorLayer decor={resolvedDecor} accent={resolvedAccent} />

        {/* Subtle inner safe border */}
        <div className="absolute inset-3 pointer-events-none border border-white/10 rounded-2xl" />

        {/* Any truly custom elements (e.g. from canvas editor) positioned safely using proportional coordinates */}
        {customElements.map((element: any) => {
          if (!element?.content && element.type !== 'image') return null;

          const cw = Number(card_width) || 500;
          const ch = Number(card_height) || 500;
          const rawX = Number(element.x) || 0;
          const rawY = Number(element.y) || 0;
          const rawW = Number(element.width) || 80;
          const rawH = Number(element.height) || 40;

          // Convert pixels to safe clamped percentages on card canvas
          const leftPct = Math.max(0, Math.min(92, (rawX / cw) * 100));
          const topPct = Math.max(0, Math.min(92, (rawY / ch) * 100));
          const widthPct = Math.min(100 - leftPct, Math.max(5, (rawW / cw) * 100));
          const heightPct =
            element.type === 'emoji'
              ? 'auto'
              : `${Math.min(100 - topPct, Math.max(4, (rawH / ch) * 100))}%`;

          const style: React.CSSProperties = {
            position: 'absolute',
            left: `${leftPct}%`,
            top: `${topPct}%`,
            width: `${widthPct}%`,
            height: heightPct,
            zIndex: 12,
            boxSizing: 'border-box',
          };

          if (element.type === 'image') {
            const src = normalizeMediaUrl(element.src || element.content);
            return (
              <img
                key={element.id || Math.random()}
                src={src}
                alt="Custom element"
                className="object-contain pointer-events-none"
                style={style}
                crossOrigin="anonymous"
              />
            );
          }

          if (element.type === 'emoji' || element.type === 'sticker') {
            return (
              <div
                key={element.id || Math.random()}
                className="flex items-center justify-center text-center pointer-events-none select-none leading-none"
                style={{ ...style, fontSize: `${element.fontSize || 36}px` }}
              >
                {element.content}
              </div>
            );
          }

          return (
            <div
              key={element.id || Math.random()}
              className="flex items-center justify-center text-center whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
              style={{
                ...style,
                color: element.color || nameColor,
                fontFamily: element.fontFamily || `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                fontSize: `${element.fontSize || font_size}px`,
                fontWeight: element.fontWeight || 'normal',
                letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
              }}
            >
              {element.content}
            </div>
          );
        })}

        {/* Top bar: Occasion badge + AutoWish AI brand pill */}
        <div className="relative z-10 flex justify-between items-center px-6 pt-5 flex-shrink-0">
          <span className="text-[9px] font-extrabold tracking-widest uppercase text-white/70">
            {occasion || 'Special Wish'}
          </span>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
            <Sparkles size={9} className="text-indigo-300 animate-pulse" />
            <span className="text-[8px] font-bold text-white/80 tracking-wide">Auto-Wish AI</span>
          </div>
        </div>

        {/* Center content - Strictly Safe Vertical Flow Layout, Zero Clipping */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-6 py-2 gap-2 min-h-0 overflow-visible">
          {/* 1. Main Greeting Heading */}
          {resolvedHeading && (
            <h1
              data-card-heading="true"
              className="font-extrabold tracking-tight drop-shadow-md max-w-full flex-shrink-0 select-text m-0 px-2 leading-tight"
              style={{
                fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                color: nameColor,
                fontSize: `${headingFontSize}px`,
                overflow: 'visible',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              {resolvedHeading}
            </h1>
          )}

          {/* 2. Subtitle (if present, e.g. "On Your Wedding Day") */}
          {resolvedSubtitle && (
            <div
              className="text-xs font-semibold tracking-wider uppercase opacity-85 flex-shrink-0 px-2 m-0"
              style={{
                fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                color: resolvedAccent,
              }}
            >
              {resolvedSubtitle}
            </div>
          )}

          {/* 3. Recipient Name */}
          {hasRecipient ? (
            <h2
              className="font-bold tracking-tight drop-shadow-sm max-w-full flex-shrink-0 select-text m-0 px-2 leading-snug"
              style={{
                fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                color: nameColor,
                fontSize: `${recipientFontSize}px`,
                overflow: 'visible',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              For {recipient_name}
            </h2>
          ) : (
            <h2
              className="font-bold tracking-tight opacity-30 text-white flex-shrink-0 select-none m-0"
              style={{
                fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                fontSize: '15px',
                lineHeight: 1.3,
              }}
            >
              Recipient Name
            </h2>
          )}

          {/* 4. Recipient Photo (circular with border and shadow) */}
          {hasPhoto && (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/40 shadow-lg flex-shrink-0">
              <img
                src={resolvedPhoto}
                alt="Recipient"
                className="w-full h-full object-cover"
                onError={() => setPhotoError(true)}
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* 5. Personal Message with auto-fit responsive typography and zero clipping */}
          <div
            className="w-full flex items-center justify-center flex-1 min-h-0 px-2"
            style={{
              maxHeight: `${targetHeight}px`,
              overflow: isExportMode ? 'visible' : 'hidden',
            }}
          >
            {personal_message ? (
              <p
                data-card-message="true"
                className="drop-shadow-sm px-2 m-0 text-center select-text"
                style={{
                  fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                  fontSize: `${autoFitResult.fittedFontSize}px`,
                  lineHeight: 1.6,
                  color: msgColor,
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                  whiteSpace: 'pre-wrap',
                  overflow: isExportMode ? 'visible' : 'hidden',
                  maxHeight: '100%',
                }}
              >
                {personal_message}
              </p>
            ) : (
              <p
                className="italic opacity-30 text-white m-0"
                style={{
                  fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                  fontSize: '13px',
                }}
              >
                Your heartfelt message will appear here...
              </p>
            )}
          </div>

          {/* 6. Signature / Footer (if present) */}
          {(signature || footer) && (
            <div
              className="text-xs italic opacity-80 flex-shrink-0 select-text px-2 m-0"
              style={{
                fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                color: msgColor,
              }}
            >
              {signature || footer}
            </div>
          )}
        </div>

        {/* Bottom bar: emoji + sticker - Inset safely from rounded corners */}
        <div className="relative z-10 flex justify-between items-center px-7 pb-4 flex-shrink-0">
          <span className="text-3xl drop-shadow-md select-none leading-none" role="img" aria-label="decoration">
            {emoji || '✨'}
          </span>
          {sticker && (
            <span
              className="text-3xl drop-shadow-lg select-none transform rotate-3 transition-transform hover:scale-110 leading-none"
              role="img"
              aria-label="sticker"
            >
              {sticker}
            </span>
          )}
        </div>

        {/* Visual Overflow Notice for preview only */}
        {showOverflowWarningBadge && autoFitResult.overflow && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-rose-950/90 border border-rose-500/50 text-rose-200 px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md animate-bounce"
            title="Message exceeds readable card space"
          >
            <AlertCircle size={12} className="text-rose-400" />
            <span>Text overflow — Shorten message</span>
          </div>
        )}
      </div>
    );
  }
);

GreetingCardRenderer.displayName = 'GreetingCardRenderer';
export default memo(GreetingCardRenderer);

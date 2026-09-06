import React, { memo, useMemo, useState, useEffect, ForwardedRef } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { GreetingCardData } from '../types';
import { useAutoFitText } from '../hooks/useAutoFitText';
import { AutoFitResult, UNICODE_FONT_FALLBACKS, DEFAULT_MIN_FONT_SIZE } from '../utils/textMeasurement';

// Preloaded google fonts tracker
const loadedFonts = new Set<string>();

export function loadGoogleFont(fontFamily: string) {
  if (!fontFamily || fontFamily === 'sans-serif' || fontFamily === 'Inter') return;
  if (loadedFonts.has(fontFamily)) return;
  loadedFonts.add(fontFamily);
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Malayalam:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

export interface GreetingCardRendererProps {
  cardData: GreetingCardData;
  className?: string;
  onAutoFitResult?: (result: AutoFitResult) => void;
  showOverflowWarningBadge?: boolean;
}

/**
 * Canonical GreetingCardRenderer used across:
 * - Editor Live Preview (Step 3)
 * - Final Step Preview (Step 4)
 * - PNG Download Export (html2canvas)
 * - Save Preview for Email / WhatsApp
 */
export const GreetingCardRenderer = React.forwardRef<HTMLDivElement, GreetingCardRendererProps>(
  ({ cardData, className = '', onAutoFitResult, showOverflowWarningBadge = true }, ref: ForwardedRef<HTMLDivElement>) => {
    const {
      occasion,
      recipient_name,
      background_color,
      background_gradient,
      background_pattern,
      background_image,
      personal_message = '',
      font_family = 'Inter',
      font_size = 18,
      text_color = '#FFFFFF',
      recipient_photo,
      emoji,
      sticker,
      card_width = 500,
      card_height = 500,
    } = cardData;

    const [photoError, setPhotoError] = useState(false);

    useEffect(() => {
      setPhotoError(false);
    }, [recipient_photo]);

    useEffect(() => {
      loadGoogleFont(font_family);
    }, [font_family]);

    // Compute background style
    const bgStyle = useMemo((): React.CSSProperties => {
      if (background_image) {
        return {
          backgroundImage: `url(${background_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        };
      }
      if (background_gradient) {
        return { background: background_gradient };
      }
      return { backgroundColor: background_color || '#0F172A' };
    }, [background_image, background_gradient, background_color]);

    const hasPhoto = Boolean(recipient_photo && !photoError);
    const hasRecipient = Boolean(recipient_name);

    // Calculate available message bounds based on card layout
    // Card size reference: 500x500
    // Padding: 24px left/right -> 452px width
    // Height: Top bar ~50px, Bottom bar ~50px, Recipient title ~40px, Photo ~90px, gaps ~30px
    const targetWidth = Math.max(280, (card_width || 500) - 80);
    const targetHeight = useMemo(() => {
      let availableHeight = (card_height || 500) - 140; // Subtract header & footer padding
      if (hasRecipient) availableHeight -= 42;
      if (hasPhoto) availableHeight -= 92;
      return Math.max(90, availableHeight);
    }, [card_height, hasRecipient, hasPhoto]);

    // Binary search auto-fit hook
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

    // Notify parent of auto-fit result if requested
    useEffect(() => {
      if (onAutoFitResult) {
        onAutoFitResult(autoFitResult);
      }
    }, [autoFitResult, onAutoFitResult]);

    const nameColor = text_color || '#FFFFFF';
    const msgColor = text_color ? `${text_color}dd` : 'rgba(255,255,255,0.85)';

    return (
      <div
        ref={ref}
        id="greeting-card-canonical-canvas"
        className={`relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 flex flex-col justify-between select-none ${className}`}
        style={bgStyle}
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

        {/* Inner decorative border */}
        <div className="absolute inset-3 pointer-events-none border border-white/8 rounded-2xl" />

        {/* Top bar: Occasion + Brand */}
        <div className="relative z-10 flex justify-between items-center px-6 pt-6 flex-shrink-0">
          <span className="text-[9px] font-extrabold tracking-widest uppercase text-white/60">
            {occasion || 'Special Wish'}
          </span>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            <Sparkles size={8} className="text-indigo-300 animate-pulse" />
            <span className="text-[8px] font-bold text-white/80">Auto-Wish AI</span>
          </div>
        </div>

        {/* Center content - Strictly Fixed Layout, Zero Scrollbars */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-6 py-2 gap-3 min-h-0 overflow-hidden">
          {/* Recipient name */}
          {hasRecipient ? (
            <h2
              className="font-extrabold tracking-tight drop-shadow-md leading-tight max-w-full truncate flex-shrink-0"
              style={{
                fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                color: nameColor,
                fontSize: '22px',
              }}
            >
              For {recipient_name}
            </h2>
          ) : (
            <h2
              className="font-extrabold tracking-tight opacity-30 text-white leading-tight flex-shrink-0"
              style={{
                fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                fontSize: '18px',
              }}
            >
              Recipient Name
            </h2>
          )}

          {/* Recipient photo */}
          {hasPhoto && (
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0">
              <img
                src={recipient_photo}
                alt="Recipient"
                className="w-full h-full object-cover"
                onError={() => setPhotoError(true)}
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* Personal message with auto-fit font size */}
          <div
            className="w-full flex items-center justify-center overflow-hidden flex-1 min-h-0"
            style={{
              maxHeight: `${targetHeight}px`,
            }}
          >
            {personal_message ? (
              <p
                className="drop-shadow-sm px-2 m-0 text-center select-text"
                style={{
                  fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                  fontSize: `${autoFitResult.fittedFontSize}px`,
                  lineHeight: 1.6,
                  color: msgColor,
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                  maxHeight: '100%',
                }}
              >
                {personal_message}
              </p>
            ) : (
              <p
                className="italic opacity-25 text-white m-0"
                style={{
                  fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                  fontSize: '13px',
                }}
              >
                Your heartfelt message will appear here...
              </p>
            )}
          </div>
        </div>

        {/* Bottom decoration: emoji + sticker */}
        <div className="relative z-10 flex justify-between items-end px-6 pb-6 flex-shrink-0">
          <span className="text-3xl drop-shadow-md select-none leading-none" role="img" aria-label="decoration">
            {emoji || '✨'}
          </span>
          {sticker && (
            <span
              className="text-4xl drop-shadow-lg select-none transform rotate-6 transition-transform hover:scale-110 leading-none"
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

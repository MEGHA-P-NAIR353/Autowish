import React, { memo, useMemo, ForwardedRef, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { GreetingCardData } from '../types';

// Preloaded google fonts tracker to avoid duplicate link tags
const loadedFonts = new Set<string>();

// Font fallbacks for full multi-language support
const UNICODE_FONT_FALLBACKS = `'Noto Sans', 'Noto Sans Malayalam', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', sans-serif`;

function loadGoogleFont(fontFamily: string) {
  if (!fontFamily || fontFamily === 'sans-serif') return;
  if (loadedFonts.has(fontFamily)) return;
  loadedFonts.add(fontFamily);
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Malayalam:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

interface LivePreviewProps {
  cardData: GreetingCardData;
}

const LivePreview = React.forwardRef(
  ({ cardData }: LivePreviewProps, ref: ForwardedRef<HTMLDivElement>) => {
    const {
      occasion,
      recipient_name,
      background_color,
      background_gradient,
      background_pattern,
      background_image,
      personal_message,
      font_family = 'Inter',
      font_size = 18,
      text_color = '#FFFFFF',
      recipient_photo,
      emoji,
      sticker,
    } = cardData;

    const [photoError, setPhotoError] = useState(false);

    // Reset photo error when photo URL changes
    useEffect(() => {
      setPhotoError(false);
    }, [recipient_photo]);

    // Load google font
    useEffect(() => {
      loadGoogleFont(font_family);
    }, [font_family]);

    // Compute background style — memoized so it only re-calculates on relevant changes
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

    const messageFontSize = Math.min(font_size, 22); // cap for preview
    const nameColor = text_color || '#FFFFFF';
    const msgColor = text_color
      ? `${text_color}dd`
      : 'rgba(255,255,255,0.85)';

    return (
      <div className="w-full flex items-center justify-center">
        <div
          ref={ref}
          id="greeting-card-live-preview"
          className="relative w-full max-w-[460px] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 flex flex-col justify-between transition-all duration-300"
          style={bgStyle}
        >
          {/* Background pattern overlay — only when no background image */}
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
          <div className="relative z-10 flex justify-between items-center px-6 pt-6">
            <span className="text-[9px] font-extrabold tracking-widest uppercase text-white/50">
              {occasion || 'Special Wish'}
            </span>
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              <Sparkles size={8} className="text-indigo-300 animate-pulse" />
              <span className="text-[8px] font-bold text-white/80">Auto-Wish AI</span>
            </div>
          </div>

          {/* Center content */}
          <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-6 py-4 gap-4">
            {/* Recipient name */}
            {recipient_name ? (
              <h2
                className="font-extrabold tracking-tight drop-shadow-md leading-tight"
                style={{ fontFamily: font_family, color: nameColor, fontSize: '24px' }}
              >
                For {recipient_name}
              </h2>
            ) : (
              <h2
                className="font-extrabold tracking-tight opacity-30 text-white leading-tight"
                style={{ fontFamily: font_family, fontSize: '20px' }}
              >
                Recipient Name
              </h2>
            )}

            {/* Recipient photo */}
            {recipient_photo && !photoError && (
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

            {/* Personal message */}
            {personal_message ? (
              <p
                className="drop-shadow-sm max-h-[160px] overflow-y-auto px-2"
                style={{
                  fontFamily: `'${font_family}', ${UNICODE_FONT_FALLBACKS}`,
                  fontSize: `${messageFontSize}px`,
                  lineHeight: 1.65,
                  color: msgColor,
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {personal_message}
              </p>
            ) : (
              <p
                className="italic opacity-25 text-white"
                style={{ fontFamily: font_family, fontSize: '13px' }}
              >
                Your heartfelt message will appear here...
              </p>
            )}
          </div>

          {/* Bottom decoration: emoji + sticker */}
          <div className="relative z-10 flex justify-between items-end px-6 pb-6">
            <span className="text-3xl drop-shadow-md select-none" role="img" aria-label="decoration">
              {emoji || '✨'}
            </span>
            {sticker && (
              <span
                className="text-4xl drop-shadow-lg select-none transform rotate-6 transition-transform hover:scale-110"
                role="img"
                aria-label="sticker"
              >
                {sticker}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

LivePreview.displayName = 'LivePreview';
export default memo(LivePreview);

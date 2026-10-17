import React, { memo, useEffect } from 'react';
import { CardTemplate } from '../types';
import { DecorLayer } from './DecorLayer';

// Google Fonts used by the template library
const TEMPLATE_FONTS = [
  'Poppins', 'Baloo 2', 'Fredoka', 'Cormorant Garamond', 'Playfair Display',
  'Cinzel', 'Amiri', 'Inter', 'Mountains of Christmas', 'Dancing Script', 'Pacifico',
  'Montserrat',
];

const loadedFonts = new Set<string>();
function useTemplateFonts() {
  useEffect(() => {
    TEMPLATE_FONTS.forEach((font) => {
      if (loadedFonts.has(font)) return;
      loadedFonts.add(font);
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;600;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    });
  }, []);
}

interface TemplatePreviewProps {
  template: CardTemplate;
  showLabel?: boolean;
  className?: string;
  rounded?: string;
  aspect?: string;
}

const TemplatePreview = memo(function TemplatePreview({
  template,
  showLabel = true,
  className = '',
  rounded = 'rounded-2xl',
  aspect = 'aspect-[4/3]',
}: TemplatePreviewProps) {
  useTemplateFonts();

  const metadata = template.metadata || {};
  const decor = (metadata.decor as string) || 'none';
  const font = template.font_family || 'Inter';
  const textColor = template.text_color || '#ffffff';
  const accent = template.accent_color || template.primary_color || '#818cf8';

  const bgStyle: React.CSSProperties = {};
  const bgColor = template.background_color || '#1e293b';
  if (bgColor.startsWith('linear') || bgColor.startsWith('radial')) {
    bgStyle.background = bgColor;
  } else {
    bgStyle.backgroundColor = bgColor;
  }

  return (
    <div
      data-card-renderer="true"
      className={`relative w-full ${aspect} overflow-hidden ${rounded} select-none ${className}`}
      style={{ ...bgStyle, fontFamily: font }}
    >
      {/* Decorative vector layer */}
      <DecorLayer decor={decor} accent={accent} />

      {/* Glassmorphism content card */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <div
          className="relative z-10 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border border-white/20 backdrop-blur-md max-w-[85%]"
          style={{ background: 'rgba(0, 0, 0, 0.25)' }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ color: textColor, opacity: 0.75 }}
          >
            {template.occasion}
          </span>
          <h4
            className="text-sm font-bold leading-tight px-1 line-clamp-2 m-0"
            style={{ color: textColor, fontFamily: font }}
          >
            {template.title}
          </h4>
          <div className="mt-0.5 h-[2px] w-8 rounded-full" style={{ background: accent }} />
          {showLabel && template.premium && (
            <span
              className="mt-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: accent, color: '#fff' }}
            >
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Subtle inner frame */}
      <div className="absolute inset-2 border border-white/10 rounded-xl pointer-events-none" />
    </div>
  );
});

export default TemplatePreview;

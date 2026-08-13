import React, { memo, useEffect, useMemo } from 'react';
import { CardTemplate } from '../types';

// Google Fonts used by the (server-seeded) template library.
// Kept in sync with the design tokens returned by the backend.
const TEMPLATE_FONTS = [
  'Poppins', 'Baloo 2', 'Fredoka', 'Cormorant Garamond', 'Playfair Display',
  'Cinzel', 'Amiri', 'Inter', 'Mountains of Christmas', 'Dancing Script', 'Pacifico',
];

// ─── Google Font preloader (deduped) ─────────────────────────────────────
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

// ─── Decorative SVG layers ────────────────────────────────────────────────────
function DecorLayer({ decor, accent }: { decor: string; accent: string }) {
  switch (decor) {
    case 'balloons':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {[60, 130, 200, 300].map((x, i) => (
            <g key={i} transform={`translate(${x},${40 + i * 18})`}>
              <ellipse cx="0" cy="0" rx="22" ry="28" fill={accent} opacity="0.85" />
              <path d={`M-2,26 Q0,40 2,26`} stroke={accent} strokeWidth="1.5" fill="none" />
            </g>
          ))}
        </svg>
      );
    case 'hearts':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {[[40, 50], [340, 70], [200, 240], [120, 180], [280, 200]].map(([x, y], i) => (
            <path key={i} transform={`translate(${x},${y}) scale(${0.6 + i * 0.12})`}
              d="M0,8 C0,2 12,2 12,8 C12,14 0,20 0,24 C0,20 -12,14 -12,8 C-12,2 0,2 0,8 Z"
              fill={accent} opacity="0.7" />
          ))}
        </svg>
      );
    case 'florals':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {[[30, 40], [360, 50], [50, 250], [350, 260]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x},${y})`}>
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} cx="0" cy="-14" rx="7" ry="14"
                  fill={accent} opacity="0.6" transform={`rotate(${a})`} />
              ))}
              <circle r="6" fill="#fff" opacity="0.8" />
            </g>
          ))}
        </svg>
      );
    case 'confetti':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {Array.from({ length: 26 }).map((_, i) => {
            const x = (i * 53) % 400, y = (i * 71) % 300, c = [accent, '#fbbf24', '#34d399', '#f472b6', '#60a5fa'][i % 5];
            return <rect key={i} x={x} y={y} width="6" height="10" rx="1" fill={c} opacity="0.8" transform={`rotate(${i * 23} ${x} ${y})`} />;
          })}
        </svg>
      );
    case 'snow':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {Array.from({ length: 30 }).map((_, i) => (
            <circle key={i} cx={(i * 67) % 400} cy={(i * 89) % 300} r={1.5 + (i % 3)} fill="#fff" opacity="0.85" />
          ))}
        </svg>
      );
    case 'fireworks':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {[[100, 90], [300, 110], [200, 220]].map(([cx, cy], i) => (
            <g key={i} stroke={accent} strokeWidth="1.5" opacity="0.9">
              {Array.from({ length: 12 }).map((_, a) => {
                const ang = (a * 30) * Math.PI / 180;
                return <line key={a} x1={cx} y1={cy} x2={cx + Math.cos(ang) * 34} y2={cy + Math.sin(ang) * 34} />;
              })}
              <circle cx={cx} cy={cy} r="3" fill="#fff" />
            </g>
          ))}
        </svg>
      );
    case 'diyas':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {[[50, 230], [120, 250], [280, 240], [350, 220]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x},${y})`}>
              <path d="M-16,0 Q0,18 16,0 Q0,8 -16,0 Z" fill="#7c2d12" />
              <path d="M0,0 Q4,-14 0,-22 Q-4,-14 0,0 Z" fill={accent} opacity="0.95" />
            </g>
          ))}
        </svg>
      );
    case 'moon':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <circle cx="310" cy="70" r="34" fill={accent} opacity="0.95" />
          <circle cx="296" cy="62" r="30" fill="#093028" />
          {[[40, 220], [90, 250], [350, 200]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1 + (i % 2)} fill="#fff" opacity="0.9" />
          ))}
        </svg>
      );
    case 'rings':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <g transform="translate(200,150)">
            <circle r="26" fill="none" stroke={accent} strokeWidth="4" />
            <circle cx="34" r="26" fill="none" stroke={accent} strokeWidth="4" />
            <circle r="6" fill={accent} opacity="0.8" />
            <circle cx="34" r="6" fill={accent} opacity="0.8" />
          </g>
        </svg>
      );
    case 'stars':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {Array.from({ length: 22 }).map((_, i) => {
            const x = (i * 83) % 400, y = (i * 47) % 300;
            return <path key={i} transform={`translate(${x},${y}) scale(0.7)`}
              d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z" fill="#fff" opacity="0.85" />;
          })}
        </svg>
      );
    case 'teddy':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <g transform="translate(60,60)" fill={accent} opacity="0.85">
            <circle cx="20" cy="20" r="16" /><circle cx="8" cy="6" r="6" /><circle cx="32" cy="6" r="6" />
            <circle cx="20" cy="40" r="20" /><circle cx="20" cy="40" r="9" fill="#fff" />
          </g>
        </svg>
      );
    case 'leaves':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {[[30, 260], [370, 40], [40, 40], [360, 260]].map(([x, y], i) => (
            <path key={i} transform={`translate(${x},${y}) rotate(${i * 45})`}
              d="M0,0 Q14,-10 24,0 Q14,10 0,0 Z" fill={accent} opacity="0.6" />
          ))}
        </svg>
      );
    case 'sparkle':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          {[[60, 60], [330, 80], [200, 250], [120, 200]].map(([x, y], i) => (
            <path key={i} transform={`translate(${x},${y})`}
              d="M0,-10 L2,-2 L10,0 L2,2 L0,10 L-2,2 L-10,0 L-2,-2 Z" fill={accent} opacity="0.8" />
          ))}
        </svg>
      );
    default:
      return null;
  }
}

interface TemplatePreviewProps {
  template: CardTemplate;
  showLabel?: boolean;
  className?: string;
  rounded?: string;
}

const TemplatePreview = memo(function TemplatePreview({
  template,
  showLabel = true,
  className = '',
  rounded = 'rounded-2xl',
}: TemplatePreviewProps) {
  useTemplateFonts();

  // All design tokens now come from the backend (single source of truth).
  const metadata = template.metadata || {};
  const decor = (metadata.decor as string) || 'none';
  const glass = Boolean(metadata.glass) || template.layout_type === 'split';
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
      className={`relative w-full aspect-[4/3] overflow-hidden ${rounded} ${className}`}
      style={{ ...bgStyle, fontFamily: font }}
    >
      {/* Decorative layer */}
      <div className="absolute inset-0 pointer-events-none opacity-90">
        <DecorLayer decor={decor} accent={accent} />
      </div>

      {/* Glassmorphism content card */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        {glass && (
          <div
            className="absolute inset-4 rounded-xl border border-white/20 backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
        )}
        <div className="relative z-10 flex flex-col items-center gap-1">
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: textColor, opacity: 0.65 }}
          >
            {template.occasion}
          </span>
          <h4
            className="text-sm font-bold leading-tight px-2 line-clamp-2"
            style={{ color: textColor, fontFamily: font }}
          >
            {template.title}
          </h4>
          <div className="mt-1 h-[2px] w-10 rounded-full" style={{ background: accent }} />
          {showLabel && template.premium && (
            <span
              className="mt-1.5 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
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

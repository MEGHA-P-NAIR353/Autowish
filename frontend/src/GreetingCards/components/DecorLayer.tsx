import React, { memo } from 'react';

export const OCCASION_DEFAULT_DECORS: Record<string, string> = {
  birthday: 'sparkle',
  anniversary: 'hearts',
  wedding: 'rings',
  festival: 'confetti',
  christmas: 'snow',
  newyear: 'fireworks',
  diwali: 'diyas',
  eid: 'moon',
  ramadan: 'moon',
  valentine: 'hearts',
  "mother's day": 'florals',
  mothersday: 'florals',
  "father's day": 'stars',
  fathersday: 'stars',
  graduation: 'stars',
  congratulations: 'sparkle',
  "baby shower": 'teddy',
  babyshower: 'teddy',
  friendshipday: 'confetti',
  "friendship day": 'confetti',
  thankyou: 'leaves',
  "thank you": 'leaves',
  getwellsoon: 'florals',
  "get well soon": 'florals',
  corporate: 'sparkle',
  custom: 'sparkle',
};

export function getDefaultDecor(occasion?: string): string {
  if (!occasion) return 'sparkle';
  const lower = occasion.toLowerCase().trim();
  for (const [key, val] of Object.entries(OCCASION_DEFAULT_DECORS)) {
    if (lower.includes(key)) return val;
  }
  return 'sparkle';
}

export const OCCASION_DEFAULT_HEADINGS: Record<string, string> = {
  birthday: 'Happy Birthday!',
  anniversary: 'Happy Anniversary!',
  wedding: 'Congratulations!',
  festival: 'Happy Festival!',
  christmas: 'Merry Christmas!',
  newyear: 'Happy New Year!',
  diwali: 'Happy Diwali!',
  eid: 'Eid Mubarak!',
  ramadan: 'Ramadan Mubarak!',
  valentine: "Happy Valentine's Day!",
  "mother's day": "Happy Mother's Day!",
  mothersday: "Happy Mother's Day!",
  "father's day": "Happy Father's Day!",
  fathersday: "Happy Father's Day!",
  graduation: 'Congratulations on Graduation!',
  congratulations: 'Warmest Congratulations!',
  "baby shower": 'Welcome Little One!',
  babyshower: 'Welcome Little One!',
  friendshipday: 'Happy Friendship Day!',
  "friendship day": 'Happy Friendship Day!',
  thankyou: 'Thank You!',
  "thank you": 'Thank You!',
  getwellsoon: 'Get Well Soon!',
  "get well soon": 'Get Well Soon!',
  corporate: 'Congratulations!',
  custom: 'Warm Wishes!',
};

export function getDefaultHeading(occasion?: string): string {
  if (!occasion) return 'Warm Wishes!';
  const lower = occasion.toLowerCase().trim();
  for (const [key, val] of Object.entries(OCCASION_DEFAULT_HEADINGS)) {
    if (lower.includes(key)) return val;
  }
  return `${occasion} Wishes!`;
}

interface DecorLayerProps {
  decor?: string;
  accent?: string;
  className?: string;
}

export const DecorLayer = memo(function DecorLayer({
  decor = 'none',
  accent = '#ec4899',
  className = '',
}: DecorLayerProps) {
  if (!decor || decor === 'none') return null;

  switch (decor) {
    case 'balloons':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {[
            { x: 70, y: 70, rx: 24, ry: 30 },
            { x: 150, y: 110, rx: 20, ry: 26 },
            { x: 350, y: 90, rx: 22, ry: 28 },
            { x: 430, y: 65, rx: 25, ry: 32 },
          ].map((b, i) => (
            <g key={i} transform={`translate(${b.x},${b.y})`}>
              <ellipse cx="0" cy="0" rx={b.rx} ry={b.ry} fill={accent} opacity="0.6" />
              <path d="M-2,28 Q0,45 2,28" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.7" />
              <ellipse cx="-7" cy="-9" rx="5" ry="9" fill="#fff" opacity="0.4" />
            </g>
          ))}
        </svg>
      );

    case 'hearts':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {[
            { x: 50, y: 60, scale: 0.85, rot: -15 },
            { x: 440, y: 75, scale: 0.95, rot: 18 },
            { x: 55, y: 430, scale: 0.75, rot: 10 },
            { x: 445, y: 420, scale: 0.8, rot: -12 },
            { x: 80, y: 250, scale: 0.6, rot: 8 },
            { x: 420, y: 240, scale: 0.65, rot: -10 },
          ].map((h, i) => (
            <path
              key={i}
              transform={`translate(${h.x},${h.y}) scale(${h.scale}) rotate(${h.rot})`}
              d="M0,8 C0,2 12,2 12,8 C12,14 0,20 0,24 C0,20 -12,14 -12,8 C-12,2 0,2 0,8 Z"
              fill={accent}
              opacity="0.45"
            />
          ))}
        </svg>
      );

    case 'rings':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          <g transform="translate(250, 250)" opacity="0.25">
            <circle cx="-20" cy="0" r="45" fill="none" stroke={accent} strokeWidth="5" />
            <circle cx="20" cy="0" r="45" fill="none" stroke={accent} strokeWidth="5" />
            <circle cx="-20" cy="-32" r="7" fill={accent} opacity="0.9" />
            <circle cx="20" cy="-32" r="7" fill={accent} opacity="0.9" />
          </g>
          <g transform="translate(60, 70)" opacity="0.35">
            <circle cx="0" cy="0" r="22" fill="none" stroke={accent} strokeWidth="2.5" />
            <circle cx="16" cy="0" r="22" fill="none" stroke={accent} strokeWidth="2.5" />
          </g>
          <g transform="translate(430, 430)" opacity="0.35">
            <circle cx="0" cy="0" r="22" fill="none" stroke={accent} strokeWidth="2.5" />
            <circle cx="16" cy="0" r="22" fill="none" stroke={accent} strokeWidth="2.5" />
          </g>
        </svg>
      );

    case 'florals':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {[
            { x: 50, y: 55, scale: 0.8 },
            { x: 450, y: 60, scale: 0.8 },
            { x: 60, y: 440, scale: 0.75 },
            { x: 440, y: 440, scale: 0.75 },
          ].map((pos, i) => (
            <g key={i} transform={`translate(${pos.x},${pos.y}) scale(${pos.scale})`}>
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse
                  key={a}
                  cx="0"
                  cy="-15"
                  rx="8"
                  ry="16"
                  fill={accent}
                  opacity="0.45"
                  transform={`rotate(${a})`}
                />
              ))}
              <circle r="7" fill="#fff" opacity="0.75" />
            </g>
          ))}
        </svg>
      );

    case 'confetti':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 32 }).map((_, i) => {
            const x = (i * 61) % 480 + 10;
            const y = (i * 73) % 480 + 10;
            const c = [accent, '#fbbf24', '#34d399', '#f472b6', '#60a5fa'][i % 5];
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="7"
                height="11"
                rx="1.5"
                fill={c}
                opacity="0.55"
                transform={`rotate(${i * 27} ${x} ${y})`}
              />
            );
          })}
        </svg>
      );

    case 'snow':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 36 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 79) % 480 + 10}
              cy={(i * 97) % 480 + 10}
              r={1.8 + (i % 3)}
              fill="#fff"
              opacity="0.65"
            />
          ))}
        </svg>
      );

    case 'fireworks':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {[
            { cx: 120, cy: 110, size: 36 },
            { cx: 380, cy: 130, size: 40 },
            { cx: 250, cy: 400, size: 34 },
          ].map((fw, i) => (
            <g key={i} stroke={accent} strokeWidth="1.5" opacity="0.65">
              {Array.from({ length: 12 }).map((_, a) => {
                const ang = ((a * 30) * Math.PI) / 180;
                return (
                  <line
                    key={a}
                    x1={fw.cx}
                    y1={fw.cy}
                    x2={fw.cx + Math.cos(ang) * fw.size}
                    y2={fw.cy + Math.sin(ang) * fw.size}
                  />
                );
              })}
              <circle cx={fw.cx} cy={fw.cy} r="3.5" fill="#fff" />
            </g>
          ))}
        </svg>
      );

    case 'diyas':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {[
            { x: 80, y: 440 },
            { x: 180, y: 450 },
            { x: 320, y: 450 },
            { x: 420, y: 440 },
          ].map((d, i) => (
            <g key={i} transform={`translate(${d.x},${d.y})`}>
              <path d="M-18,0 Q0,20 18,0 Q0,9 -18,0 Z" fill="#7c2d12" opacity="0.8" />
              <path d="M0,0 Q5,-16 0,-24 Q-5,-16 0,0 Z" fill={accent} opacity="0.85" />
            </g>
          ))}
        </svg>
      );

    case 'moon':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          <g transform="translate(390, 80)">
            <circle cx="0" cy="0" r="38" fill={accent} opacity="0.75" />
            <circle cx="-14" cy="-8" r="34" fill="#093028" />
          </g>
          {[
            { x: 60, y: 120 },
            { x: 110, y: 80 },
            { x: 440, y: 220 },
            { x: 70, y: 380 },
            { x: 430, y: 400 },
          ].map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={1.5 + (i % 2)} fill="#fff" opacity="0.75" />
          ))}
        </svg>
      );

    case 'stars':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 26 }).map((_, i) => {
            const x = (i * 97) % 470 + 15;
            const y = (i * 61) % 470 + 15;
            return (
              <path
                key={i}
                transform={`translate(${x},${y}) scale(0.75)`}
                d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z"
                fill="#fff"
                opacity="0.55"
              />
            );
          })}
        </svg>
      );

    case 'teddy':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          <g transform="translate(60,60)" fill={accent} opacity="0.45">
            <circle cx="22" cy="22" r="18" />
            <circle cx="9" cy="7" r="7" />
            <circle cx="35" cy="7" r="7" />
            <circle cx="22" cy="44" r="22" />
            <circle cx="22" cy="44" r="10" fill="#fff" opacity="0.6" />
          </g>
          <g transform="translate(410,410)" fill={accent} opacity="0.45">
            <circle cx="22" cy="22" r="18" />
            <circle cx="9" cy="7" r="7" />
            <circle cx="35" cy="7" r="7" />
            <circle cx="22" cy="44" r="22" />
            <circle cx="22" cy="44" r="10" fill="#fff" opacity="0.6" />
          </g>
        </svg>
      );

    case 'leaves':
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {[
            { x: 45, y: 45, rot: 35 },
            { x: 455, y: 45, rot: -35 },
            { x: 45, y: 455, rot: 145 },
            { x: 455, y: 455, rot: -145 },
          ].map((l, i) => (
            <path
              key={i}
              transform={`translate(${l.x},${l.y}) rotate(${l.rot}) scale(1.1)`}
              d="M0,0 Q16,-12 28,0 Q16,12 0,0 Z"
              fill={accent}
              opacity="0.45"
            />
          ))}
        </svg>
      );

    case 'sparkle':
    default:
      return (
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
        >
          {[
            { x: 65, y: 70, s: 1.1 },
            { x: 435, y: 80, s: 1.2 },
            { x: 80, y: 430, s: 1.0 },
            { x: 430, y: 430, s: 1.1 },
            { x: 60, y: 260, s: 0.75 },
            { x: 440, y: 250, s: 0.8 },
          ].map((sp, i) => (
            <path
              key={i}
              transform={`translate(${sp.x},${sp.y}) scale(${sp.s})`}
              d="M0,-12 L2.5,-2.5 L12,0 L2.5,2.5 L0,12 L-2.5,2.5 L-12,0 L-2.5,-2.5 Z"
              fill={accent}
              opacity="0.55"
            />
          ))}
        </svg>
      );
  }
});

export default DecorLayer;

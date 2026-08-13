import React, { useEffect } from 'react';

// Token aliases for consistent dark-mode design
const INPUT_CLS = 'w-full bg-[#111827] text-[#F8FAFC] placeholder-[#94A3B8] text-xs rounded-xl px-3 py-2.5 border border-[#334155] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';
const LABEL_CLS = 'text-[10px] text-[#CBD5E1] uppercase tracking-wider font-semibold mb-1.5 block';

const FONTS = [
  { name: 'Inter', preview: 'The quick brown fox' },
  { name: 'Playfair Display', preview: 'Elegant Classic' },
  { name: 'Dancing Script', preview: 'Lovely Handwritten' },
  { name: 'Montserrat', preview: 'Bold Modern Style' },
  { name: 'Caveat', preview: 'Casual Sketch Feel' },
  { name: 'Cinzel', preview: 'Timeless Roman' },
];

const PRESETS = [
  '#FFFFFF', '#F8FAFC', '#FDE68A', '#F43F5E', '#EC4899',
  '#D946EF', '#818CF8', '#34D399', '#FB923C', '#94A3B8',
];

// Load font into document dynamically
const loadedFonts = new Set<string>();
function loadFont(name: string) {
  if (!name || name === 'Inter' || loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

interface FontSelectorProps {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  onChange: (key: 'font_family' | 'font_size' | 'text_color', value: any) => void;
}

export default function FontSelector({ fontFamily, fontSize, textColor, onChange }: FontSelectorProps) {
  // Pre-load all fonts for previews
  useEffect(() => {
    FONTS.forEach((f) => loadFont(f.name));
  }, []);

  return (
    <div className="space-y-5">
      {/* Font Family */}
      <div>
        <label className={LABEL_CLS}>Font Family</label>
        <div className="grid grid-cols-1 gap-2">
          {FONTS.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => { loadFont(f.name); onChange('font_family', f.name); }}
              className={`px-3 py-2.5 text-xs rounded-xl border transition-all duration-200 text-left flex items-center justify-between ${
                fontFamily === f.name
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                  : 'bg-[#111827] border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:border-[#475569]'
              }`}
              style={{ fontFamily: f.name }}
            >
              <span>{f.name}</span>
              <span
                className="text-[10px] opacity-50 truncate ml-2 max-w-[120px]"
                style={{ fontFamily: f.name }}
              >
                {f.preview}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className={LABEL_CLS.replace('mb-1.5', '')}>Font Size</label>
          <span className="text-[10px] text-indigo-400 font-bold tabular-nums">{fontSize}px</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="12"
            max="42"
            step="1"
            value={fontSize}
            onChange={(e) => onChange('font_size', parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-600 bg-[#334155]"
            aria-label={`Font size: ${fontSize}px`}
          />
          <div className="flex justify-between mt-1 text-[8px] text-[#64748B]">
            <span>12px</span>
            <span>42px</span>
          </div>
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className={LABEL_CLS}>Text Color</label>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <input
                type="color"
                value={textColor?.startsWith('#') ? textColor : '#FFFFFF'}
                onChange={(e) => onChange('text_color', e.target.value)}
                className="w-9 h-9 rounded-lg border border-[#334155] cursor-pointer bg-[#111827] p-0.5"
                aria-label="Custom text color picker"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange('text_color', color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                    textColor === color
                      ? 'border-indigo-400 ring-2 ring-indigo-500/40 scale-110'
                      : 'border-transparent hover:border-white/30'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Text color ${color}`}
                />
              ))}
            </div>
          </div>
          {/* Current color preview */}
          <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]">
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: textColor }} />
            <span className="font-mono">{textColor?.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

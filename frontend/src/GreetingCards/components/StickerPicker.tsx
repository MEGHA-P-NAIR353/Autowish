import React, { useState } from 'react';

const STICKER_PACKS = {
  'Birthday 🎂': [
    { emoji: '🎂', label: 'Birthday Cake' },
    { emoji: '🧁', label: 'Cupcake' },
    { emoji: '🎁', label: 'Gift Box' },
    { emoji: '🎈', label: 'Balloon' },
    { emoji: '🥳', label: 'Party Hat' },
    { emoji: '🕯️', label: 'Candle' },
    { emoji: '🎉', label: 'Confetti' },
    { emoji: '🎊', label: 'Popper' },
    { emoji: '🎀', label: 'Ribbon Bow' },
  ],
  'Hearts ❤️': [
    { emoji: '❤️', label: 'Red Heart' },
    { emoji: '💖', label: 'Sparkle Heart' },
    { emoji: '💝', label: 'Ribbon Heart' },
    { emoji: '💕', label: 'Two Hearts' },
    { emoji: '💘', label: 'Arrow Heart' },
    { emoji: '💌', label: 'Love Letter' },
    { emoji: '🫶', label: 'Heart Hands' },
    { emoji: '💞', label: 'Revolving Hearts' },
    { emoji: '🥰', label: 'Adoring Face' },
  ],
  'Flowers 🌹': [
    { emoji: '🌹', label: 'Rose' },
    { emoji: '💐', label: 'Bouquet' },
    { emoji: '🌸', label: 'Cherry Blossom' },
    { emoji: '🌻', label: 'Sunflower' },
    { emoji: '🌷', label: 'Tulip' },
    { emoji: '🌺', label: 'Hibiscus' },
    { emoji: '🍀', label: 'Four Leaf' },
    { emoji: '🪷', label: 'Lotus' },
    { emoji: '🌼', label: 'Blossom' },
  ],
  'Festival ✨': [
    { emoji: '✨', label: 'Sparkles' },
    { emoji: '🎆', label: 'Fireworks' },
    { emoji: '🪔', label: 'Diya Lamp' },
    { emoji: '🎄', label: 'Xmas Tree' },
    { emoji: '🌟', label: 'Glowing Star' },
    { emoji: '🥂', label: 'Champagne' },
    { emoji: '🪅', label: 'Piñata' },
    { emoji: '🏮', label: 'Red Lantern' },
    { emoji: '🎑', label: 'Moon Festival' },
  ],
} as const;

type Pack = keyof typeof STICKER_PACKS;

interface StickerPickerProps {
  onSelectSticker: (sticker: string) => void;
  selectedSticker?: string;
}

export default function StickerPicker({ onSelectSticker, selectedSticker }: StickerPickerProps) {
  const [activePack, setActivePack] = useState<Pack>('Birthday 🎂');

  return (
    <div className="space-y-3">
      {/* Pack tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(STICKER_PACKS) as Pack[]).map((pack) => (
          <button
            key={pack}
            type="button"
            onClick={() => setActivePack(pack)}
            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
              activePack === pack
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[#111827] text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-[#1E293B] border border-[#334155]'
            }`}
          >
            {pack}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-3 gap-2">
        {STICKER_PACKS[activePack].map((sticker) => (
          <button
            key={sticker.label}
            type="button"
            onClick={() => onSelectSticker(sticker.emoji)}
            className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 hover:scale-105 ${
              selectedSticker === sticker.emoji
                ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                : 'bg-[#111827] border-[#334155] hover:bg-[#1E293B] hover:border-[#475569]'
            }`}
            aria-label={`Sticker: ${sticker.label}`}
          >
            <span className="text-2xl mb-1.5">{sticker.emoji}</span>
            <span className="text-[9px] text-[#94A3B8] font-medium truncate w-full text-center px-1">
              {sticker.label}
            </span>
          </button>
        ))}
      </div>

      {/* Selection indicator */}
      {selectedSticker && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#111827] rounded-xl border border-[#334155]">
          <span className="text-[10px] text-[#94A3B8] font-medium">Active sticker</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedSticker}</span>
            <button
              type="button"
              onClick={() => onSelectSticker('')}
              className="text-[9px] text-[#64748B] hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

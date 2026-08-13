import React, { useState } from 'react';

const EMOJI_CATEGORIES = {
  'Birthday 🎂': ['🎂', '🎈', '🎉', '🎁', '🍰', '🧁', '🕯️', '🥳', '🍪', '🍬', '🎊', '🥂'],
  'Love ❤️': ['❤️', '💖', '💝', '💕', '😍', '😘', '🥰', '🌹', '💑', '💍', '💌', '🫶'],
  'Festival ✨': ['✨', '🎆', '🎇', '🪔', '🏮', '🎄', '🎃', '🔔', '🌟', '🥂', '🪅', '🎑'],
  'Smileys 😊': ['😀', '😂', '😊', '😎', '😜', '🥳', '🤩', '😇', '☀️', '🌈', '🦋', '⭐'],
  'Animals 🐱': ['🐱', '🐶', '🦄', '🦁', '🐻', '🐼', '🦊', '🐨', '🐣', '🦋', '🐬', '🦚'],
} as const;

type Category = keyof typeof EMOJI_CATEGORIES;

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  selectedEmoji?: string;
}

export default function EmojiPicker({ onSelectEmoji, selectedEmoji }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('Birthday 🎂');

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(EMOJI_CATEGORIES) as Category[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[#111827] text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-[#1E293B] border border-[#334155]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className={`w-full aspect-square flex items-center justify-center text-xl rounded-xl transition-all duration-150 hover:scale-110 ${
              selectedEmoji === emoji
                ? 'bg-indigo-600/30 border-2 border-indigo-500 scale-110 shadow-md shadow-indigo-500/20'
                : 'bg-[#111827] hover:bg-[#1E293B] border border-[#334155] hover:border-[#475569]'
            }`}
            aria-label={`Select emoji ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Current selection indicator */}
      {selectedEmoji && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#111827] rounded-xl border border-[#334155]">
          <span className="text-[10px] text-[#94A3B8] font-medium">Selected</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedEmoji}</span>
            <button
              type="button"
              onClick={() => onSelectEmoji('')}
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

import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

const EMOJI_CATEGORIES = {
  Birthday: ['🎂', '🧁', '🎈', '🎁', '🕯️', '🍬', '🎉', '🍰'],
  Party: ['🎉', '🎊', '🥳', '🍾', '🥂', '🍿', '🥤', '🕺', '💃'],
  Love: ['❤️', '💖', '💝', '💘', '💕', '💌', '🌹', '👩‍❤️‍👨', '💍'],
  Flowers: ['💐', '🌹', '🌸', '🌺', '🌻', '🌼', '🌷', '💮', '☘️'],
  Balloons: ['🎈', '🎊', '🥳', '🎁', '🎂'],
  Festival: ['✨', '🌟', '🏮', '🪔', '🌙', '⛪', '🎄', '🎆', '🔔'],
  Gifts: ['🎁', '📦', '🎀', '🛍️', '🧸'],
  Fireworks: ['🎆', '🎇', '✨', '⚡', '🔥'],
};

export default function EmojiPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  return (
    <div className="bg-[#1e293b] border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden max-h-[350px] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50 flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={search}
            onChange={handleSearchChange}
            className="bg-transparent border-none text-white text-xs outline-none w-full"
          />
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
          <X size={14} />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
        {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => {
          const filtered = emojis.filter(e => !search || cat.toLowerCase().includes(search.toLowerCase()));
          if (filtered.length === 0) return null;

          return (
            <div key={cat} className="space-y-1.5">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{cat}</div>
              <div className="grid grid-cols-6 gap-2">
                {filtered.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="text-2xl p-1 hover:bg-slate-700/50 rounded-lg transition-all text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

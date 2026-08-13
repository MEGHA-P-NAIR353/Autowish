import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Image, Smile, Shapes, AlignLeft, Upload, ChevronDown, ChevronRight,
  Star, Sparkles, Search
} from 'lucide-react';
import { makeElement } from './index';
import { cardsAPI } from '../../../services/greetingCardsAPI';
import AIMessagePanel from './AIMessagePanel';
import EmojiPicker from './EmojiPicker';
import toast from 'react-hot-toast';

const OCCASIONS = [
  { value: 'Birthday', label: '🎂 Birthday' },
  { value: 'Anniversary', label: '💍 Anniversary' },
  { value: 'Wedding', label: '💒 Wedding' },
  { value: 'Festival', label: '🎉 Festival' },
  { value: 'Christmas', label: '🎄 Christmas' },
  { value: 'NewYear', label: '🎆 New Year' },
  { value: 'Diwali', label: '🪔 Diwali' },
  { value: 'Eid', label: '🌙 Eid' },
  { value: 'Ramadan', label: '☪️ Ramadan' },
  { value: 'Valentine', label: '❤️ Valentine' },
  { value: 'MothersDay', label: "💐 Mother's Day" },
  { value: 'FathersDay', label: "👔 Father's Day" },
  { value: 'FriendshipDay', label: '🤝 Friendship Day' },
  { value: 'Graduation', label: '🎓 Graduation' },
  { value: 'Congratulations', label: '🏆 Congratulations' },
  { value: 'Custom', label: '✨ Custom Event' },
];

const CATEGORIES = [
  { value: 'Minimal', emoji: '◻️' },
  { value: 'Modern', emoji: '⚡' },
  { value: 'Cute', emoji: '🌸' },
  { value: 'Luxury', emoji: '👑' },
  { value: 'Corporate', emoji: '💼' },
  { value: 'Kids', emoji: '🎈' },
  { value: 'Floral', emoji: '🌺' },
  { value: 'Dark', emoji: '🌑' },
  { value: 'Classic', emoji: '📜' },
  { value: 'AIGenerated', emoji: '🤖' },
];

const ELEMENT_TYPES = [
  { type: 'text', label: 'Text', icon: Type, desc: 'Add text block', color: 'from-blue-500 to-indigo-600' },
  { type: 'image', label: 'Image', icon: Image, desc: 'Upload image', color: 'from-emerald-500 to-teal-600' },
  { type: 'emoji', label: 'Emoji', icon: Smile, desc: 'Add emoji', color: 'from-amber-500 to-orange-600' },
  { type: 'sticker', label: 'Sticker', icon: Star, desc: 'Add sticker', color: 'from-pink-500 to-rose-600' },
  { type: 'shape', label: 'Shape', icon: Shapes, desc: 'Add shape', color: 'from-violet-500 to-purple-600' },
];

const SHAPES = [
  { shape: 'rectangle', label: '▬ Rectangle', fill: '#7c3aed' },
  { shape: 'circle', label: '● Circle', fill: '#0ea5e9' },
  { shape: 'triangle', label: '▲ Triangle', fill: '#f59e0b' },
];

const BACKGROUNDS = [
  { bg: '#1a1a2e', label: 'Deep Navy' },
  { bg: '#0d1117', label: 'Midnight' },
  { bg: '#1e0a3c', label: 'Dark Purple' },
  { bg: 'linear-gradient(135deg,#667eea,#764ba2)', label: 'Violet Dream' },
  { bg: 'linear-gradient(135deg,#f093fb,#f5576c)', label: 'Pink Bliss' },
  { bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', label: 'Ocean' },
  { bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', label: 'Mint' },
  { bg: 'linear-gradient(135deg,#fa709a,#fee140)', label: 'Sunset' },
  { bg: 'linear-gradient(135deg,#30cfd0,#667eea)', label: 'Aurora' },
  { bg: '#ffffff', label: 'White' },
  { bg: '#f8f0e3', label: 'Cream' },
  { bg: '#1a1a1a', label: 'Charcoal' },
];

const TABS = ['Occasion', 'Category', 'Elements', 'Background', 'AI'];

export default function LeftSidebar({ dispatch, state }) {
  const [activeTab, setActiveTab] = useState('Elements');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  const addElement = (type, overrides = {}) => {
    dispatch({ type: 'ADD_ELEMENT', element: makeElement(type, overrides) });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large (max 10MB)'); return; }
    try {
      const res = await cardsAPI.uploadImage(file);
      addElement('image', { src: res.data.url, width: 200, height: 200 });
      toast.success('Image added!');
    } catch {
      // Fallback: use object URL
      const src = URL.createObjectURL(file);
      addElement('image', { src, width: 200, height: 200 });
    }
    e.target.value = '';
  };

  const setBackground = (bg) => {
    if (bg.startsWith('linear-gradient')) {
      dispatch({ type: 'SET_CARD_PROP', key: 'backgroundColor', value: bg });
      dispatch({ type: 'SET_CARD_PROP', key: 'backgroundImage', value: null });
    } else {
      dispatch({ type: 'SET_CARD_PROP', key: 'backgroundColor', value: bg });
    }
  };

  return (
    <div className="w-64 flex-shrink-0 bg-[#111827] border-r border-slate-700/50 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 p-2 border-b border-slate-700/50 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
        {/* OCCASION TAB */}
        {activeTab === 'Occasion' && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Select Occasion</p>
            {OCCASIONS.map(o => (
              <button
                key={o.value}
                onClick={() => dispatch({ type: 'SET_CARD_PROP', key: 'occasion', value: o.value })}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  state.occasion === o.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* CATEGORY TAB */}
        {activeTab === 'Category' && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Template Style</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/30 hover:border-indigo-500/40 transition-all text-slate-300 hover:text-white"
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-[10px] font-semibold">{c.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ELEMENTS TAB */}
        {activeTab === 'Elements' && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Add Elements</p>

            {ELEMENT_TYPES.map(et => (
              <button
                key={et.type}
                onClick={() => {
                  if (et.type === 'image') fileInputRef.current?.click();
                  else if (et.type === 'emoji' || et.type === 'sticker') setShowEmojiPicker(true);
                  else addElement(et.type);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/30 hover:border-indigo-500/40 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${et.color} flex items-center justify-center flex-shrink-0`}>
                  <et.icon size={14} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-200">{et.label}</div>
                  <div className="text-[10px] text-slate-500">{et.desc}</div>
                </div>
              </button>
            ))}

            {/* Quick shapes */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Quick Shapes</p>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map(s => (
                  <button
                    key={s.shape}
                    onClick={() => addElement('shape', { shape: s.shape, fill: s.fill })}
                    className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/30 text-xs text-slate-300 hover:text-white transition-all text-center"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        )}

        {/* BACKGROUND TAB */}
        {activeTab === 'Background' && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Background Presets</p>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUNDS.map(b => (
                <button
                  key={b.bg}
                  onClick={() => setBackground(b.bg)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full h-12 rounded-lg border-2 border-slate-700/50 hover:border-indigo-500 transition-all"
                    style={{ background: b.bg }}
                  />
                  <span className="text-[9px] text-slate-500 truncate w-full text-center">{b.label}</span>
                </button>
              ))}
            </div>

            {/* Custom color */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Custom Color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.backgroundColor?.startsWith('#') ? state.backgroundColor : '#1a1a2e'}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
                />
                <span className="text-xs text-slate-400">{state.backgroundColor}</span>
              </div>
            </div>

            {/* Upload background */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Upload Background</p>
              <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 cursor-pointer transition-all text-slate-400 hover:text-white text-xs">
                <Upload size={14} />
                Upload Image
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      const res = await cardsAPI.uploadImage(file);
                      dispatch({ type: 'SET_CARD_PROP', key: 'backgroundImage', value: res.data.url });
                    } catch {
                      const src = URL.createObjectURL(file);
                      dispatch({ type: 'SET_CARD_PROP', key: 'backgroundImage', value: src });
                    }
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* AI TAB */}
        {activeTab === 'AI' && (
          <AIMessagePanel dispatch={dispatch} state={state} />
        )}
      </div>

      {/* Emoji Picker Overlay */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-64 top-0 z-50 w-80"
          >
            <EmojiPicker
              onSelect={(emoji) => {
                addElement('emoji', { content: emoji, fontSize: 48, width: 70, height: 70 });
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

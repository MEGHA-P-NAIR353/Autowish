import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Check, Copy, Palette, Smile, AlertCircle, Loader2,
  ExternalLink, Wand2, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cardsAPI } from '../../services/greetingCardsAPI';
import { CARD_THEMES, DEFAULT_THEME_KEY, getCardTheme } from '../../GreetingCards/utils/cardThemes';

export { CARD_THEMES };

export const DECORATIVE_EMOJIS = ['🎉', '🎂', '✨', '💖', '🌟', '🥂', '🌸', '🎁', '🎈', '💐'];

const OCCASIONS = ['Birthday', 'Anniversary', 'Festival', 'Holiday', 'Custom'];

export function MinimalCardCreator({
  initialRecipient = '',
  initialOccasion = 'Birthday',
  initialMessage = '',
  scheduleMessage = '',
  contactId = null,
  onCardCreated,
  onCancel,
}) {
  const [recipientName, setRecipientName] = useState(initialRecipient || '');
  const [occasion, setOccasion] = useState(initialOccasion || 'Birthday');
  const [message, setMessage] = useState(initialMessage || scheduleMessage || '');
  const [selectedThemeKey, setSelectedThemeKey] = useState(DEFAULT_THEME_KEY || 'midnight');
  const [selectedEmoji, setSelectedEmoji] = useState('🎉');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const isSubmittingRef = useRef(false);

  const activeTheme = getCardTheme(selectedThemeKey) || CARD_THEMES[0];

  const handleCopyScheduleMessage = () => {
    if (scheduleMessage) {
      setMessage(scheduleMessage);
      setErrors(prev => ({ ...prev, message: null }));
      toast.success('Message copied from schedule!');
    } else {
      toast('Schedule message is empty.');
    }
  };

  const validate = () => {
    const errs = {};
    if (!recipientName.trim()) {
      errs.recipientName = 'Recipient name is required';
    } else if (recipientName.length > 100) {
      errs.recipientName = 'Recipient name cannot exceed 100 characters';
    }

    if (!message.trim()) {
      errs.message = 'Greeting message is required';
    } else if (message.length > 500) {
      errs.message = 'Greeting message cannot exceed 500 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const formatAPIError = (err) => {
    const data = err.response?.data;
    if (!data) return err.message || 'Failed to create greeting card.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;

    if (data.card_theme) {
      const themeErr = Array.isArray(data.card_theme) ? data.card_theme.join(' ') : data.card_theme;
      return `Theme Error: ${themeErr}`;
    }
    if (data.recipient_name) {
      const recipErr = Array.isArray(data.recipient_name) ? data.recipient_name.join(' ') : data.recipient_name;
      return `Recipient Error: ${recipErr}`;
    }
    if (data.message) {
      const msgErr = Array.isArray(data.message) ? data.message.join(' ') : data.message;
      return `Message Error: ${msgErr}`;
    }

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      const cleanKey = firstKey.replace(/_/g, ' ');
      return `${cleanKey}: ${Array.isArray(val) ? val.join(', ') : String(val)}`;
    }
    return 'Validation error occurred while creating card.';
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (saving || isSubmittingRef.current) return;
    if (!validate()) return;

    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const fd = new FormData();
      const title = `${occasion} Card for ${recipientName.trim()}`;
      fd.append('title', title);
      fd.append('occasion', occasion);
      fd.append('recipient_name', recipientName.trim());
      fd.append('heading', `Happy ${occasion}!`);
      fd.append('message', message.trim());
      fd.append('personal_message', message.trim());
      fd.append('card_size', 'instagram_square');
      fd.append('card_theme', activeTheme.key);
      fd.append('card_width', '500');
      fd.append('card_height', '500');
      fd.append('background_color', activeTheme.bg);
      fd.append('background_gradient', activeTheme.gradient);
      fd.append('font_family', 'Inter');
      fd.append('font_size', '18');
      fd.append('font_color', activeTheme.textColor);
      fd.append('text_color', activeTheme.textColor);
      fd.append('accent_color', activeTheme.accentColor);
      fd.append('emoji', selectedEmoji);
      fd.append('decor', activeTheme.decor);
      fd.append('status', 'published');
      if (contactId) {
        fd.append('contact', String(contactId));
      }

      const res = await cardsAPI.create(fd);
      const newCard = res.data;
      toast.success('✨ Greeting card created & attached!');
      if (onCardCreated) {
        onCardCreated(newCard);
      }
    } catch (err) {
      toast.error(formatAPIError(err));
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="bg-raised/80 border border-line-strong rounded-2xl p-5 shadow-2xl space-y-5 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-fg">Minimal Greeting Card Creator</h4>
            <p className="text-[11px] text-muted">Create & attach a published card in seconds</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="p-1.5 rounded-lg text-subtle hover:text-fg hover:bg-raised-hover transition"
          aria-label="Cancel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Grid: Form Inputs + Live Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Form Inputs */}
        <div className="md:col-span-7 space-y-4">
          {/* Recipient & Occasion Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                Recipient Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={recipientName}
                maxLength={100}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  if (errors.recipientName) setErrors(prev => ({ ...prev, recipientName: null }));
                }}
                placeholder="e.g. Sarah Jenkins"
                className={`input w-full text-xs py-2 ${errors.recipientName ? 'border-rose-500 focus:border-rose-500' : ''}`}
              />
              {errors.recipientName && (
                <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.recipientName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                Occasion <span className="text-rose-400">*</span>
              </label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="input w-full text-xs py-2"
              >
                {OCCASIONS.map(occ => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Palette size={12} className="text-indigo-400" /> Card Theme
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-44 overflow-y-auto pr-1">
              {CARD_THEMES.map(theme => {
                const isSelected = theme.key === selectedThemeKey;
                return (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => setSelectedThemeKey(theme.key)}
                    style={{ background: theme.gradient }}
                    className={`h-11 rounded-xl p-2 text-left relative border transition-all flex flex-col justify-end overflow-hidden ${
                      isSelected ? 'ring-2 ring-indigo-500 shadow-md scale-[1.02]' : 'opacity-80 hover:opacity-100 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-semibold text-white/90 truncate leading-none">
                        {theme.name.split(' ')[0]}
                      </span>
                      {isSelected && (
                        <span className="w-3.5 h-3.5 rounded-full bg-white text-indigo-900 flex items-center justify-center flex-shrink-0 text-[8px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decorative Emoji Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Smile size={12} className="text-amber-400" /> Decorative Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DECORATIVE_EMOJIS.map(em => {
                const isSelected = em === selectedEmoji;
                return (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500 scale-110 shadow-sm'
                        : 'bg-surface hover:bg-raised-hover border-line text-muted'
                    }`}
                  >
                    {em}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Greeting Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">
                Greeting Message <span className="text-rose-400">*</span>
              </label>
              {scheduleMessage && (
                <button
                  type="button"
                  onClick={handleCopyScheduleMessage}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                >
                  <Copy size={11} /> Use Schedule Message
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                value={message}
                maxLength={500}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errors.message) setErrors(prev => ({ ...prev, message: null }));
                }}
                placeholder="Write your heartfelt message here..."
                rows={4}
                className={`input w-full text-xs resize-none ${errors.message ? 'border-rose-500 focus:border-rose-500' : ''}`}
              />
              <span className="absolute bottom-2 right-2 text-[10px] text-subtle">
                {message.length}/500
              </span>
            </div>
            {errors.message && (
              <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> {errors.message}
              </p>
            )}
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="md:col-span-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Live Preview
            </label>
            <div
              style={{
                background: activeTheme.gradient,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textColor,
              }}
              className="w-full aspect-square rounded-2xl p-5 border flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300"
            >
              {/* Subtle card glow overlay */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 20%, ${activeTheme.accentColor}, transparent 70%)`
                }}
              />

              {/* Card Header */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-2xl drop-shadow-md select-none">{selectedEmoji}</span>
                <span
                  style={{ color: activeTheme.accentColor, borderColor: activeTheme.borderColor }}
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-black/20"
                >
                  {occasion}
                </span>
              </div>

              {/* Card Center Message */}
              <div className="relative z-10 text-center my-auto px-2 space-y-2">
                <h3 className="font-extrabold text-base tracking-tight leading-snug">
                  Happy {occasion}!
                </h3>
                {recipientName && (
                  <p
                    style={{ color: activeTheme.accentColor }}
                    className="text-xs font-medium tracking-wide truncate"
                  >
                    Dear {recipientName.trim()},
                  </p>
                )}
                <p className="text-[11px] leading-relaxed line-clamp-4 font-normal text-white/90 italic">
                  "{message.trim() || 'Wishing you all the joy and happiness on this special day!'}"
                </p>
              </div>

              {/* Card Footer */}
              <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-white/60">
                <span>With Love & Warm Wishes</span>
                <span className="font-semibold text-white/80">AutoWish AI</span>
              </div>
            </div>
          </div>

          {/* Advanced Studio note */}
          <div className="pt-3 text-center">
            <a
              href="/greeting-cards/create"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-subtle hover:text-fg transition"
            >
              <ExternalLink size={11} /> Open Full Studio for multi-layer canvas
            </a>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn-ghost px-4 py-2 text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-5 py-2 text-xs font-semibold shadow-lg shadow-indigo-500/20"
        >
          {saving ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Creating & Attaching...
            </>
          ) : (
            <>
              <Check size={13} /> Confirm & Attach Card
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default MinimalCardCreator;

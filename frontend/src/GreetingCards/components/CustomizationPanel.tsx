import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, User, Type, Palette,
  Image as ImageIcon, Smile, Sticker, Sparkles, Search, AlertTriangle,
} from 'lucide-react';
import FontSelector from './FontSelector';
import BackgroundPicker from './BackgroundPicker';
import PhotoUploader from './PhotoUploader';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';
import AIMessagePanel from './AIMessagePanel';
import ContactSelector from '../../components/ContactSelector';
import { GreetingCardData } from '../types';
import { AutoFitResult } from '../utils/textMeasurement';
import { getDefaultHeading } from './DecorLayer';

// ─── Shared design tokens ──────────────────────────────────────────────────────
const INPUT_CLS =
  'w-full bg-white dark:bg-slate-900 text-black dark:text-white placeholder:text-slate-400 text-xs rounded-xl px-3 py-2.5 border border-slate-300 dark:border-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none';
const LABEL_CLS =
  'text-[10px] text-black dark:text-slate-300 uppercase tracking-wider font-bold mb-1.5 block';

// ─── Accordion Section ────────────────────────────────────────────────────────
interface SectionProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ id, label, icon, isOpen, onToggle, children }: SectionProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`section-${id}`}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-[11px] font-bold text-black dark:text-slate-200">{label}</span>
        </div>
        {isOpen
          ? <ChevronDown size={14} className="text-black dark:text-slate-400" />
          : <ChevronRight size={14} className="text-black dark:text-slate-400" />
        }
      </button>
      {isOpen && (
        <div
          id={`section-${id}`}
          className="px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
interface CustomizationPanelProps {
  cardData: GreetingCardData;
  onChange: (updates: Partial<GreetingCardData>) => void;
  contacts?: any[];
  selectedContact?: any;
  onSelectContact?: (contact: any) => void;
  autoFitResult?: AutoFitResult;
}

export default function CustomizationPanel({
  cardData,
  onChange,
  contacts = [],
  selectedContact,
  onSelectContact,
  autoFitResult,
}: CustomizationPanelProps) {
  const [openSection, setOpenSection] = useState<string>('contact');

  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? '' : id));

  // Get age and interests from selected contact
  const recipientAge = selectedContact?.age;
  const contactInterests = selectedContact?.interests || [];

  return (
    <div
      className="space-y-2.5 overflow-y-auto pr-1"
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* 0 ─ Select Contact */}
      <AccordionSection
        id="contact"
        label="Select Contact"
        icon={<Search size={14} className="text-indigo-500" />}
        isOpen={openSection === 'contact'}
        onToggle={() => toggle('contact')}
      >
        <div className="space-y-2.5">
          <ContactSelector
            contacts={contacts}
            selected={selectedContact}
            onSelect={(c) => {
              if (onSelectContact) onSelectContact(c);
              if (c) {
                onChange({ recipient_name: c.name });
              }
            }}
          />
          {selectedContact ? (
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {selectedContact.name?.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-black dark:text-white">{selectedContact.name}</span>
                  {selectedContact.email && (
                    <span className="text-[11px] text-slate-700 dark:text-slate-400 ml-1.5">({selectedContact.email})</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                ✓ Selected
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-slate-600 dark:text-slate-400">
              Choose a contact — their name &amp; email are filled in automatically.
            </p>
          )}
          {selectedContact && !selectedContact.email && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
              This contact has no email address on file.
            </p>
          )}
        </div>
      </AccordionSection>

      {/* 1 ─ Recipient & Message */}
      <AccordionSection
        id="text"
        label="Recipient & Message"
        icon={<User size={14} className="text-indigo-500" />}
        isOpen={openSection === 'text'}
        onToggle={() => toggle('text')}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="card-heading" className={LABEL_CLS}>Card Greeting / Heading</label>
            <input
              id="card-heading"
              type="text"
              value={cardData.heading || ''}
              onChange={(e) => onChange({ heading: e.target.value })}
              placeholder={getDefaultHeading(cardData.occasion)}
              className={INPUT_CLS}
              autoComplete="off"
            />
            <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
              The main title displayed at the top of your greeting card.
            </p>
          </div>

          <div>
            <label htmlFor="recipient-name" className={LABEL_CLS}>Recipient Name</label>
            <input
              id="recipient-name"
              type="text"
              value={cardData.recipient_name || ''}
              onChange={(e) => onChange({ recipient_name: e.target.value })}
              placeholder="Enter recipient name or select contact above"
              className={INPUT_CLS}
              autoComplete="off"
            />
            <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Select a contact above or type recipient name directly.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="personal-message" className={LABEL_CLS.replace('mb-1.5 block', '')}>
                Personal Message
              </label>
              <span className="text-[9px] text-black dark:text-white font-bold tabular-nums">
                {cardData.personal_message?.length ?? 0} / 500
              </span>
            </div>
            <textarea
              id="personal-message"
              value={cardData.personal_message || ''}
              onChange={(e) => onChange({ personal_message: e.target.value })}
              placeholder="Write your heartfelt wishes here..."
              rows={4}
              maxLength={500}
              className={`${INPUT_CLS} ${
                autoFitResult?.overflow ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''
              }`}
            />

            {/* Auto-fit Feedback & Overflow Warnings */}
            {autoFitResult?.overflow ? (
              <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] space-y-2 font-medium">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>Your message is too long for this card design. Please shorten the message or choose another template.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenSection('ai')}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                >
                  <Sparkles size={11} className="text-white" />
                  <span>✨ Shorten with AI Assistant</span>
                </button>
              </div>
            ) : autoFitResult && autoFitResult.fittedFontSize < (cardData.font_size || 18) && cardData.personal_message ? (
              <p className="mt-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                <Sparkles size={11} />
                <span>Auto-fit active: Font size adjusted to {autoFitResult.fittedFontSize}px to fit perfectly.</span>
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="card-signature" className={LABEL_CLS}>Your Name / Signature (Optional)</label>
            <input
              id="card-signature"
              type="text"
              value={cardData.signature || ''}
              onChange={(e) => onChange({ signature: e.target.value })}
              placeholder="e.g. With love, Alex"
              className={INPUT_CLS}
              autoComplete="off"
            />
          </div>
        </div>
      </AccordionSection>

      {/* 2 ─ AI Message Assistant */}
      <AccordionSection
        id="ai"
        label="AI Message Assistant"
        icon={<Sparkles size={14} className="text-indigo-500" />}
        isOpen={openSection === 'ai'}
        onToggle={() => toggle('ai')}
      >
        <AIMessagePanel
          recipientName={cardData.recipient_name}
          occasion={cardData.occasion}
          currentMessage={cardData.personal_message || ''}
          onUpdateMessage={(msg) => onChange({ personal_message: msg })}
          recipientAge={recipientAge}
          interests={contactInterests}
        />
      </AccordionSection>

      {/* 3 ─ Typography */}
      <AccordionSection
        id="typography"
        label="Typography & Styling"
        icon={<Type size={14} className="text-indigo-500" />}
        isOpen={openSection === 'typography'}
        onToggle={() => toggle('typography')}
      >
        <FontSelector
          fontFamily={cardData.font_family || 'Inter'}
          fontSize={cardData.font_size || 18}
          textColor={cardData.text_color || '#FFFFFF'}
          onChange={(key, value) => onChange({ [key]: value })}
        />
      </AccordionSection>

      {/* 4 ─ Background Design */}
      <AccordionSection
        id="background"
        label="Background Design"
        icon={<Palette size={14} className="text-indigo-500" />}
        isOpen={openSection === 'background'}
        onToggle={() => toggle('background')}
      >
        <BackgroundPicker
          backgroundColor={cardData.background_color}
          backgroundGradient={cardData.background_gradient}
          backgroundPattern={cardData.background_pattern}
          backgroundImage={cardData.background_image}
          onChange={(updates) => onChange(updates)}
        />
      </AccordionSection>

      {/* 5 ─ Recipient Photo */}
      <AccordionSection
        id="photo"
        label="Recipient Photo"
        icon={<ImageIcon size={14} className="text-indigo-500" />}
        isOpen={openSection === 'photo'}
        onToggle={() => toggle('photo')}
      >
        <PhotoUploader
          photoUrl={cardData.recipient_photo}
          onUpload={(url) => onChange({ recipient_photo: url })}
          onRemove={() => onChange({ recipient_photo: '' })}
        />
      </AccordionSection>

      {/* 6 ─ Emoji */}
      <AccordionSection
        id="emoji"
        label="Add Emoji Decoration"
        icon={<Smile size={14} className="text-indigo-500" />}
        isOpen={openSection === 'emoji'}
        onToggle={() => toggle('emoji')}
      >
        <EmojiPicker
          selectedEmoji={cardData.emoji}
          onSelectEmoji={(emoji) => onChange({ emoji })}
        />
      </AccordionSection>

      {/* 7 ─ Sticker */}
      <AccordionSection
        id="sticker"
        label="Add Sticker"
        icon={<Sticker size={14} className="text-indigo-500" />}
        isOpen={openSection === 'sticker'}
        onToggle={() => toggle('sticker')}
      >
        <StickerPicker
          selectedSticker={cardData.sticker}
          onSelectSticker={(sticker) => onChange({ sticker })}
        />
      </AccordionSection>
    </div>
  );
}
import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, User, Type, Palette,
  Image as ImageIcon, Smile, Sticker, Sparkles, Search,
} from 'lucide-react';
import FontSelector from './FontSelector';
import BackgroundPicker from './BackgroundPicker';
import PhotoUploader from './PhotoUploader';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';
import AIMessagePanel from './AIMessagePanel';
import ContactSelector from '../../components/ContactSelector';
import { GreetingCardData } from '../types';

// ─── Shared design tokens ──────────────────────────────────────────────────────
const INPUT_CLS =
  'w-full bg-[#111827] text-[#F8FAFC] placeholder-[#94A3B8] text-xs rounded-xl px-3 py-2.5 border border-[#334155] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none';
const LABEL_CLS =
  'text-[10px] text-[#CBD5E1] uppercase tracking-wider font-semibold mb-1.5 block';

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
    <div className="border border-[#1E293B] rounded-xl">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`section-${id}`}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0F172A]/80 hover:bg-[#1E293B]/60 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-[11px] font-semibold text-[#CBD5E1]">{label}</span>
        </div>
        {isOpen
          ? <ChevronDown size={14} className="text-[#94A3B8]" />
          : <ChevronRight size={14} className="text-[#94A3B8]" />
        }
      </button>
      {isOpen && (
        <div
          id={`section-${id}`}
          className="px-4 pb-4 pt-3 border-t border-[#1E293B] bg-[#0B0F19]/40"
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
}

export default function CustomizationPanel({
  cardData,
  onChange,
  contacts = [],
  selectedContact,
  onSelectContact,
}: CustomizationPanelProps) {
  const [openSection, setOpenSection] = useState<string>('contact');

  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? '' : id));

  // Get age and interests from selected contact
  const recipientAge = selectedContact?.age;
  const contactInterests = selectedContact?.interests || [];

  return (
    <div
      className="space-y-2 overflow-y-auto pr-1"
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* 0 ─ Select Contact (reuses the AI Greeting ContactSelector) */}
      <AccordionSection
        id="contact"
        label="Select Contact"
        icon={<Search size={14} className="text-indigo-400" />}
        isOpen={openSection === 'contact'}
        onToggle={() => toggle('contact')}
      >
        <div className="space-y-2">
          <ContactSelector
            contacts={contacts}
            selected={selectedContact}
            onSelect={(c) => onSelectContact && onSelectContact(c)}
          />
          {!selectedContact && (
            <p className="text-[10px] text-[#64748B]">
              Choose a contact — their name &amp; email are filled in automatically.
            </p>
          )}
          {selectedContact && !selectedContact.email && (
            <p className="text-[10px] text-rose-400/80">
              This contact has no email address on file.
            </p>
          )}
        </div>
      </AccordionSection>

      {/* 1 ─ Recipient & Message */}
      <AccordionSection
        id="text"
        label="Recipient & Message"
        icon={<User size={14} className="text-indigo-400" />}
        isOpen={openSection === 'text'}
        onToggle={() => toggle('text')}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="recipient-name" className={LABEL_CLS}>Recipient Name</label>
            <input
              id="recipient-name"
              type="text"
              value={cardData.recipient_name}
              readOnly
              disabled
              placeholder="Select a contact in the Send step"
              className={`${INPUT_CLS} opacity-80 cursor-not-allowed`}
              autoComplete="off"
            />
            <p className="text-[9px] text-[#64748B] mt-1">
              Auto-filled from the selected contact above.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="personal-message" className={LABEL_CLS.replace('mb-1.5 ', '')}>
                Personal Message
              </label>
              <span className="text-[9px] text-[#64748B] tabular-nums">
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
              className={INPUT_CLS}
            />
          </div>
        </div>
      </AccordionSection>

      {/* 2 ─ AI Message Assistant */}
      <AccordionSection
        id="ai"
        label="AI Message Assistant"
        icon={<Sparkles size={14} className="text-indigo-400" />}
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
        icon={<Type size={14} className="text-indigo-400" />}
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
        icon={<Palette size={14} className="text-indigo-400" />}
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
        icon={<ImageIcon size={14} className="text-indigo-400" />}
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
        icon={<Smile size={14} className="text-indigo-400" />}
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
        icon={<Sticker size={14} className="text-indigo-400" />}
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
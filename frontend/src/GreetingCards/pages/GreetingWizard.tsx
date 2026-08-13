import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cake, Heart, Sparkles, Flame, Trees, GraduationCap, Gift, Smile, Star,
  Briefcase, Plus, ChevronRight, ChevronLeft, Send, ArrowRight, X
} from 'lucide-react';
import Stepper from '../components/Stepper';
import CustomizationPanel from '../components/CustomizationPanel';
import LivePreview from '../components/LivePreview';
import BottomToolbar from '../components/BottomToolbar';
import TemplateGrid from '../components/TemplateGrid';
import TemplatePreview from '../components/TemplatePreview';
import { cardsAPI, cardTemplatesAPI } from '../../services/greetingCardsAPI';
import { GreetingCardData, CardTemplate } from '../types';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';

const STEPS = ['Select Occasion', 'Choose Template', 'Customize Card', 'Send & Download'];

const OCCASIONS = [
  { name: 'Birthday', icon: Cake, color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30' },
  { name: 'Anniversary', icon: Heart, color: 'from-red-500/20 to-pink-500/20 border-red-500/30' },
  { name: 'Wedding', icon: Gift, color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30' },
  { name: 'Festival', icon: Sparkles, color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30' },
  { name: 'Christmas', icon: Trees, color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30' },
  { name: 'Diwali', icon: Flame, color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30' },
  { name: 'Graduation', icon: GraduationCap, color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30' },
  { name: 'Mother\'s Day', icon: Smile, color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30' },
  { name: 'Father\'s Day', icon: Star, color: 'from-indigo-500/20 to-sky-500/20 border-indigo-500/30' },
  { name: 'Valentine\'s Day', icon: Heart, color: 'from-rose-500/20 to-red-500/20 border-rose-500/30' },
  { name: 'Corporate', icon: Briefcase, color: 'from-slate-500/20 to-zinc-500/20 border-slate-500/30' },
  { name: 'Custom', icon: Plus, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30' },
];

export default function GreetingWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const { contacts, refetchGreetingAnalytics, fetchNotifications } = useData();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);

  // Core state for guided greeting card
  const [cardData, setCardData] = useState<GreetingCardData>({
    title: 'My Custom Greeting Card',
    occasion: 'Birthday',
    recipient_name: '',
    card_size: 'instagram_square',
    card_theme: 'dark',
    card_width: 500,
    card_height: 500,
    background_color: '#0F172A',
    personal_message: '',
    elements_json: [],
    status: 'draft',
    font_family: 'Inter',
    font_size: 18,
    text_color: '#FFFFFF',
  });

  // Load existing card if editing or creating via route param
  useEffect(() => {
    if (id) {
      cardsAPI.get(id).then((res) => {
        const data = res.data;
        setCardData({
          id: data.id,
          title: data.title,
          occasion: data.occasion || '',
          recipient_name: data.recipient_name || '',
          card_size: data.card_size || 'instagram_square',
          card_theme: data.card_theme || 'dark',
          card_width: data.card_width || 500,
          card_height: data.card_height || 500,
          background_color: data.background_color || '#0F172A',
          background_image: data.background_image || '',
          background_pattern: data.background_pattern || '',
          background_gradient: data.background_gradient || '',
          personal_message: data.personal_message || '',
          recipient_photo: data.recipient_photo || '',
          emoji: data.emoji || '',
          sticker: data.sticker || '',
          font_family: data.font_family || 'Inter',
          font_size: data.font_size || 18,
          text_color: data.text_color || '#FFFFFF',
          elements_json: data.elements_json || [],
          status: data.status || 'draft',
        });
        setStep(3); // Start directly at customize step if card exists
      });
    }
  }, [id]);

  // Load premium templates (base) + optionally merge API templates
  useEffect(() => {
    if (step === 2) {
      setTemplatesLoading(true);
      // Premium templates are already the default; try to enrich with API templates.
      cardTemplatesAPI.getAll()
        .then((res) => {
          const apiTpls = res.data.results || res.data || [];
          if (apiTpls.length) setTemplates(apiTpls);
        })
        .catch(() => { /* keep premium templates */ })
        .finally(() => setTemplatesLoading(false));
    }
  }, [step]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectOccasion = (occName: string) => {
    setCardData((prev) => ({ ...prev, occasion: occName }));
    setStep(2);
  };

  const handleSelectTemplate = (tpl: CardTemplate) => {
    setSelectedTemplateId(tpl.id);
    setCardData((prev) => ({
      ...prev,
      background_color: tpl.background_color,
      background_image: tpl.background_image_url || '',
      elements_json: tpl.elements_json || [],
      font_family: tpl.font_family || prev.font_family,
      font_size: tpl.font_size || prev.font_size,
      text_color: tpl.text_color || prev.text_color,
      occasion: tpl.occasion || prev.occasion,
    }));
    setStep(3);
  };

  const handleSave = async (status: 'draft' | 'published') => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', cardData.title);
      if (cardData.occasion) fd.append('occasion', cardData.occasion);
      fd.append('recipient_name', cardData.recipient_name);
      fd.append('card_size', cardData.card_size);
      fd.append('card_theme', cardData.card_theme);
      fd.append('card_width', String(cardData.card_width));
      fd.append('card_height', String(cardData.card_height));
      fd.append('background_color', cardData.background_color);
      if (cardData.background_image) fd.append('background_image_url', cardData.background_image);
      fd.append('personal_message', cardData.personal_message || '');
      if (cardData.recipient_photo) fd.append('recipient_photo', cardData.recipient_photo);
      if (cardData.emoji) fd.append('emoji', cardData.emoji);
      if (cardData.sticker) fd.append('sticker', cardData.sticker);
      fd.append('font_family', cardData.font_family || 'Inter');
      fd.append('font_size', String(cardData.font_size));
      fd.append('text_color', cardData.text_color || '#FFFFFF');
      fd.append('status', status);

      let res;
      if (cardData.id) {
        res = await cardsAPI.update(cardData.id, fd);
      } else {
        res = await cardsAPI.create(fd);
      }

      const savedCardId = res.data.id;
      setCardData((prev) => ({ ...prev, id: savedCardId }));

      // Save preview snapshot using html2canvas
      if (cardRef.current) {
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 1 });
          const base64 = canvas.toDataURL('image/png');
          await cardsAPI.savePreview(savedCardId, base64);
        } catch (previewErr) {
          // Log but do not block sending — preview attachment is optional.
          console.warn('Greeting card preview generation failed:', previewErr);
        }
      }

      toast.success(status === 'published' ? 'Wishes sent & published!' : 'Draft saved successfully');

      // If publishing, send the card to the selected contact via the backend send endpoint
      if (status === 'published' && selectedContact?.id) {
        try {
          await cardsAPI.sendCard(savedCardId, selectedContact.id);
          // Refresh dashboard analytics and notifications without a page reload
          if (refetchGreetingAnalytics) refetchGreetingAnalytics();
          if (fetchNotifications) fetchNotifications();
          toast.success('🎉 Greeting card sent to ' + selectedContact.name + '!');
        } catch (sendErr) {
          const msg = (sendErr as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.error
            || (sendErr as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            || 'Failed to send email.';
          console.error('Greeting card send failed:', (sendErr as { response?: { data?: unknown } })?.response?.data || sendErr);
          toast.error(msg);
        }
      }

      if (status === 'published') {
        navigate(`/greeting-cards`);
      }
    } catch {
      toast.error('Failed to save card data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (cardRef.current) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 2 });
        const link = document.createElement('a');
        link.download = `${cardData.occasion || 'Greeting'}_Wish.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Downloaded card image!');
      } catch {
        toast.error('Failed to generate image download');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-slate-100 overflow-hidden">
      {/* Header bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-[#0F1422]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">Auto-Wish AI Redesign</h1>
            <p className="text-[10px] text-slate-400">Premium guided greeting cards</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-all"
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-650/10 transition-all"
            >
              <span>Next Step</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Stepper progress */}
      <div className="p-4 bg-[#0B0F19]">
        <Stepper currentStep={step} steps={STEPS} />
      </div>

      {/* Step Contents */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* STEP 1: Select Occasion */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6"
            >
              <div className="text-center space-y-2 max-w-md mx-auto py-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Select Occasion</h2>
                <p className="text-xs text-slate-400">
                  Select the target event occasion category to guide custom cards designs
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {OCCASIONS.map((occ) => {
                  const Icon = occ.icon;
                  return (
                    <button
                      key={occ.name}
                      onClick={() => handleSelectOccasion(occ.name)}
                      className={`flex flex-col items-center justify-center p-6 rounded-2xl border bg-gradient-to-br ${occ.color} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white mb-3 shadow-md group-hover:bg-indigo-600 group-hover:scale-115 transition-all duration-300">
                        <Icon size={22} />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                        {occ.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Choose Template */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-full overflow-y-auto p-6 max-w-5xl mx-auto space-y-6"
            >
              <div className="text-center space-y-2 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-white tracking-tight">Choose Card Design</h2>
                <p className="text-xs text-slate-400">
                  Pick a premium theme base to customize.
                </p>
              </div>

              <TemplateGrid
                templates={templates}
                favorites={favorites}
                onUseTemplate={handleSelectTemplate}
                onPreviewTemplate={(tpl) => setPreviewTemplate(tpl)}
                onToggleFavorite={toggleFavorite}
              />
            </motion.div>
          )}

            {/* Template Preview Modal */}
            <AnimatePresence>
              {previewTemplate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <motion.div
                    initial={{ scale: 0.94, y: 12 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.94, y: 12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="w-full max-w-sm bg-[#0F1422] border border-[#334155] rounded-2xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B]">
                      <h3 className="text-sm font-bold text-[#F8FAFC]">Template Preview</h3>
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(null)}
                        className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 transition-all"
                        aria-label="Close"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="p-5">
                      <TemplatePreview template={previewTemplate} showLabel={false} />
                      <p className="text-center text-[11px] text-[#94A3B8] mt-3">{previewTemplate.title}</p>
                      <button
                        type="button"
                        onClick={() => { handleSelectTemplate(previewTemplate); setPreviewTemplate(null); }}
                        className="w-full mt-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Use This Template
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          {/* STEP3: Customize Card & Live Preview */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col md:flex-row overflow-hidden"
            >
              {/* Left customization panel (guided customization) */}
              <div className="w-full md:w-[35%] border-r border-slate-850 bg-[#0F1422]/60 p-4 overflow-y-auto">
                <CustomizationPanel
                  cardData={cardData}
                  onChange={(updates) => setCardData((prev) => ({ ...prev, ...updates }))}
                  contacts={contacts}
                  selectedContact={selectedContact}
                  onSelectContact={(c) => {
                    setSelectedContact(c);
                    if (c) {
                      setCardData((prev) => ({
                        ...prev,
                        selectedContactId: c.id,
                        recipient_name: c.name,
                        recipient_email: c.email || '',
                      }));
                    } else {
                      setCardData((prev) => ({
                        ...prev,
                        selectedContactId: null,
                        recipient_name: '',
                        recipient_email: '',
                      }));
                    }
                  }}
                />
              </div>

              {/* Right side live card preview (occupies ~65% width) */}
              <div className="w-full md:w-[65%] bg-[#0B0F19] flex flex-col justify-center items-center p-6 relative">
                <div className="w-full max-w-[450px]">
                  <LivePreview ref={cardRef} cardData={cardData} />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP4: Complete Send & Download */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-full overflow-y-auto p-6 max-w-2xl mx-auto flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/5 animate-pulse">
                <Send size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Your Card is Ready!</h2>
                <p className="text-xs text-slate-400 max-w-sm">
                  Send this beautifully crafted greeting card to your recipient instantly or download high quality image.
                </p>
              </div>

              <div className="w-full max-w-[340px] bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
                <LivePreview cardData={cardData} />
              </div>

              {!selectedContact && (
                <p className="text-[11px] text-amber-400/90">
                  Please select a contact before sending.
                </p>
              )}
              {selectedContact && !selectedContact.email && (
                <p className="text-[11px] text-rose-400/90">
                  Selected contact has no email address on file.
                </p>
              )}

              <div className="flex gap-3 w-full max-w-sm">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold border border-slate-800 transition-all"
                >
                  Download Image
                </button>
                <button
                  onClick={() => handleSave('published')}
                  disabled={!selectedContact?.id || !selectedContact?.email || loading}
                  className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-650/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-650/20 transition-all"
                >
                  Send Card Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      {step === 3 && (
        <BottomToolbar
          onSaveDraft={() => handleSave('draft')}
          onSaveTemplate={() => handleSave('draft')} // backend template save wraps draft
          onPreview={() => setStep(4)}
          onDownload={handleDownload}
          onSend={() => handleSave('published')}
          isSaving={loading}
        />
      )}
    </div>
  );
}

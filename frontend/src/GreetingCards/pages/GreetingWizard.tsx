import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cake, Heart, Sparkles, Flame, Trees, GraduationCap, Gift, Smile, Star,
  Briefcase, Plus, ChevronRight, ChevronLeft, Send, ArrowRight, X
} from 'lucide-react';
import Stepper from '../components/Stepper';
import CustomizationPanel from '../components/CustomizationPanel';
import LivePreview from '../components/LivePreview';
import GreetingCardRenderer from '../components/GreetingCardRenderer';
import BottomToolbar from '../components/BottomToolbar';
import TemplateGrid from '../components/TemplateGrid';
import TemplatePreview from '../components/TemplatePreview';
import { cardsAPI, cardTemplatesAPI } from '../../services/greetingCardsAPI';
import { GreetingCardData, CardTemplate } from '../types';
import { useData } from '../../context/DataContext';
import { AutoFitResult } from '../utils/textMeasurement';
import { exportAuthoritativeGreetingCard } from '../utils/cardExporter';
import { getDefaultDecor, getDefaultHeading } from '../components/DecorLayer';
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
  { name: 'Corporate', icon: Briefcase, color: 'from-slate-500/20 to-zinc-500/20 border-line-strong/30' },
  { name: 'Custom', icon: Plus, color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30' },
];

export default function GreetingWizard() {
  const { id, cardId } = useParams();
  const activeCardId = cardId || id;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const authoritativeCardRef = useRef<HTMLDivElement>(null);
  const { contacts, refetchGreetingAnalytics, fetchNotifications } = useData();
  // Prevent double-fetch on React StrictMode double-mount
  const templateInitialized = useRef(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCardLoading, setIsCardLoading] = useState(Boolean(activeCardId));
  const [cardLoadError, setCardLoadError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);
  const [autoFitResult, setAutoFitResult] = useState<AutoFitResult | null>(null);

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
    heading: 'Happy Birthday!',
    decor: 'sparkle',
    accent_color: '#818cf8',
    elements_json: [],
    status: 'draft',
    font_family: 'Inter',
    font_size: 18,
    text_color: '#FFFFFF',
  });

  // ─── Load existing USER CARD when editing via route param (:cardId or :id) ──
  useEffect(() => {
    if (!activeCardId) {
      setIsCardLoading(false);
      return;
    }

    let isMounted = true;
    setIsCardLoading(true);
    setCardLoadError(null);

    cardsAPI.get(activeCardId)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        if (!data) throw new Error('No card data returned');

        // Safely parse elements_json which may be a JSON string or already an array
        let elements = data.elements_json;
        if (typeof elements === 'string') {
          try { elements = JSON.parse(elements); } catch { elements = []; }
        }

        const textStyle = (typeof data.text_style === 'object' && data.text_style) ? data.text_style : {};
        const emojiVal = data.emoji || textStyle.emoji || '';
        const stickerVal = data.sticker || textStyle.sticker || '';
        const fontColorVal = data.text_color || data.font_color || '#FFFFFF';
        const photoVal = data.recipient_photo || data.uploaded_photo_url || data.uploaded_photo || '';
        const bgImgVal = data.background_image_url || data.background_image || '';
        const bgGradVal = data.background_gradient || textStyle.background_gradient || '';
        const bgPatternVal = data.background_pattern || textStyle.background_pattern || '';
        const decorVal = data.decor || textStyle.decor || getDefaultDecor(data.occasion);
        const headingVal = data.heading || textStyle.heading || getDefaultHeading(data.occasion);
        const subtitleVal = data.subtitle || textStyle.subtitle || '';
        const signatureVal = data.signature || textStyle.signature || '';
        const footerVal = data.footer || textStyle.footer || '';
        const accentColorVal = data.accent_color || textStyle.accent_color || '';

        setCardData({
          id: data.id,
          title: data.title || 'My Custom Greeting Card',
          occasion: data.occasion || '',
          heading: headingVal,
          subtitle: subtitleVal,
          signature: signatureVal,
          footer: footerVal,
          decor: decorVal,
          accent_color: accentColorVal,
          recipient_name: data.recipient_name || '',
          card_size: data.card_size || 'instagram_square',
          card_theme: data.card_theme || 'dark',
          card_width: data.card_width || 500,
          card_height: data.card_height || 500,
          background_color: data.background_color || '#0F172A',
          background_image: bgImgVal,
          background_pattern: bgPatternVal,
          background_gradient: bgGradVal,
          personal_message: data.personal_message || data.message || '',
          recipient_photo: photoVal,
          emoji: emojiVal,
          sticker: stickerVal,
          font_family: data.font_family || 'Inter',
          font_size: data.font_size || 18,
          text_color: fontColorVal,
          elements_json: Array.isArray(elements) ? elements : [],
          status: data.status || 'draft',
          selectedContactId: data.contact || null,
        });

        if (data.template) {
          setSelectedTemplateId(data.template);
        }

        // Contact mapping
        if (data.contact_info) {
          setSelectedContact(data.contact_info);
        } else if (data.contact && contacts && contacts.length > 0) {
          const match = contacts.find((c: any) => c.id === data.contact);
          if (match) setSelectedContact(match);
          else setSelectedContact({ id: data.contact, name: data.recipient_name });
        } else if (data.recipient_name) {
          setSelectedContact({ id: data.contact || null, name: data.recipient_name });
        }

        setStep(3); // Start directly at customize step if card exists
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Failed to load greeting card for editing', error, { cardId: activeCardId });
        const status = error?.response?.status;
        if (status === 404) {
          setCardLoadError('This greeting card could not be found.');
        } else if (status === 403) {
          setCardLoadError('You do not have permission to edit this card.');
        } else {
          setCardLoadError('Unable to load the greeting card. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) setIsCardLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCardId]);

  // Sync selected contact if contacts list loads asynchronously
  useEffect(() => {
    if (cardData.id && contacts && contacts.length > 0) {
      if (!selectedContact?.email && cardData.recipient_name) {
        const match = contacts.find((c: any) =>
          (cardData.selectedContactId && c.id === cardData.selectedContactId) ||
          (c.name && c.name.toLowerCase() === cardData.recipient_name.toLowerCase())
        );
        if (match) setSelectedContact(match);
      }
    }
  }, [contacts, cardData.id, cardData.recipient_name, cardData.selectedContactId]);

  // ─── Load TEMPLATE when navigating from Templates page (?template=<id>) ──────
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (!templateId) return;
    // Guard against React StrictMode double-invocation
    if (templateInitialized.current) return;
    templateInitialized.current = true;

    setIsInitializing(true);
    setInitError(null);

    cardTemplatesAPI.get(templateId)
      .then((res) => {
        const tpl: CardTemplate = res.data;
        // Safely normalize elements_json — may be a JSON string or already an array
        let elements = tpl.elements_json;
        if (typeof elements === 'string') {
          try { elements = JSON.parse(elements as unknown as string); } catch { elements = []; }
        }
        setSelectedTemplateId(tpl.id);
        const tplMeta = (typeof tpl.metadata === 'object' && tpl.metadata) ? tpl.metadata : {};
        const tplDecor = (tplMeta.decor as string) || getDefaultDecor(tpl.occasion);
        let tplHeading = '';
        if (Array.isArray(elements)) {
          const titleEl = elements.find((e: any) => e.id === 'el_title' || e.id === 'el_heading');
          if (titleEl && titleEl.content) tplHeading = titleEl.content;
        }
        if (!tplHeading) tplHeading = getDefaultHeading(tpl.occasion);

        setCardData((prev) => ({
          ...prev,
          title: prev.title === 'My Custom Greeting Card'
            ? `${tpl.title} Card`
            : prev.title,
          heading: tplHeading,
          occasion: tpl.occasion || prev.occasion,
          decor: tplDecor,
          accent_color: tpl.accent_color || tpl.primary_color || '',
          primary_color: tpl.primary_color || '',
          secondary_color: tpl.secondary_color || '',
          card_size: 'instagram_square',
          card_theme: 'dark',
          card_width: tpl.card_width || prev.card_width,
          card_height: tpl.card_height || prev.card_height,
          background_color: tpl.background_color || prev.background_color,
          background_image: tpl.background_image_url || '',
          font_family: tpl.font_family || prev.font_family,
          font_size: tpl.font_size || prev.font_size,
          text_color: tpl.text_color || prev.text_color,
          elements_json: Array.isArray(elements) ? elements : [],
        }));
        setStep(3);
      })
      .catch((error) => {
        console.error('Failed to initialize template editor', error, { templateId });
        setInitError('Could not load the selected template. It may no longer be available.');
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [searchParams]);

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
    setCardData((prev) => ({
      ...prev,
      occasion: occName,
      heading: getDefaultHeading(occName),
      decor: getDefaultDecor(occName),
    }));
    setStep(2);
  };

  const handleSelectTemplate = (tpl: CardTemplate) => {
    setSelectedTemplateId(tpl.id);

    const tplMeta = (typeof tpl.metadata === 'object' && tpl.metadata) ? tpl.metadata : {};
    const tplDecor = (tplMeta.decor as string) || getDefaultDecor(tpl.occasion);
    let elements = tpl.elements_json;
    if (typeof elements === 'string') {
      try { elements = JSON.parse(elements as unknown as string); } catch { elements = []; }
    }

    let tplHeading = '';
    let templateMsg = '';
    if (Array.isArray(elements)) {
      const titleEl = elements.find((e: any) => e.id === 'el_title' || e.id === 'el_heading');
      if (titleEl && titleEl.content) tplHeading = titleEl.content;
      const msgEl = elements.find((e: any) => e.type === 'text' && (e.id === 'el_message' || (e.content && e.content.length > 15)));
      if (msgEl) templateMsg = msgEl.content;
    }
    if (!tplHeading) tplHeading = getDefaultHeading(tpl.occasion);

    setCardData((prev) => ({
      ...prev,
      background_color: tpl.background_color,
      background_image: tpl.background_image_url || '',
      elements_json: Array.isArray(elements) ? elements : [],
      heading: tplHeading,
      decor: tplDecor,
      accent_color: tpl.accent_color || tpl.primary_color || '',
      primary_color: tpl.primary_color || '',
      secondary_color: tpl.secondary_color || '',
      personal_message: prev.personal_message || templateMsg,
      font_family: tpl.font_family || prev.font_family,
      font_size: tpl.font_size || prev.font_size,
      text_color: tpl.text_color || prev.text_color,
      occasion: tpl.occasion || prev.occasion,
    }));
    setStep(3);
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (status === 'published' && autoFitResult?.overflow) {
      toast.error('Cannot publish card: The message is too long for this card design. Please shorten the message first.');
      return;
    }

    if (status === 'published' && !selectedContact?.id) {
      toast.error('Please select a recipient contact before sending.');
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', cardData.title);
      if (cardData.occasion) fd.append('occasion', cardData.occasion);
      fd.append('recipient_name', cardData.recipient_name || '');
      fd.append('card_size', cardData.card_size || 'instagram_square');
      fd.append('card_theme', cardData.card_theme || 'dark');
      fd.append('card_width', String(cardData.card_width || 500));
      fd.append('card_height', String(cardData.card_height || 500));
      fd.append('background_color', cardData.background_color || '#0F172A');
      if (cardData.background_image) {
        fd.append('background_image', cardData.background_image);
        fd.append('background_image_url', cardData.background_image);
      }
      if (cardData.background_gradient) fd.append('background_gradient', cardData.background_gradient);
      if (cardData.background_pattern) fd.append('background_pattern', cardData.background_pattern);
      fd.append('personal_message', cardData.personal_message || '');
      fd.append('message', cardData.personal_message || '');
      if (cardData.recipient_photo) {
        fd.append('recipient_photo', cardData.recipient_photo);
        fd.append('uploaded_photo', cardData.recipient_photo);
      }
      if (cardData.emoji) fd.append('emoji', cardData.emoji);
      if (cardData.sticker) fd.append('sticker', cardData.sticker);
      fd.append('font_family', cardData.font_family || 'Inter');
      fd.append('font_size', String(cardData.font_size || 18));
      fd.append('font_color', cardData.text_color || '#FFFFFF');
      fd.append('text_color', cardData.text_color || '#FFFFFF');
      if (cardData.heading) fd.append('heading', cardData.heading);
      if (cardData.subtitle) fd.append('subtitle', cardData.subtitle);
      if (cardData.signature) fd.append('signature', cardData.signature);
      if (cardData.footer) fd.append('footer', cardData.footer);
      if (cardData.decor) fd.append('decor', cardData.decor);
      if (cardData.accent_color) fd.append('accent_color', cardData.accent_color);
      fd.append('elements_json', JSON.stringify(cardData.elements_json || []));
      fd.append('status', status);

      if (selectedContact?.id) {
        fd.append('contact', String(selectedContact.id));
      }
      if (selectedTemplateId) {
        fd.append('template', String(selectedTemplateId));
      }

      let res;
      const targetId = cardData.id || activeCardId;
      if (targetId) {
        res = await cardsAPI.update(targetId, fd);
      } else {
        res = await cardsAPI.create(fd);
      }

      const savedCardId = res.data.id;
      setCardData((prev) => ({ ...prev, id: savedCardId }));

      // Save authoritative preview snapshot at exact design dimensions (e.g. 500x500 at 2x = 1000x1000)
      const exportTarget = authoritativeCardRef.current || cardRef.current;
      if (exportTarget) {
        try {
          const exportResult = await exportAuthoritativeGreetingCard(exportTarget, { ...cardData, id: savedCardId }, { scale: 2 });
          await cardsAPI.savePreview(savedCardId, exportResult.base64);
        } catch (previewErr) {
          console.warn('Greeting card preview generation failed:', previewErr);
        }
      }

      // If publishing, send the card to the selected contact via the backend send endpoint
      if (status === 'published' && selectedContact?.id) {
        try {
          await cardsAPI.sendCard(savedCardId, selectedContact.id);
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
      } else {
        toast.success(targetId ? 'Greeting card updated successfully' : 'Draft saved successfully');
      }

      if (status === 'published') {
        navigate(`/greeting-cards`);
      } else if (!activeCardId && savedCardId) {
        navigate(`/greeting-cards/edit/${savedCardId}`, { replace: true });
      }
    } catch (err: any) {
      console.error('Save error:', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to save card data';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (autoFitResult?.overflow) {
      toast.error('Cannot download card: The message is too long for this card design. Please shorten your message first.');
      return;
    }

    const exportTarget = authoritativeCardRef.current || cardRef.current;
    if (exportTarget) {
      try {
        const exportResult = await exportAuthoritativeGreetingCard(exportTarget, cardData, { scale: 2 });
        const link = document.createElement('a');
        link.download = `${cardData.occasion || 'Greeting'}_Wish.png`;
        link.href = exportResult.base64;
        link.click();
        toast.success('Downloaded card image!');
      } catch (err) {
        console.error('Image download error:', err);
        toast.error('Failed to generate image download');
      }
    }
  };

  // ─── Loading / Error gates ────────────────────────────────────────────────────
  if (isInitializing || isCardLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-inset text-slate-100 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-muted">
          {isCardLoading ? 'Loading your greeting card…' : 'Loading template editor…'}
        </p>
      </div>
    );
  }

  if (cardLoadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-inset text-slate-100 gap-4 p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <X size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-fg">Card Unavailable</h2>
        <p className="text-sm text-muted text-center max-w-sm">{cardLoadError}</p>
        <button
          onClick={() => navigate('/greeting-cards')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all"
        >
          Back to My Cards
        </button>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-inset text-slate-100 gap-4 p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <X size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-fg">Template Unavailable</h2>
        <p className="text-sm text-muted text-center max-w-sm">{initError}</p>
        <button
          onClick={() => navigate('/greeting-cards/templates')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-inset text-black dark:text-slate-100 overflow-hidden">
      {/* Header bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-line bg-inset">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-fg">Auto-Wish AI Redesign</h1>
            <p className="text-[10px] text-muted">Premium guided greeting cards</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-raised text-black dark:text-muted hover:text-black dark:hover:text-fg rounded-xl text-xs font-bold border border-line transition-all shadow-sm"
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all"
            >
              <span>Next Step</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Stepper progress */}
      <div className="p-4 bg-inset">
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
                <h2 className="text-xl font-bold text-fg tracking-tight">Select Occasion</h2>
                <p className="text-xs text-muted">
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
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-fg mb-3 shadow-md group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-115 transition-all duration-300">
                        <Icon size={22} />
                      </div>
                      <span className="text-xs font-bold text-fg transition-colors">
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
                <h2 className="text-xl font-bold text-fg tracking-tight">Choose Card Design</h2>
                <p className="text-xs text-muted">
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
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <motion.div
                    initial={{ scale: 0.94, y: 12 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.94, y: 12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="w-full max-w-sm bg-inset border border-line rounded-2xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-soft">
                      <h3 className="text-sm font-bold text-fg">Template Preview</h3>
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(null)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-raised-hover text-muted transition-all"
                        aria-label="Close"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="p-5">
                      <TemplatePreview template={previewTemplate} showLabel={false} />
                      <p className="text-center text-[11px] text-muted mt-3">{previewTemplate.title}</p>
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
              <div className="w-full md:w-[35%] border-r border-line-soft bg-inset/60 p-4 overflow-y-auto">
                <CustomizationPanel
                  cardData={cardData}
                  onChange={(updates) => setCardData((prev) => ({ ...prev, ...updates }))}
                  contacts={contacts}
                  selectedContact={selectedContact}
                  autoFitResult={autoFitResult || undefined}
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
              <div className="w-full md:w-[65%] bg-inset flex flex-col justify-center items-center p-6 relative">
                <div className="w-full max-w-[450px]">
                  <LivePreview
                    ref={cardRef}
                    cardData={cardData}
                    onAutoFitResult={setAutoFitResult}
                  />
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
                <h2 className="text-xl font-bold text-fg">Your Card is Ready!</h2>
                <p className="text-xs text-muted max-w-sm">
                  Send this beautifully crafted greeting card to your recipient instantly or download high quality image.
                </p>
              </div>

              <div className="w-full max-w-[340px] bg-inset/40 p-3 rounded-2xl border border-line-soft/80">
                <LivePreview
                  ref={cardRef}
                  cardData={cardData}
                  onAutoFitResult={setAutoFitResult}
                />
              </div>

              {autoFitResult?.overflow && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs max-w-sm">
                  ⚠️ Your message exceeds the printable card area. Please go back to Customize to shorten it before downloading or sending.
                </div>
              )}

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
                  disabled={autoFitResult?.overflow}
                  className="flex-1 py-2.5 bg-surface hover:bg-raised disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-xl text-xs font-semibold border border-line-soft transition-all"
                >
                  Download Image
                </button>
                <button
                  onClick={() => handleSave('published')}
                  disabled={!selectedContact?.id || !selectedContact?.email || loading || autoFitResult?.overflow}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Card...</span>
                    </>
                  ) : (
                    <span>Send Card Now</span>
                  )}
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
          isOverflowed={Boolean(autoFitResult?.overflow)}
        />
      )}

      {/* Authoritative Final Export Element: isolated offscreen, always rendered at exact intended design dimensions */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: `${cardData.card_width || 500}px`,
          height: `${cardData.card_height || 500}px`,
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none',
          visibility: 'visible',
        }}
        aria-hidden="true"
      >
        <div style={{ width: `${cardData.card_width || 500}px`, height: `${cardData.card_height || 500}px` }}>
          <GreetingCardRenderer
            ref={authoritativeCardRef}
            cardData={cardData}
            showOverflowWarningBadge={false}
            isExportMode={true}
          />
        </div>
      </div>
    </div>
  );
}

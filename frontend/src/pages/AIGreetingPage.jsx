import React, { useState, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  User, Mail, Sparkles, Send, Clock, BookmarkPlus, Copy,
  RefreshCw, Edit3, Check, Globe, MessageSquare, Star, Users,
  Hash, Bot, Zap, ArrowRight, CheckCircle2, Download
} from 'lucide-react';
import ContactSelector from '../components/ContactSelector';
import ContactCard from '../components/ContactCard';
import {
  GlassCard, GlassButton, GlassModal, GlassInput,
  GlassTextarea, GlassSelect, PageHeader, StatusBadge, Skeleton
} from '../components/ui';

// ─── Schedule Modal ───────────────────────────────────────────────────────────
const ScheduleModal = ({ isOpen, onClose, onSubmit, loading, contactName }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [tz, setTz] = useState('Asia/Kolkata');
  const [reminder, setReminder] = useState(15);
  const today = new Date().toISOString().split('T')[0];

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Greeting"
      description={contactName ? `Deliver this wish to ${contactName} automatically.` : 'Pick delivery date and time.'}
      size="md"
      footer={
        <>
          <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
          <GlassButton
            variant="primary"
            loading={loading}
            disabled={!date}
            onClick={() => onSubmit({ date, time, timezone: tz, reminder_minutes: reminder })}
            leftIcon={<Clock size={15} />}
          >
            Schedule Delivery
          </GlassButton>
        </>
      }
    >
      <div className="space-y-4">
        <GlassInput
          label="Date"
          type="date"
          min={today}
          value={date}
          required
          onChange={e => setDate(e.target.value)}
        />
        <GlassInput
          label="Time"
          type="time"
          value={time}
          required
          onChange={e => setTime(e.target.value)}
        />
        <GlassSelect
          label="Timezone"
          value={tz}
          onChange={e => setTz(e.target.value)}
        >
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="America/New_York">America/New_York (ET)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Europe/Paris">Europe/Paris (CET)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
        </GlassSelect>
        <GlassSelect
          label="Reminder Notification"
          value={reminder}
          onChange={e => setReminder(parseInt(e.target.value, 10))}
        >
          <option value={15}>15 minutes before</option>
          <option value={60}>1 hour before</option>
          <option value={1440}>1 day before</option>
        </GlassSelect>
      </div>
    </GlassModal>
  );
};

// ─── Save Template Modal ──────────────────────────────────────────────────────
const SaveTemplateModal = ({ isOpen, onClose, onSubmit, occasion, tone, loading }) => {
  const [name, setName] = useState('');
  const [isFav, setIsFav] = useState(false);

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Template"
      description="Store this generated message for quick reuse later."
      size="sm"
      footer={
        <>
          <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
          <GlassButton
            variant="primary"
            loading={loading}
            onClick={() => onSubmit({ name: name || `${occasion} - ${tone}`, is_favorite: isFav })}
            leftIcon={<BookmarkPlus size={15} />}
          >
            Save Template
          </GlassButton>
        </>
      }
    >
      <div className="space-y-4">
        <GlassInput
          label="Template Name"
          placeholder={`${occasion} - ${tone}`}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
          <button
            type="button"
            onClick={() => setIsFav(f => !f)}
            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
              isFav ? 'bg-amber-500 border-amber-500 text-white' : 'border-line hover:border-amber-400 text-transparent'
            }`}
          >
            <Star size={12} className={isFav ? 'fill-current' : ''} />
          </button>
          <span className="text-xs font-medium text-slate-300">Mark as favourite</span>
        </label>
      </div>
    </GlassModal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AIGreetingPage = () => {
  const { contacts = [], refetchGreetingAnalytics, fetchNotifications } = useData();

  // Form state
  const [selectedContact, setSelectedContact] = useState(null);
  const [occasion, setOccasion] = useState('Birthday');
  const [tone, setTone] = useState('Warm');
  const [language, setLanguage] = useState('en');
  const [age, setAge] = useState('');
  const [relationship, setRelationship] = useState('Friend');
  const [interests, setInterests] = useState('');
  const [customContext, setCustomContext] = useState('');

  // Generation state
  const [greeting, setGreeting] = useState('');
  const [greetingId, setGreetingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');

  // Action loading/success states
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeText = editMode ? editedText : greeting;
  const interestsArray = useMemo(
    () => interests.split(',').map(i => i.trim()).filter(Boolean),
    [interests]
  );

  const wordCount = useMemo(() => {
    if (!activeText) return 0;
    return activeText.trim().split(/\s+/).filter(Boolean).length;
  }, [activeText]);

  const charCount = activeText ? activeText.length : 0;

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (isRegenerate = false) => {
    if (!selectedContact) {
      toast.error('Please select a contact first.');
      return;
    }

    setGenerating(true);
    setGreeting('');
    setEmailSent(false);
    setEditMode(false);

    try {
      const resp = await aiAPI.generateGreeting({
        contact_id: selectedContact.id,
        occasion,
        tone,
        language,
        age: age ? parseInt(age, 10) : null,
        relationship,
        interests: interestsArray,
        custom_context: customContext,
        force_regenerate: isRegenerate === true,
        use_cache: !isRegenerate,
      });
      setGreeting(resp.data.greeting);
      setEditedText(resp.data.greeting);
      setGreetingId(resp.data.id);
    } catch (err) {
      console.error('[AI_GREETING_ERROR]', err.response?.data || err);
      const backendErr = err.response?.data;
      const msg = backendErr?.details
        ? `${backendErr.error}: ${typeof backendErr.details === 'string' ? backendErr.details : JSON.stringify(backendErr.details)}`
        : backendErr?.error || err.message || 'Generation failed. Check your Gemini API key.';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [selectedContact, occasion, tone, language, age, relationship, interestsArray, customContext]);

  // ── Send Email ────────────────────────────────────────────────────────────
  const handleSendEmail = useCallback(async () => {
    if (!selectedContact) { toast.error('No contact selected.'); return; }
    if (!activeText) { toast.error('No greeting to send.'); return; }

    setSendingEmail(true);
    try {
      await aiAPI.sendGreeting({
        contact_id: selectedContact.id,
        greeting_text: activeText,
        occasion,
        greeting_id: greetingId,
      });
      setEmailSent(true);
      toast.success(`Email sent to ${selectedContact.name}! 🎉`);
      if (refetchGreetingAnalytics) refetchGreetingAnalytics();
      if (fetchNotifications) fetchNotifications();
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send email.';
      toast.error(msg);
    } finally {
      setSendingEmail(false);
    }
  }, [selectedContact, activeText, occasion, greetingId, refetchGreetingAnalytics, fetchNotifications]);

  // ── Schedule ──────────────────────────────────────────────────────────────
  const handleScheduleSubmit = useCallback(async ({ date, time, timezone, reminder_minutes }) => {
    if (!date) { toast.error('Please select a date.'); return; }

    setSchedulingLoading(true);
    try {
      await aiAPI.scheduleGreeting({
        contact_id: selectedContact.id,
        greeting_text: activeText,
        occasion,
        date,
        time,
        timezone,
        reminder_minutes,
      });
      toast.success(`Greeting scheduled for ${selectedContact.name} on ${date}!`);
      setShowScheduleModal(false);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to schedule greeting.';
      toast.error(msg);
    } finally {
      setSchedulingLoading(false);
    }
  }, [selectedContact, activeText, occasion]);

  // ── Save Template ─────────────────────────────────────────────────────────
  const handleTemplateSave = useCallback(async ({ name, is_favorite }) => {
    setTemplateLoading(true);
    try {
      await aiAPI.saveTemplate({
        name,
        occasion,
        tone,
        content: activeText,
        is_favorite,
      });
      toast.success(`Template "${name}" saved!`);
      setShowTemplateModal(false);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save template.';
      toast.error(msg);
    } finally {
      setTemplateLoading(false);
    }
  }, [occasion, tone, activeText]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!activeText) return;
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      toast.success('Greeting copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy failed. Please copy manually.');
    }
  }, [activeText]);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!activeText) return;
    const blob = new Blob([activeText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeName = (selectedContact?.name || 'contact').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'greeting';
    const safeOccasion = (occasion || 'occasion').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
    const a = document.createElement('a');
    a.href = url;
    a.download = `greeting-${safeName}-${safeOccasion}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Greeting downloaded!');
  }, [activeText, selectedContact, occasion]);

  // ── Regenerate ────────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    handleGenerate(true);
  }, [handleGenerate]);

  // ── Edit / Save ───────────────────────────────────────────────────────────
  const handleEditToggle = useCallback(() => {
    if (editMode) {
      setGreeting(editedText);
      setEditMode(false);
      toast.success('Changes saved.');
    } else {
      setEditedText(greeting);
      setEditMode(true);
    }
  }, [editMode, editedText, greeting]);

  const occasions = ['Birthday', 'Anniversary', 'Festival', 'Holiday', 'Custom'];
  const tones = ['Warm', 'Friendly', 'Formal', 'Funny', 'Romantic', 'Inspirational'];
  const languages = [
    { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' },
    { code: 'ta', label: 'Tamil' }, { code: 'ml', label: 'Malayalam' },
    { code: 'te', label: 'Telugu' }, { code: 'kn', label: 'Kannada' },
    { code: 'es', label: 'Spanish' }, { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' }, { code: 'ar', label: 'Arabic' },
    { code: 'zh', label: 'Chinese' }, { code: 'ja', label: 'Japanese' },
  ];
  const relationships = ['Friend', 'Brother', 'Sister', 'Mother', 'Father', 'Teacher', 'Colleague', 'Boss', 'Spouse', 'Partner', 'Customer', 'Client'];

  const hasGreeting = Boolean(greeting);
  const canSend = Boolean(hasGreeting && selectedContact?.email);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Wish Generator"
        subtitle="Craft heartfelt, context-aware greetings powered by Google Gemini AI."
        icon={Sparkles}
      />

      <div className="grid xl:grid-cols-5 gap-6 min-w-0">
        {/* ── Left: Form Panel ─────────────────────────────────────────── */}
        <div className="min-w-0 xl:col-span-2 space-y-5">
          {/* Contact Selection */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3.5">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                1
              </span>
              <span className="text-sm font-semibold text-fg">Select Recipient</span>
            </div>
            <ContactSelector contacts={contacts} selected={selectedContact} onSelect={setSelectedContact} />
            <div className="mt-3">
              <ContactCard contact={selectedContact} />
            </div>
          </GlassCard>

          {/* Generation Options */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                2
              </span>
              <span className="text-sm font-semibold text-fg">Configure Tone & Occasion</span>
            </div>

            {/* Occasion */}
            <div>
              <label className="field-label">Occasion</label>
              <div className="grid grid-cols-3 gap-1.5">
                {occasions.map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOccasion(o)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      occasion === o
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25 border-transparent'
                        : 'bg-raised/60 hover:bg-raised text-slate-600 dark:text-slate-400 hover:text-fg border-line-soft'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="field-label">Tone</label>
              <div className="grid grid-cols-3 gap-1.5">
                {tones.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      tone === t
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-purple-500/25 border-transparent'
                        : 'bg-raised/60 hover:bg-raised text-slate-600 dark:text-slate-400 hover:text-fg border-line-soft'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Language & Relationship Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassSelect
                label="Language"
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </GlassSelect>

              <GlassSelect
                label="Relationship"
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
              >
                {relationships.map(r => <option key={r} value={r}>{r}</option>)}
              </GlassSelect>
            </div>

            {/* Age & Interests */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <GlassInput
                  label="Age"
                  type="number"
                  min="0"
                  max="120"
                  placeholder="e.g. 28"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <GlassInput
                  label="Interests"
                  placeholder="e.g. Photography, Travel"
                  value={interests}
                  onChange={e => setInterests(e.target.value)}
                />
              </div>
            </div>

            {/* Custom Context */}
            <GlassTextarea
              label="Custom Context (Optional)"
              rows={3}
              value={customContext}
              onChange={e => setCustomContext(e.target.value)}
              placeholder="e.g. Celebrating 5 years of friendship, turning 30, loves hiking..."
            />

            {/* Generate Button */}
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={generating}
              disabled={!selectedContact}
              onClick={() => handleGenerate(false)}
              leftIcon={<Sparkles size={17} />}
            >
              {generating ? 'Crafting wish with AI…' : 'Generate Wish'}
            </GlassButton>
          </GlassCard>
        </div>

        {/* ── Right: Preview Panel ──────────────────────────────────────── */}
        <div className="min-w-0 xl:col-span-3 flex flex-col gap-4">
          <GlassCard className="flex-1 flex flex-col min-h-[460px] overflow-hidden">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line-soft bg-raised/20">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-sm font-semibold text-fg">AI Generated Message</span>
                {occasion && (
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-raised px-2.5 py-0.5 rounded-full border border-line-soft">
                    {occasion} · {tone}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasGreeting && !editMode && (
                  <StatusBadge status="Delivered" label="READY" />
                )}
                {editMode && (
                  <StatusBadge status="Processing" label="EDITING" />
                )}
              </div>
            </div>

            {/* Greeting Content Area */}
            <div className="flex-1 min-w-0 min-h-0 w-full max-w-full overflow-y-auto p-6 flex flex-col justify-center">
              {generating ? (
                <div className="space-y-3 py-6 max-w-lg mx-auto w-full">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-400 mb-4 animate-pulse">
                    <Bot size={18} />
                    <span>Gemini AI is personalizing your message...</span>
                  </div>
                  <Skeleton className="h-5 w-5/6 mx-auto" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-4/5 mx-auto" />
                  <Skeleton className="h-5 w-3/4 mx-auto" />
                </div>
              ) : hasGreeting ? (
                editMode ? (
                  <textarea
                    value={editedText}
                    onChange={e => setEditedText(e.target.value)}
                    className="w-full max-w-full min-w-0 h-full min-h-[220px] bg-transparent text-fg text-base sm:text-lg leading-relaxed resize-none outline-none font-medium border border-indigo-500/30 rounded-xl p-4 bg-raised/20 focus:border-indigo-500"
                    autoFocus
                  />
                ) : (
                  <div className="relative group w-full max-w-full min-w-0 my-auto">
                    <blockquote className="w-full max-w-full min-w-0 text-fg text-base sm:text-lg leading-relaxed font-medium whitespace-pre-wrap break-words [overflow-wrap:anywhere] italic">
                      "{greeting}"
                    </blockquote>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-raised/80 border border-line-soft flex items-center justify-center mb-3.5 shadow-inner">
                    <Sparkles size={28} className="text-slate-500" />
                  </div>
                  <p className="text-fg text-sm font-semibold">Your AI greeting will appear here</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                    Select a contact on the left and configure the tone, then click "Generate Wish".
                  </p>
                </div>
              )}
            </div>

            {/* Word count & information footer */}
            {hasGreeting && (
              <div className="px-6 py-2 border-t border-line-soft/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-raised/10">
                <span>{wordCount} words · {charCount} characters</span>
                <span>Language: {language.toUpperCase()}</span>
              </div>
            )}

            {/* Action Bar */}
            {hasGreeting && (
              <div className="border-t border-line-soft p-5 bg-raised/30 space-y-3">
                {/* Primary: Send Email */}
                <GlassButton
                  variant="primary"
                  className="w-full"
                  size="lg"
                  disabled={!canSend}
                  loading={sendingEmail}
                  onClick={handleSendEmail}
                  leftIcon={emailSent ? <CheckCircle2 size={16} /> : <Send size={16} />}
                >
                  {emailSent
                    ? 'Delivered Successfully!'
                    : canSend
                    ? `Send Wish to ${selectedContact?.name}`
                    : 'Recipient has no email address'}
                </GlassButton>

                {/* Secondary actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    disabled={!selectedContact}
                    onClick={() => setShowScheduleModal(true)}
                    leftIcon={<Clock size={14} />}
                  >
                    Schedule
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowTemplateModal(true)}
                    leftIcon={<BookmarkPlus size={14} />}
                  >
                    Save Template
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    leftIcon={copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={handleDownload}
                    leftIcon={<Download size={14} />}
                  >
                    Download
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    size="sm"
                    loading={generating}
                    onClick={handleRegenerate}
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Regenerate
                  </GlassButton>

                  <GlassButton
                    variant={editMode ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={handleEditToggle}
                    leftIcon={editMode ? <Check size={14} /> : <Edit3 size={14} />}
                  >
                    {editMode ? 'Save Edits' : 'Edit Text'}
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Contact email hint */}
          {selectedContact && !selectedContact.email && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300">
              <Mail size={16} className="shrink-0 text-amber-400" />
              <span>
                {selectedContact.name} doesn't have an email listed. You can still schedule, copy, or save this wish as a template.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSubmit={handleScheduleSubmit}
        loading={schedulingLoading}
        contactName={selectedContact?.name}
      />

      <SaveTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSubmit={handleTemplateSave}
        occasion={occasion}
        tone={tone}
        loading={templateLoading}
      />
    </div>
  );
};

export default AIGreetingPage;
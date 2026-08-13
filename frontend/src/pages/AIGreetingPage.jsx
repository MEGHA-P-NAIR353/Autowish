import React, { useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, Heart, Calendar, Sparkles,
  Send, Clock, BookmarkPlus, Copy, RefreshCw, Edit3, Check,
  X, Loader2, Gift, Globe, MessageSquare, Star, Users, Hash, List
} from 'lucide-react';
import ContactSelector from '../components/ContactSelector';
import ContactCard from '../components/ContactCard';

// ─── Reusable Skeleton Loader ─────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />
);

// ─── Action Button ────────────────────────────────────────────────────────────
const ActionBtn = ({ icon, label, onClick, variant = 'secondary', loading = false, success = false, disabled = false }) => {
  const base = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 focus:ring-indigo-500',
    secondary: 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600/50 hover:border-slate-500 focus:ring-slate-500',
    danger: 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-600/30 focus:ring-rose-500',
    success: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${success ? variants.success : variants[variant]}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : success ? <Check size={15} /> : icon}
      {label}
    </button>
  );
};

// ─── Schedule Modal ───────────────────────────────────────────────────────────
const ScheduleModal = ({ onClose, onSubmit, loading }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [tz, setTz] = useState('Asia/Kolkata');
  const [reminder, setReminder] = useState(15);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <Clock size={18} className="text-indigo-400" />
            Schedule Greeting
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
            <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Timezone</label>
            <select value={tz} onChange={e => setTz(e.target.value)} className="input w-full">
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (ET)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Reminder</label>
            <select value={reminder} onChange={e => setReminder(parseInt(e.target.value))} className="input w-full">
              <option value={15}>15 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ date, time, timezone: tz, reminder_minutes: reminder })}
            disabled={!date || loading}
            className="flex-1 py-2.5 rounded-xl text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Save Template Modal ──────────────────────────────────────────────────────
const SaveTemplateModal = ({ onClose, onSubmit, occasion, tone, loading }) => {
  const [name, setName] = useState('');
  const [isFav, setIsFav] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <BookmarkPlus size={18} className="text-emerald-400" />
            Save as Template
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Template Name *</label>
            <input
              className="input w-full"
              placeholder={`${occasion} - ${tone}`}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setIsFav(f => !f)}
              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isFav ? 'bg-amber-500 border-amber-500' : 'border-slate-600 hover:border-amber-400'}`}
            >
              {isFav && <Star size={12} className="text-white" />}
            </button>
            <span className="text-sm text-slate-300">Mark as favourite</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ name: name || `${occasion} - ${tone}`, is_favorite: isFav })}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <BookmarkPlus size={15} />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AIGreetingPage = () => {
  const { contacts, refetchGreetingAnalytics, fetchNotifications } = useData();

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

  const interestsArray = interests.split(',').map(i => i.trim()).filter(i => i);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (e) => {
    e?.preventDefault();
    if (!selectedContact) { toast.error('Please select a contact first.'); return; }

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
      });
      setGreeting(resp.data.greeting);
      setEditedText(resp.data.greeting);
      setGreetingId(resp.data.id);
    } catch (err) {
      console.error("[AI_GREETING_ERROR]", err.response?.data || err);
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
      // Refresh dashboard analytics and notifications without page reload
      if (refetchGreetingAnalytics) refetchGreetingAnalytics();
      if (fetchNotifications) fetchNotifications();
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send email.';
      toast.error(msg);
    } finally {
      setSendingEmail(false);
    }
  }, [selectedContact, activeText, occasion, greetingId, refetchGreetingAnalytics]);

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

  // ── Regenerate ────────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    handleGenerate();
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
  const interestOptions = ['Music', 'Travel', 'Sports', 'Reading', 'Cooking', 'Gaming', 'Photography', 'Art', 'Dance', 'Technology', 'Movies', 'Fashion', 'Gardening', 'Cycling'];

  const hasGreeting = !!greeting;
  const canSend = hasGreeting && selectedContact?.email;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles size={18} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">AI Greeting Generator</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">Generate, personalize and send heartfelt AI-powered greetings</p>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        {/* ── Left: Form Panel ─────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Contact Selection */}
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">Step 1 — Select Contact</span>
            </div>
            <ContactSelector contacts={contacts} selected={selectedContact} onSelect={setSelectedContact} />
            <ContactCard contact={selectedContact} />
          </div>

          {/* Generation Options */}
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">Step 2 — Configure Greeting</span>
            </div>

            <div className="space-y-4">
              {/* Occasion */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Occasion</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {occasions.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOccasion(o)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        occasion === o
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700/50'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tone</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {tones.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        tone === t
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Globe size={12} className="inline mr-1" />Language
                </label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="input w-full text-sm">
                  {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Users size={12} className="inline mr-1" />Relationship
                </label>
                <select value={relationship} onChange={e => setRelationship(e.target.value)} className="input w-full text-sm">
                  {relationships.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Hash size={12} className="inline mr-1" />Age (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="e.g. 25"
                />
              </div>

              {/* Interests */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Interests (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={e => setInterests(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="e.g. Travel, Music, Photography"
                />
              </div>

              {/* Custom Context */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Custom Context <span className="text-slate-600 lowercase font-normal">(optional)</span>
                </label>
                <textarea
                  value={customContext}
                  onChange={e => setCustomContext(e.target.value)}
                  className="input w-full h-20 resize-none text-sm"
                  placeholder="e.g. Celebrating 5 years together, loves cricket, turning 30 this year..."
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !selectedContact}
              className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {generating ? (
                <><Loader2 size={16} className="animate-spin" /> Generating with Gemini AI…</>
              ) : (
                <><Sparkles size={16} /> Generate Greeting</>
              )}
            </button>
          </div>
        </div>

        {/* ── Right: Preview Panel ──────────────────────────────────────── */}
        <div className="xl:col-span-3 flex flex-col gap-5">
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-2xl shadow-xl flex-1 flex flex-col min-h-[380px]">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <span className="text-sm font-semibold text-slate-200">Step 3 — Preview & Actions</span>
              </div>
              {hasGreeting && !editMode && (
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  READY
                </span>
              )}
              {editMode && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 animate-pulse">
                  EDITING
                </span>
              )}
            </div>

            {/* Greeting Content Area */}
            <div className="flex-1 p-5">
              {generating ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ) : hasGreeting ? (
                editMode ? (
                  <textarea
                    value={editedText}
                    onChange={e => setEditedText(e.target.value)}
                    className="w-full h-full min-h-[200px] bg-transparent text-slate-100 text-base leading-relaxed resize-none outline-none font-medium"
                    autoFocus
                  />
                ) : (
                  <div className="relative group">
                    <p className="text-slate-100 text-base leading-relaxed font-medium whitespace-pre-wrap">
                      {greeting}
                    </p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-3">
                    <Sparkles size={28} className="text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Your AI greeting will appear here</p>
                  <p className="text-slate-600 text-xs mt-1">Select a contact and click Generate</p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            {hasGreeting && (
              <div className="border-t border-slate-700/60 px-5 py-4">
                {/* Primary: Send Email */}
                <ActionBtn
                  icon={<Send size={15} />}
                  label={canSend ? `Send to ${selectedContact?.name}` : 'No email — cannot send'}
                  onClick={handleSendEmail}
                  variant="primary"
                  loading={sendingEmail}
                  success={emailSent}
                  disabled={!canSend}
                />
                {/* Secondary actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <ActionBtn
                    icon={<Clock size={15} />}
                    label="Schedule"
                    onClick={() => setShowScheduleModal(true)}
                    disabled={!selectedContact}
                  />
                  <ActionBtn
                    icon={<BookmarkPlus size={15} />}
                    label="Save Template"
                    onClick={() => setShowTemplateModal(true)}
                  />
                  <ActionBtn
                    icon={<Copy size={15} />}
                    label="Copy"
                    onClick={handleCopy}
                    success={copied}
                  />
                  <ActionBtn
                    icon={<RefreshCw size={15} />}
                    label="Regenerate"
                    onClick={handleRegenerate}
                    loading={generating}
                  />
                  <ActionBtn
                    icon={editMode ? <Check size={15} /> : <Edit3 size={15} />}
                    label={editMode ? 'Save Edits' : 'Edit'}
                    onClick={handleEditToggle}
                    variant={editMode ? 'danger' : 'secondary'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact email hint */}
          {selectedContact && !selectedContact.email && (
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
              <Mail size={15} />
              <span>This contact has no email address. You can schedule, copy or save as a template, but cannot send by email.</span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSubmit={handleScheduleSubmit}
          loading={schedulingLoading}
        />
      )}
      {showTemplateModal && (
        <SaveTemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSubmit={handleTemplateSave}
          occasion={occasion}
          tone={tone}
          loading={templateLoading}
        />
      )}
    </div>
  );
};

export default AIGreetingPage;
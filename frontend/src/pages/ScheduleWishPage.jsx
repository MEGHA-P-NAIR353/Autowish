import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, Send, Search, User, Mail, Phone, Heart, Plus, Filter,
  Eye, Edit2, Copy, Pause, Play, XCircle, Trash2, ChevronDown, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, Timer, Ban, RotateCcw, Sparkles,
  Download, MessageSquare, Zap, Globe, Bell, MoreHorizontal, RefreshCw,
  X, Check, ArrowLeft, CalendarDays, List, BarChart2, TrendingUp, Star,
  Info, Activity, Inbox
} from 'lucide-react';
import { schedulesAPI, aiAPI, contactsAPI } from '../services/api';
import { cardsAPI } from '../services/greetingCardsAPI';
import { useData } from '../context/DataContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Scheduled: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400', label: 'Scheduled' },
  Sent:       { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400', label: 'Sent' },
  Pending:    { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400', label: 'Pending' },
  Processing: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400', label: 'Processing' },
  Failed:     { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400', label: 'Failed' },
  Cancelled:  { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-400', label: 'Cancelled' },
};

const OCCASION_ICONS = {
  Birthday: '🎂', Anniversary: '💍', Festival: '🎉', Holiday: '🌟', Custom: '✨',
};

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore',
  'Australia/Sydney', 'UTC',
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

function Avatar({ name, size = 'md' }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const sz = size === 'lg' ? 'w-14 h-14 text-xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} ${color} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#1E293B] rounded-2xl border border-slate-700/40 p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-700 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/3" />
              <div className="h-3 bg-slate-700 rounded w-1/4" />
            </div>
            <div className="h-6 bg-slate-700 rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-5">
        <Icon className="text-slate-500" size={32} />
      </div>
      <h3 className="text-slate-200 font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-6">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <Plus size={16} /> {action.label}
        </button>
      )}
    </motion.div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteDialog({ wish, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
          className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="text-rose-400" size={22} />
            </div>
            <div>
              <h3 className="text-slate-100 font-bold text-lg">Delete Scheduled Wish?</h3>
              <p className="text-slate-400 text-sm">This action cannot be undone.</p>
            </div>
          </div>
          {wish && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 mb-5 flex items-center gap-3">
              <Avatar name={wish.contact?.name} size="sm" />
              <div>
                <div className="text-sm font-medium text-slate-200">{wish.contact?.name}</div>
                <div className="text-xs text-slate-400">{wish.occasion} · {wish.date}</div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">
              Cancel
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition text-sm font-medium flex items-center justify-center gap-2">
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── View Details Drawer ──────────────────────────────────────────────────────

function DetailDrawer({ wish, onClose, onEdit, onRegenerate }) {
  const [logs, setLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!wish) return;
    setLoadingLogs(true);
    schedulesAPI.logs(wish.id).then(res => setLogs(res.data)).catch(() => {}).finally(() => setLoadingLogs(false));
  }, [wish]);

  const handleCopy = () => {
    if (wish?.message) {
      navigator.clipboard.writeText(wish.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (!wish?.message) return;
    const blob = new Blob([wish.message], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `greeting-${wish.contact?.name}-${wish.occasion}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!wish) return null;
  const contact = wish.contact || {};

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}>
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-0 h-full w-full max-w-xl bg-[#0F172A] border-l border-slate-700/60 overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={contact.name} size="sm" />
              <div>
                <div className="text-slate-100 font-semibold text-sm">{contact.name}</div>
                <StatusBadge status={wish.status} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-medium flex items-center gap-1.5 transition">
                <Edit2 size={13} /> Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 transition">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Contact Information */}
            <Section title="Contact Information" icon={User}>
              <div className="flex items-center gap-4 mb-4">
                <Avatar name={contact.name} size="lg" />
                <div>
                  <div className="text-slate-100 font-semibold text-lg">{contact.name}</div>
                  <div className="text-slate-400 text-sm">{contact.relationship || 'Contact'}</div>
                  {contact.age && <div className="text-slate-500 text-xs mt-0.5">Age: {contact.age}</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={Mail} label="Email" value={contact.email} />
                <InfoItem icon={Phone} label="Phone" value={contact.phone || '–'} />
                <InfoItem icon={CalendarDays} label="Birthday" value={contact.birthday || '–'} />
                <InfoItem icon={Heart} label="Anniversary" value={contact.anniversary || '–'} />
              </div>
            </Section>

            {/* Event Information */}
            <Section title="Event Information" icon={CalendarDays}>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={Sparkles} label="Occasion" value={`${OCCASION_ICONS[wish.occasion] || ''} ${wish.occasion}`} />
                <InfoItem icon={MessageSquare} label="Template" value={wish.template || '–'} />
                <InfoItem icon={Globe} label="Language" value={wish.language || 'en'} />
                <InfoItem icon={Activity} label="Tone" value={wish.tone || '–'} />
                <InfoItem icon={Globe} label="Timezone" value={wish.timezone} />
                <InfoItem icon={Bell} label="Reminder" value={wish.reminder_minutes ? `${wish.reminder_minutes} min before` : '–'} />
                <InfoItem icon={Zap} label="Type" value={wish.notification_type || 'Email'} />
                <InfoItem icon={Sparkles} label="AI Generated" value={wish.is_ai_generated ? 'Yes' : 'No'} />
              </div>
            </Section>

            {/* Schedule Information */}
            <Section title="Schedule Information" icon={Clock}>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={CalendarDays} label="Date" value={wish.date} />
                <InfoItem icon={Clock} label="Time" value={wish.time} />
                <InfoItem icon={Timer} label="Created" value={formatDateTime(wish.created_at)} />
                <InfoItem icon={RefreshCw} label="Updated" value={formatDateTime(wish.updated_at)} />
                {wish.sent_at && <InfoItem icon={CheckCircle2} label="Sent At" value={formatDateTime(wish.sent_at)} />}
                {wish.cancelled_at && <InfoItem icon={Ban} label="Cancelled At" value={formatDateTime(wish.cancelled_at)} />}
              </div>
              {wish.task_id && (
                <div className="mt-3 bg-slate-800/50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 font-medium uppercase mb-1">Celery Task ID</div>
                  <div className="text-xs text-slate-400 font-mono break-all">{wish.task_id}</div>
                </div>
              )}
              {wish.retry_count > 0 && (
                <div className="mt-2 flex items-center gap-2 text-amber-400 text-xs">
                  <RotateCcw size={13} /> Retry Count: {wish.retry_count}
                </div>
              )}
              {wish.last_error && (
                <div className="mt-2 bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
                  <div className="text-[11px] text-rose-400 font-medium uppercase mb-1">Last Error</div>
                  <div className="text-xs text-rose-300">{wish.last_error}</div>
                </div>
              )}
            </Section>

            {/* AI Greeting */}
            {wish.message && (
              <Section title="AI Greeting" icon={Sparkles}>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {wish.message}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition">
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={onRegenerate} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-violet-400 text-xs font-medium transition">
                    <RefreshCw size={13} /> Regenerate
                  </button>
                  <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition">
                    <Download size={13} /> Download
                  </button>
                </div>
              </Section>
            )}

            {/* Delivery Information */}
            <Section title="Delivery Information" icon={Activity}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <InfoItem icon={Mail} label="Email Status" value={wish.delivery_status || '–'} />
                <InfoItem icon={Clock} label="Sent Time" value={wish.sent_at ? formatDateTime(wish.sent_at) : '–'} />
              </div>
              {loadingLogs && (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading delivery logs...
                </div>
              )}
              {logs && logs.email_logs?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-400 uppercase">Delivery Timeline</div>
                  {logs.email_logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-slate-300">{log.subject}</div>
                        <div className="text-slate-500">{log.date} · {log.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center">
          <Icon size={14} className="text-slate-400" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide mb-0.5">{label}</div>
        <div className="text-xs text-slate-300 truncate">{value || '–'}</div>
      </div>
    </div>
  );
}

function formatDateTime(dt) {
  if (!dt) return '–';
  try {
    return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dt; }
}

// ─── Edit/Create Modal ────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  contact: '', date: '', time: '09:00', occasion: 'Birthday', template: 'Birthday - Friendly',
  timezone: 'Asia/Kolkata', reminder_minutes: 15, email_subject: '', message: '',
  language: 'en', tone: 'Friendly', notification_type: 'Email', is_ai_generated: true,
  status: 'Scheduled', greeting_card: '',
};

function ScheduleEditorModal({ wish, contacts, onClose, onSave }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactDropdown, setContactDropdown] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [unsaved, setUnsaved] = useState(false);
  const isDuplicate = wish?._isDuplicate;
  const isEdit = wish && !isDuplicate;

  const [userCards, setUserCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  useEffect(() => {
    // Load greeting cards when modal opens
    setCardsLoading(true);
    cardsAPI.getAll({ status: 'published' })
      .then(res => {
        setUserCards(res.data.results || res.data);
      })
      .catch(() => {})
      .finally(() => setCardsLoading(false));
  }, []);

  useEffect(() => {
    if (wish) {
      setForm({
        contact: wish.contact?.id || '',
        date: wish.date || '',
        time: wish.time || '09:00',
        occasion: wish.occasion || 'Birthday',
        template: wish.template || 'Birthday - Friendly',
        timezone: wish.timezone || 'Asia/Kolkata',
        reminder_minutes: wish.reminder_minutes || 15,
        email_subject: wish.email_subject || '',
        message: wish.message || '',
        language: wish.language || 'en',
        tone: wish.tone || 'Friendly',
        notification_type: wish.notification_type || 'Email',
        is_ai_generated: wish.is_ai_generated ?? true,
        status: isDuplicate ? 'Scheduled' : (wish.status || 'Scheduled'),
        greeting_card: wish.greeting_card || '',
      });
      if (wish.contact) {
        setSelectedContact(wish.contact);
        setContactSearch(wish.contact.name);
      }
    }
  }, [wish]);

  useEffect(() => setCharCount(form.message.length), [form.message]);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  const handleSelectContact = (c) => {
    setSelectedContact(c);
    setContactSearch(c.name);
    setContactDropdown(false);
    setForm(f => ({ ...f, contact: c.id }));
    setUnsaved(true);
  };

  const handleFormChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setUnsaved(true);
  };

  const handleRegenerate = async () => {
    if (!selectedContact) { toast.error('Select a contact first'); return; }
    setGenerating(true);
    try {
      const res = await aiAPI.generateGreeting({
        contact_id: selectedContact.id,
        occasion: form.occasion,
        tone: form.tone,
        language: form.language,
      });
      handleFormChange('message', res.data.greeting);
      toast.success('AI greeting regenerated!');
    } catch {
      toast.error('Failed to regenerate AI greeting.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.contact) { toast.error('Please select a contact'); return; }
    if (!form.date) { toast.error('Please select a date'); return; }
    setSaving(true);
    try {
      const payload = { ...form, contact: form.contact };
      if (isEdit) {
        await schedulesAPI.patch(wish.id, payload);
        toast.success('Schedule updated!');
      } else {
        await schedulesAPI.create(payload);
        toast.success('Wish scheduled successfully!');
      }
      setUnsaved(false);
      onSave();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.date || err.response?.data?.detail || 'Failed to save schedule.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (unsaved) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }} onClick={e => e.stopPropagation()}
          className="bg-[#0F172A] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                {isEdit ? <Edit2 className="text-blue-400" size={17} /> : <Plus className="text-blue-400" size={17} />}
              </div>
              <div>
                <h3 className="text-slate-100 font-bold">{isEdit ? 'Edit Schedule' : isDuplicate ? 'Duplicate Schedule' : 'New Schedule'}</h3>
                <p className="text-slate-500 text-xs">{isEdit ? `Editing wish for ${selectedContact?.name || '...'}` : 'Schedule a new wish'}</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-9 h-9 rounded-xl hover:bg-slate-700 flex items-center justify-center text-slate-400 transition">
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Contact Selector */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contact *</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setContactDropdown(true); if (selectedContact && e.target.value !== selectedContact.name) { setSelectedContact(null); handleFormChange('contact', ''); } }}
                  onFocus={() => setContactDropdown(true)}
                  placeholder="Search contact by name or email..."
                  className="input pl-9 w-full" />
              </div>
              <AnimatePresence>
                {contactDropdown && filteredContacts.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl">
                    {filteredContacts.slice(0, 8).map(c => (
                      <button key={c.id} type="button" onClick={() => handleSelectContact(c)}
                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-800 transition">
                        <Avatar name={c.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-100 truncate">{c.name}</div>
                          <div className="text-xs text-slate-400 truncate">{c.email}</div>
                        </div>
                        {c.relationship && <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">{c.relationship}</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {selectedContact && (
                <div className="mt-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center gap-3">
                  <Avatar name={selectedContact.name} size="sm" />
                  <div className="flex-1 grid grid-cols-3 gap-x-3 text-xs">
                    <span className="text-slate-400"><span className="text-slate-500">Name: </span>{selectedContact.name}</span>
                    <span className="text-slate-400 truncate"><span className="text-slate-500">Email: </span>{selectedContact.email}</span>
                    <span className="text-slate-400"><span className="text-slate-500">Rel: </span>{selectedContact.relationship || '–'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Occasion</label>
                <select value={form.occasion} onChange={e => handleFormChange('occasion', e.target.value)} className="input w-full">
                  {['Birthday','Anniversary','Festival','Holiday','Custom'].map(o => (
                    <option key={o} value={o}>{OCCASION_ICONS[o]} {o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Template</label>
                <select value={form.template} onChange={e => handleFormChange('template', e.target.value)} className="input w-full">
                  {['Birthday - Friendly','Birthday - Fun','Anniversary - Romantic','Festival - Joyful','Generic - Warm'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Date *</label>
                <input type="date" value={form.date} onChange={e => handleFormChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]} className="input w-full" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Time</label>
                <input type="time" value={form.time} onChange={e => handleFormChange('time', e.target.value)} className="input w-full" />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tone</label>
                <select value={form.tone} onChange={e => handleFormChange('tone', e.target.value)} className="input w-full">
                  {['Friendly','Warm','Formal','Fun','Romantic','Inspirational'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Language</label>
                <select value={form.language} onChange={e => handleFormChange('language', e.target.value)} className="input w-full">
                  {[['en','English'],['hi','Hindi'],['es','Spanish'],['fr','French'],['de','German'],['ta','Tamil'],['te','Telugu']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Timezone</label>
                <select value={form.timezone} onChange={e => handleFormChange('timezone', e.target.value)} className="input w-full">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Reminder</label>
                <select value={form.reminder_minutes} onChange={e => handleFormChange('reminder_minutes', parseInt(e.target.value))} className="input w-full">
                  <option value={15}>15 mins before</option>
                  <option value={30}>30 mins before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>
            </div>

            {/* Notification Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notification Type</label>
              <div className="flex gap-2">
                {[['Email','📧'],['SMS','📱'],['Push','🔔']].map(([type, icon]) => (
                  <button key={type} type="button" onClick={() => handleFormChange('notification_type', type)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${form.notification_type === type ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                    {icon} {type}
                    {type === 'Push' && <span className="text-[9px] bg-slate-700 text-slate-500 px-1 rounded">Soon</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Email Subject</label>
              <input type="text" value={form.email_subject} onChange={e => handleFormChange('email_subject', e.target.value)}
                placeholder={`Happy ${form.occasion} — auto-generated if blank`} className="input w-full" />
            </div>

            {/* Greeting Card Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Attached Greeting Card</label>
              <select
                value={form.greeting_card}
                onChange={e => handleFormChange('greeting_card', e.target.value)}
                className="input w-full"
              >
                <option value="">No Greeting Card Attached</option>
                {userCards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.occasion})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Attach one of your published greeting cards. It will be sent as an email attachment & embedded inline.
              </p>
            </div>

            {/* Message Mode Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Greeting Message</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleFormChange('is_ai_generated', true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.is_ai_generated ? 'bg-violet-600/20 border-violet-500 text-violet-400' : 'border-slate-600 text-slate-500 hover:border-slate-500'}`}>
                    <Sparkles size={12} /> AI Mode
                  </button>
                  <button type="button" onClick={() => handleFormChange('is_ai_generated', false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${!form.is_ai_generated ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'border-slate-600 text-slate-500 hover:border-slate-500'}`}>
                    <Edit2 size={12} /> Manual
                  </button>
                </div>
              </div>
              <div className="relative">
                <textarea value={form.message} onChange={e => handleFormChange('message', e.target.value)}
                  className="input w-full h-32 resize-none"
                  placeholder={form.is_ai_generated ? 'AI greeting — click Regenerate to generate one…' : 'Type your custom message here…'} />
                <div className="absolute bottom-3 right-3 text-[10px] text-slate-500">{charCount} chars</div>
              </div>
              {form.is_ai_generated && (
                <button type="button" onClick={handleRegenerate} disabled={generating}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-violet-400 text-sm font-medium transition disabled:opacity-50">
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {generating ? 'Generating…' : 'Regenerate AI Greeting'}
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700/50 flex-shrink-0 flex items-center justify-between">
            {unsaved && (
              <div className="flex items-center gap-1.5 text-amber-400 text-xs">
                <AlertCircle size={13} /> Unsaved changes
              </div>
            )}
            <div className="flex gap-3 ml-auto">
              <button onClick={handleClose} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition text-sm font-medium flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Schedule Wish'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Schedule Card ─────────────────────────────────────────────────────────────

function ScheduleCard({ wish, onView, onEdit, onDuplicate, onCancel, onResume, onDelete, onRefresh }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState('');
  const menuRef = useRef(null);
  const contact = wish.contact || {};

  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doAction = async (label, fn) => {
    setLoading(label);
    setMenuOpen(false);
    try { await fn(); } catch (err) {
      toast.error(err.response?.data?.error || `Failed: ${label}`);
    } finally { setLoading(''); }
  };

  const canEdit = !['Sent','Processing'].includes(wish.status);
  const canCancel = ['Scheduled','Pending','Processing'].includes(wish.status);
  const canResume = ['Cancelled','Failed'].includes(wish.status);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="group bg-[#1E293B] rounded-2xl border border-slate-700/40 hover:border-slate-600/60 hover:shadow-lg hover:shadow-slate-900/40 p-5 transition-all duration-200">
      <div className="flex items-start gap-4">
        <Avatar name={contact.name} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-100">{contact.name || 'Unknown'}</span>
                <StatusBadge status={wish.status} />
                {wish.is_ai_generated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <Sparkles size={9} /> AI
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400 mt-0.5 truncate">
                {contact.email} {contact.phone && <span className="text-slate-500">· {contact.phone}</span>}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <ActionBtn icon={Eye} label="View" onClick={() => onView(wish)} />
              {canEdit && <ActionBtn icon={Edit2} label="Edit" onClick={() => onEdit(wish)} />}
              <ActionBtn icon={Copy} label="Duplicate" onClick={() => onDuplicate(wish)} />
              
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="w-7 h-7 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 transition">
                  <MoreHorizontal size={14} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 top-9 z-30 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl w-40 py-1 overflow-hidden">
                      {canCancel && (
                        <MenuBtn icon={Ban} label="Cancel" color="text-amber-400" loading={loading === 'cancel'}
                          onClick={() => doAction('cancel', async () => { await schedulesAPI.cancel(wish.id); onRefresh(); toast.success('Wish cancelled.'); })} />
                      )}
                      {canResume && (
                        <MenuBtn icon={Play} label="Resume" color="text-emerald-400" loading={loading === 'resume'}
                          onClick={() => doAction('resume', async () => { await schedulesAPI.resume(wish.id); onRefresh(); toast.success('Wish resumed!'); })} />
                      )}
                      <div className="h-px bg-slate-700/50 my-1" />
                      <MenuBtn icon={Trash2} label="Delete" color="text-rose-400"
                        onClick={() => { setMenuOpen(false); onDelete(wish); }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              {OCCASION_ICONS[wish.occasion] || '✨'} {wish.occasion}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={11} /> {wish.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} /> {wish.time}
            </span>
            <span className="flex items-center gap-1.5">
              <Globe size={11} /> {wish.timezone}
            </span>
            {wish.template && (
              <span className="flex items-center gap-1.5">
                <MessageSquare size={11} /> {wish.template}
              </span>
            )}
          </div>

          {wish.message && (
            <div className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-800/50 rounded-lg px-3 py-2">
              "{wish.message.slice(0, 120)}{wish.message.length > 120 ? '…' : ''}"
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }) {
  return (
    <button title={label} onClick={onClick}
      className="w-7 h-7 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-200 transition">
      <Icon size={13} />
    </button>
  );
}

function MenuBtn({ icon: Icon, label, color, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-slate-800 transition ${color}`}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  );
}

// ─── Dashboard Stats Bar ──────────────────────────────────────────────────────

function DashboardBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label: 'Today', value: stats.today, icon: CalendarDays, color: 'text-blue-400' },
    { label: 'Upcoming', value: stats.upcoming, icon: TrendingUp, color: 'text-violet-400' },
    { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'text-sky-400' },
    { label: 'Sent', value: stats.sent, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Failed', value: stats.failed, icon: AlertCircle, color: 'text-rose-400' },
    { label: 'Cancelled', value: stats.cancelled, icon: Ban, color: 'text-slate-400' },
  ];
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-[#1E293B] border border-slate-700/40 rounded-xl p-3 text-center">
          <Icon size={18} className={`${color} mx-auto mb-1`} />
          <div className={`text-xl font-bold ${color}`}>{value ?? 0}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Mini Calendar View ───────────────────────────────────────────────────────

function CalendarView({ schedules }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const scheduleMap = {};
  schedules.forEach(w => {
    if (w.date) {
      if (!scheduleMap[w.date]) scheduleMap[w.date] = [];
      scheduleMap[w.date].push(w);
    }
  });

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const pad = n => String(n).padStart(2, '0');
  const today = new Date();

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="bg-[#1E293B] border border-slate-700/40 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 transition">
          <ChevronDown className="rotate-90" size={16} />
        </button>
        <h3 className="font-semibold text-slate-200">{monthNames[month]} {year}</h3>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 transition">
          <ChevronDown className="-rotate-90" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[11px] text-slate-500 font-semibold py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const daySchedules = scheduleMap[dateStr] || [];
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isSelected = selected === dateStr;
          return (
            <button key={day} onClick={() => setSelected(isSelected ? null : dateStr)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition ${isToday ? 'bg-blue-600 text-white' : isSelected ? 'bg-slate-700 text-slate-100' : 'hover:bg-slate-700/60 text-slate-400'}`}>
              {day}
              {daySchedules.length > 0 && (
                <div className="flex gap-0.5 absolute bottom-0.5">
                  {daySchedules.slice(0, 3).map((w, j) => (
                    <div key={j} className={`w-1 h-1 rounded-full ${STATUS_CONFIG[w.status]?.dot || 'bg-slate-400'}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && scheduleMap[selected] && (
        <div className="mt-4 border-t border-slate-700/50 pt-4">
          <div className="text-xs font-semibold text-slate-400 mb-2">{selected} — {scheduleMap[selected].length} wish(es)</div>
          <div className="space-y-2">
            {scheduleMap[selected].map(w => (
              <div key={w.id} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[w.status]?.dot}`} />
                <span className="text-slate-300">{w.contact?.name}</span>
                <span className="text-slate-500">— {w.occasion}</span>
                <StatusBadge status={w.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const ScheduleWishPage = () => {
  const { contacts } = useData();

  // State
  const [tab, setTab] = useState('list'); // list | calendar
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', occasion: '', sort: 'newest', is_ai_generated: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Modals
  const [viewWish, setViewWish] = useState(null);
  const [editWish, setEditWish] = useState(null);
  const [deleteWish, setDeleteWish] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: debouncedSearch, ...filters };
      Object.keys(params).forEach(k => (!params[k] && params[k] !== 0) && delete params[k]);
      const [schedulesRes, statsRes] = await Promise.all([
        schedulesAPI.getAll(params),
        schedulesAPI.getDashboard(),
      ]);
      setSchedules(schedulesRes.data.results || schedulesRes.data || []);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async () => {
    if (!deleteWish) return;
    try {
      await schedulesAPI.delete(deleteWish.id);
      setSchedules(s => s.filter(w => w.id !== deleteWish.id));
      toast.success('Schedule deleted.');
    } catch {
      toast.error('Failed to delete schedule.');
    } finally {
      setDeleteWish(null);
    }
  };

  const handleDuplicate = async (wish) => {
    try {
      const res = await schedulesAPI.duplicate(wish.id);
      setEditWish({ ...res.data, _isDuplicate: true });
      toast.success('Schedule duplicated — edit and save to confirm.');
    } catch {
      toast.error('Failed to duplicate.');
    }
  };

  const handleRegenerate = async () => {
    if (!viewWish?.contact) return;
    try {
      const res = await aiAPI.generateGreeting({
        contact_id: viewWish.contact.id,
        occasion: viewWish.occasion,
        tone: viewWish.tone,
        language: viewWish.language,
      });
      await schedulesAPI.patch(viewWish.id, { message: res.data.greeting });
      setViewWish(w => ({ ...w, message: res.data.greeting }));
      fetchSchedules();
      toast.success('AI greeting regenerated!');
    } catch {
      toast.error('Regeneration failed.');
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'newest').length;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Schedule Wishes</h1>
          <p className="text-slate-400 text-sm mt-1">Enterprise-grade automated wish management</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 self-start sm:self-auto">
          <Plus size={17} /> New Schedule
        </button>
      </div>

      {/* Dashboard Stats */}
      <DashboardBar stats={stats} />

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-[#1E293B] border border-slate-700/40 rounded-xl p-1 w-fit">
        {[['list', List, 'List'], ['calendar', CalendarDays, 'Calendar']].map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        <CalendarView schedules={schedules} />
      ) : (
        <>
          {/* Search & Filters Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, occasion, message…"
                className="input pl-9 w-full" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${filtersOpen || activeFiltersCount > 0 ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-600 text-slate-400 hover:border-slate-500 bg-[#1E293B]'}`}>
                <Filter size={15} />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">{activeFiltersCount}</span>
                )}
                <ChevronDown size={14} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {filtersOpen && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-12 z-30 bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-4 w-80 space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-200">Filters</span>
                      <button onClick={() => { setFilters({ status: '', occasion: '', sort: 'newest', is_ai_generated: '' }); setFiltersOpen(false); }}
                        className="text-xs text-slate-500 hover:text-slate-300 transition">Clear all</button>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Status</label>
                      <div className="flex flex-wrap gap-2">
                        {['', ...Object.keys(STATUS_CONFIG)].map(s => (
                          <button key={s} onClick={() => setFilters(f => ({ ...f, status: s }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${filters.status === s ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                            {s || 'All'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Occasion</label>
                      <select value={filters.occasion} onChange={e => setFilters(f => ({ ...f, occasion: e.target.value }))} className="input w-full text-sm">
                        <option value="">All Occasions</option>
                        {['Birthday','Anniversary','Festival','Holiday','Custom'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Sort</label>
                      <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} className="input w-full text-sm">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Message Type</label>
                      <div className="flex gap-2">
                        {[['', 'All'], ['true', 'AI Generated'], ['false', 'Manual']].map(([v, l]) => (
                          <button key={v} onClick={() => setFilters(f => ({ ...f, is_ai_generated: v }))}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition ${filters.is_ai_generated === v ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-700 text-slate-500'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setFiltersOpen(false)}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">Apply Filters</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={fetchSchedules} className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition bg-[#1E293B]">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Results count */}
          {!loading && (
            <div className="text-sm text-slate-500">
              Showing <span className="text-slate-300 font-medium">{schedules.length}</span> schedule{schedules.length !== 1 ? 's' : ''}
              {(search || activeFiltersCount > 0) && ' (filtered)'}
            </div>
          )}

          {/* Schedule List */}
          {loading ? (
            <LoadingSkeleton />
          ) : schedules.length === 0 ? (
            <EmptyState icon={Inbox} title="No schedules found" description="Create your first scheduled wish to get started, or adjust your search and filters."
              action={{ label: 'New Schedule', onClick: () => setShowCreateModal(true) }} />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {schedules.map(wish => (
                  <ScheduleCard key={wish.id} wish={wish}
                    onView={setViewWish}
                    onEdit={setEditWish}
                    onDuplicate={handleDuplicate}
                    onCancel={() => {}}
                    onResume={() => {}}
                    onDelete={setDeleteWish}
                    onRefresh={fetchSchedules} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </>
      )}

      {/* Modals & Drawers */}
      <AnimatePresence>
        {viewWish && (
          <DetailDrawer wish={viewWish} onClose={() => setViewWish(null)}
            onEdit={() => { setEditWish(viewWish); setViewWish(null); }}
            onRegenerate={handleRegenerate} />
        )}
        {(editWish || showCreateModal) && (
          <ScheduleEditorModal
            wish={editWish}
            contacts={contacts}
            onClose={() => { setEditWish(null); setShowCreateModal(false); }}
            onSave={fetchSchedules} />
        )}
        {deleteWish && (
          <DeleteDialog wish={deleteWish} onClose={() => setDeleteWish(null)} onConfirm={handleDelete} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleWishPage;

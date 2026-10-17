import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, Plus, Edit2, Trash2, Search, CheckCircle2,
  Eye, EyeOff, Globe, Sparkles, Filter, X, RefreshCw,
  AlertTriangle, Copy, Layers, Save, Tag, Heart
} from 'lucide-react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  GlassCardHover,
  GlassModal,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  GlassButton,
  Field,
  PageHeader,
  SkeletonCards,
} from '../components/ui';
import EmptyState from '../components/common/EmptyState';

const OCCASIONS = [
  'All',
  'Birthday',
  'Anniversary',
  'Festival',
  'Holiday',
  'Heartfelt',
  'Wedding',
  'Custom',
];

const FORM_OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Festival',
  'Holiday',
  'Heartfelt',
  'Wedding',
  'Custom',
];

const TONES = [
  'All',
  'Friendly',
  'Romantic',
  'Professional',
  'Funny',
  'Heartfelt',
  'Formal',
  'Inspiring',
  'Warm',
];

const FORM_TONES = [
  'Friendly',
  'Romantic',
  'Professional',
  'Funny',
  'Heartfelt',
  'Formal',
  'Inspiring',
  'Warm',
];

const LANGUAGES = [
  { code: 'All', label: 'All Languages' },
  { code: 'en', label: 'English (en)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'de', label: 'German (de)' },
  { code: 'hi', label: 'Hindi (hi)' },
  { code: 'ta', label: 'Tamil (ta)' },
  { code: 'te', label: 'Telugu (te)' },
  { code: 'kn', label: 'Kannada (kn)' },
  { code: 'ml', label: 'Malayalam (ml)' },
  { code: 'ar', label: 'Arabic (ar)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'zh', label: 'Chinese (zh)' },
];

const FORM_LANGUAGES = LANGUAGES.filter((l) => l.code !== 'All');

const STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const PLACEHOLDER_CHIPS = [
  { tag: '{{name}}', label: 'Recipient Name' },
  { tag: '{{relationship}}', label: 'Relationship' },
  { tag: '{{occasion}}', label: 'Occasion' },
  { tag: '{{sender}}', label: 'Sender Name' },
  { tag: '{{age}}', label: 'Age / Milestone' },
];

const AdminTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, archived: 0 });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  const [selectedTone, setSelectedTone] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Add / Edit Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formOccasion, setFormOccasion] = useState('Birthday');
  const [formTone, setFormTone] = useState('Friendly');
  const [formLanguage, setFormLanguage] = useState('en');
  const [formStatus, setFormStatus] = useState('published');
  const [formMessage, setFormMessage] = useState('');

  // Interactive live preview values inside form modal
  const [formPreviewSample, setFormPreviewSample] = useState({
    name: 'Alex',
    relationship: 'Best Friend',
    sender: 'Jordan',
    age: '25',
  });
  const [showPreviewSection, setShowPreviewSection] = useState(true);

  // Ref to textarea for cursor-position placeholder insertion
  const textareaRef = useRef(null);

  // Delete Confirmation Modal state
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Standalone Preview Modal state
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewSample, setPreviewSample] = useState({
    name: 'Alex',
    relationship: 'Friend',
    sender: 'Jordan',
    age: '30',
  });

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getTemplateStats();
      setStats(res.data);
    } catch {
      // silently fallback
    }
  };

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedOccasion !== 'All') params.occasion = selectedOccasion;
      if (selectedTone !== 'All') params.tone = selectedTone;
      if (selectedLanguage !== 'All') params.language = selectedLanguage;
      if (selectedStatus !== 'All') params.status = selectedStatus;

      const res = await adminAPI.getTemplates(params);
      const data = res.data.results || res.data || [];
      setTemplates(data);
    } catch (err) {
      toast.error('Failed to load wish templates.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedOccasion, selectedTone, selectedLanguage, selectedStatus]);

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, [fetchTemplates]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormOccasion('Birthday');
    setFormTone('Friendly');
    setFormLanguage('en');
    setFormStatus('published');
    setFormMessage('');
    setFormPreviewSample({
      name: 'Alex',
      relationship: 'Best Friend',
      sender: 'Jordan',
      age: '25',
    });
    setShowPreviewSection(true);
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (t) => {
    setEditingTemplate(t);
    setFormName(t.name || '');
    setFormOccasion(t.occasion || 'Birthday');
    setFormTone(t.tone || 'Friendly');
    setFormLanguage(t.language || 'en');
    setFormStatus(t.status || (t.is_published ? 'published' : 'draft'));
    setFormMessage(t.message || t.content || '');
    setFormPreviewSample({
      name: 'Alex',
      relationship: 'Best Friend',
      sender: 'Jordan',
      age: '25',
    });
    setShowPreviewSection(true);
    setShowFormModal(true);
  };

  // Helper to insert placeholder into message textarea at cursor
  const insertPlaceholder = (ph) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormMessage((prev) => (prev ? `${prev} ${ph} ` : `${ph} `));
      return;
    }
    const start = textarea.selectionStart ?? formMessage.length;
    const end = textarea.selectionEnd ?? formMessage.length;
    const before = formMessage.substring(0, start);
    const after = formMessage.substring(end);
    const nextVal = `${before}${ph}${after}`;
    setFormMessage(nextVal);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + ph.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Render message with live placeholder substitution
  const renderPersonalizedMessage = (
    text,
    nameVal = 'Alex',
    relVal = 'Friend',
    occVal = 'Birthday',
    senderVal = 'Jordan',
    ageVal = '30'
  ) => {
    if (!text) return '';
    const safeName = (nameVal ?? '').toString().trim() || 'Alex';
    const safeRel = (relVal ?? '').toString().trim() || 'Friend';
    const safeOcc = (occVal ?? '').toString().trim() || 'Special Occasion';
    const safeSender = (senderVal ?? '').toString().trim() || 'Jordan';
    const safeAge = (ageVal ?? '').toString().trim() || '30';

    return String(text)
      .replace(/\{\{\s*name\s*\}\}|\{name\}/gi, safeName)
      .replace(/\{\{\s*relationship\s*\}\}|\{relationship\}/gi, safeRel)
      .replace(/\{\{\s*occasion\s*\}\}|\{occasion\}/gi, safeOcc)
      .replace(/\{\{\s*sender\s*\}\}|\{sender\}/gi, safeSender)
      .replace(/\{\{\s*age\s*\}\}|\{age\}/gi, safeAge);
  };

  // Save Template Action (Draft or Published)
  const handleSaveTemplate = async (targetStatus) => {
    const finalStatus = targetStatus || formStatus;
    const trimmedName = formName.trim();
    const trimmedMessage = formMessage.trim();

    if (!trimmedName) {
      toast.error('Template Name is required.');
      return;
    }
    if (trimmedName.length < 2) {
      toast.error('Template Name must be at least 2 characters.');
      return;
    }
    if (!trimmedMessage) {
      toast.error('Wish Message is required.');
      return;
    }
    if (trimmedMessage.length < 5) {
      toast.error('Wish Message must be at least 5 characters.');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        name: trimmedName,
        occasion: formOccasion,
        tone: formTone,
        language: formLanguage,
        status: finalStatus,
        is_published: finalStatus === 'published',
        message: trimmedMessage,
      };

      if (editingTemplate) {
        const res = await adminAPI.updateTemplate(editingTemplate.id, payload);
        const updated = res.data;
        setTemplates((prev) =>
          prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        );
        toast.success(`Template "${trimmedName}" updated successfully.`);
      } else {
        const res = await adminAPI.createTemplate(payload);
        const created = res.data;
        // Prepend immediately to template list without requiring a manual page refresh
        setTemplates((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
        toast.success(
          finalStatus === 'published'
            ? `Template "${trimmedName}" published successfully!`
            : `Template "${trimmedName}" saved as draft.`
        );
      }

      setShowFormModal(false);
      fetchStats();
      fetchTemplates();
    } catch (err) {
      const backendErrors = err.response?.data;
      let errMsg = 'Failed to save template.';
      if (backendErrors) {
        if (typeof backendErrors === 'string') {
          errMsg = backendErrors;
        } else if (backendErrors.name) {
          errMsg = Array.isArray(backendErrors.name) ? backendErrors.name[0] : backendErrors.name;
        } else if (backendErrors.message) {
          errMsg = Array.isArray(backendErrors.message) ? backendErrors.message[0] : backendErrors.message;
        } else if (backendErrors.detail) {
          errMsg = backendErrors.detail;
        } else if (backendErrors.non_field_errors) {
          errMsg = Array.isArray(backendErrors.non_field_errors) ? backendErrors.non_field_errors[0] : backendErrors.non_field_errors;
        }
      }
      toast.error(errMsg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Publish Status
  const handleTogglePublish = async (t) => {
    try {
      const res = await adminAPI.togglePublishTemplate(t.id);
      const newStatus = res.data.is_published ? 'published' : 'draft';
      setTemplates((prev) =>
        prev.map((item) =>
          item.id === t.id
            ? { ...item, is_published: res.data.is_published, status: newStatus }
            : item
        )
      );
      toast.success(
        res.data.is_published
          ? `"${t.name}" published for all users.`
          : `"${t.name}" unpublished (saved as draft).`
      );
      fetchStats();
    } catch (err) {
      toast.error('Failed to change publication status.');
    }
  };

  // Delete Template
  const handleDeleteConfirm = async () => {
    if (!deletingTemplate) return;
    try {
      setDeleteSubmitting(true);
      await adminAPI.deleteTemplate(deletingTemplate.id);
      setTemplates((prev) => prev.filter((item) => item.id !== deletingTemplate.id));
      toast.success(`Template "${deletingTemplate.name}" deleted.`);
      setDeletingTemplate(null);
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete template.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const hasActiveFilters =
    selectedOccasion !== 'All' ||
    selectedTone !== 'All' ||
    selectedLanguage !== 'All' ||
    selectedStatus !== 'All' ||
    searchTerm.trim() !== '';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedOccasion('All');
    setSelectedTone('All');
    setSelectedLanguage('All');
    setSelectedStatus('All');
  };

  return (
    <div className="space-y-6">
      {/* Header with prominent "+ Create Template" button */}
      <PageHeader
        title="Template Management"
        subtitle="Create, edit, preview, and publish greeting templates for users."
        icon={BookOpen}
        actions={
          <button
            type="button"
            id="create-template-btn"
            onClick={handleOpenCreate}
            className="group relative inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:via-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-indigo-400/30 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90 text-indigo-100" />
            <span className="tracking-wide">+ Create Template</span>
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface/70 border border-line backdrop-blur-md">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Total Templates</span>
            <BookOpen size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-fg mt-2">{stats.total || templates.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/70 border border-line backdrop-blur-md">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Published</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{stats.published}</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/70 border border-line backdrop-blur-md">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Drafts</span>
            <EyeOff size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{stats.drafts}</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/70 border border-line backdrop-blur-md">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Archived</span>
            <Layers size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-400 mt-2">{stats.archived}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-surface/70 border border-line backdrop-blur-md space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
            <GlassInput
              type="text"
              placeholder="Search templates by name or message content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <GlassSelect
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              className="text-xs"
            >
              {OCCASIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occ === 'All' ? 'All Occasions' : occ}
                </option>
              ))}
            </GlassSelect>

            <GlassSelect
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value)}
              className="text-xs"
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone === 'All' ? 'All Tones' : tone}
                </option>
              ))}
            </GlassSelect>

            <GlassSelect
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-xs"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </GlassSelect>

            <GlassSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </GlassSelect>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-line/60 text-xs text-muted">
            <span>Showing filtered results</span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              <RefreshCw size={12} /> Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <SkeletonCards count={6} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No wish templates found"
          description={
            hasActiveFilters
              ? 'No templates match your current filters. Try relaxing your search criteria.'
              : 'Get started by creating your first greeting template.'
          }
          action={{
            label: '+ Create Template',
            onClick: handleOpenCreate,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => {
            const isPub = t.is_published || t.status === 'published';
            return (
              <GlassCardHover
                key={t.id}
                className="p-5 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-fg text-base truncate" title={t.name}>
                        {t.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-md uppercase">
                          {t.occasion}
                        </span>
                        <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold rounded-md uppercase">
                          {t.tone}
                        </span>
                        {t.language && (
                          <span className="px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-bold rounded-md uppercase flex items-center gap-1">
                            <Globe size={10} />
                            {t.language}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Publication Status Pill */}
                    <button
                      type="button"
                      title={isPub ? 'Click to unpublish (save as draft)' : 'Click to publish'}
                      onClick={() => handleTogglePublish(t)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPub
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPub ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      {isPub ? 'Published' : 'Draft'}
                    </button>
                  </div>

                  {/* Message Preview */}
                  <div className="mt-3 p-3.5 rounded-xl bg-inset/60 border border-line/70 text-xs text-muted leading-relaxed min-h-[90px] whitespace-pre-wrap font-sans">
                    {t.message || t.content}
                  </div>

                  {/* Metadata: Author & Timestamps */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted border-t border-line/50 pt-2.5">
                    <span>
                      By: <strong className="text-fg font-medium">{t.created_by_name || 'System'}</strong>
                    </span>
                    <span>
                      {new Date(t.created_at || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Preview personalized greeting"
                      onClick={() => {
                        setPreviewTemplate(t);
                        setPreviewSample({
                          name: 'Alex',
                          relationship: 'Friend',
                          sender: 'Jordan',
                          age: '30',
                        });
                      }}
                      className="p-2 rounded-xl bg-raised/40 border border-line text-muted hover:text-fg hover:bg-raised/80 transition-colors cursor-pointer"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      title="Edit template"
                      onClick={() => handleOpenEdit(t)}
                      className="p-2 rounded-xl bg-raised/40 border border-line text-muted hover:text-indigo-400 hover:bg-raised/80 transition-colors cursor-pointer"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      title="Delete template"
                      onClick={() => setDeletingTemplate(t)}
                      className="p-2 rounded-xl bg-raised/40 border border-line text-muted hover:text-rose-400 hover:bg-raised/80 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <GlassButton
                    size="sm"
                    variant={isPub ? 'secondary' : 'primary'}
                    icon={isPub ? EyeOff : CheckCircle2}
                    onClick={() => handleTogglePublish(t)}
                  >
                    {isPub ? 'Unpublish' : 'Publish'}
                  </GlassButton>
                </div>
              </GlassCardHover>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dedicated Modal */}
      <GlassModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingTemplate ? 'Edit Wish Template' : 'Create New Wish Template'}
        description="Configure ready-to-use greeting messages for users with optional personalization placeholders."
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveTemplate(formStatus);
          }}
          className="space-y-4"
        >
          {/* Template Name */}
          <Field
            label="Template Name"
            required
            hint="A clear, distinctive name to identify this template."
          >
            <div className="relative">
              <GlassInput
                type="text"
                id="template-name-input"
                required
                maxLength={150}
                placeholder="e.g. Heartfelt Milestone Birthday Greeting"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none">
                {formName.length}/150
              </span>
            </div>
          </Field>

          {/* Occasion, Tone, Language Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Occasion" required>
              <GlassSelect
                id="template-occasion-select"
                value={formOccasion}
                onChange={(e) => setFormOccasion(e.target.value)}
              >
                {FORM_OCCASIONS.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ}
                  </option>
                ))}
              </GlassSelect>
            </Field>

            <Field label="Tone" required>
              <GlassSelect
                id="template-tone-select"
                value={formTone}
                onChange={(e) => setFormTone(e.target.value)}
              >
                {FORM_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </GlassSelect>
            </Field>

            <Field label="Language" required>
              <GlassSelect
                id="template-language-select"
                value={formLanguage}
                onChange={(e) => setFormLanguage(e.target.value)}
              >
                {FORM_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </GlassSelect>
            </Field>
          </div>

          {/* Status Selection Pill Switcher */}
          <Field
            label="Initial Publication Status"
            hint="Drafts remain private to admins; Published templates appear instantly on the user templates catalog."
          >
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormStatus('published')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  formStatus === 'published'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20'
                    : 'bg-raised/40 border-line text-muted hover:text-fg hover:bg-raised/70'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    formStatus === 'published' ? 'bg-emerald-400 animate-pulse' : 'bg-muted'
                  }`}
                />
                <span>Published (Live for Users)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormStatus('draft')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  formStatus === 'draft'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm shadow-amber-500/20'
                    : 'bg-raised/40 border-line text-muted hover:text-fg hover:bg-raised/70'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    formStatus === 'draft' ? 'bg-amber-400' : 'bg-muted'
                  }`}
                />
                <span>Draft (Admin Review Only)</span>
              </button>
            </div>
          </Field>

          {/* Personalization Variables */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label flex items-center gap-1.5">
                <span>Personalization Variables</span>
                <span className="text-[10px] text-muted font-normal">(Click to insert at cursor)</span>
              </label>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PLACEHOLDER_CHIPS.map((chip) => (
                <button
                  key={chip.tag}
                  type="button"
                  onClick={() => insertPlaceholder(chip.tag)}
                  title={`Insert ${chip.label}`}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-300 hover:text-indigo-200 font-mono text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="text-indigo-400 font-bold">+</span>
                  <span>{chip.tag}</span>
                  <span className="text-[10px] text-muted">({chip.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wish Message */}
          <Field
            label="Wish Message"
            required
            hint="The greeting text. Personalization variables will be replaced automatically for recipients."
          >
            <div className="relative">
              <GlassTextarea
                ref={textareaRef}
                id="template-message-textarea"
                required
                rows={5}
                maxLength={2500}
                placeholder="Write your greeting message here... e.g. Happy Birthday {{name}}! May your year ahead be blessed with joy and good health."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-muted mt-1.5">
              <span>Supports placeholders: {'{{name}}'}, {'{{relationship}}'}, {'{{occasion}}'}, {'{{sender}}'}, {'{{age}}'}.</span>
              <span className={formMessage.length > 2400 ? 'text-amber-400 font-semibold' : 'text-muted'}>
                {formMessage.length}/2500 characters
              </span>
            </div>
          </Field>

          {/* Live Preview Panel */}
          <div className="p-4 rounded-2xl bg-inset/70 border border-line/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-indigo-400" />
                <span className="text-xs font-semibold text-fg">Live User Preview</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
                  Real-time Substitution
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewSection(!showPreviewSection)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                {showPreviewSection ? 'Hide Sample Inputs' : 'Edit Sample Inputs'}
              </button>
            </div>

            {showPreviewSection && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-line/40">
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Sample Name</label>
                  <input
                    type="text"
                    value={formPreviewSample.name}
                    onChange={(e) =>
                      setFormPreviewSample({ ...formPreviewSample, name: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-fg focus:outline-none focus:border-indigo-500/50"
                    placeholder="Alex"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Sample Relationship</label>
                  <input
                    type="text"
                    value={formPreviewSample.relationship}
                    onChange={(e) =>
                      setFormPreviewSample({ ...formPreviewSample, relationship: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-fg focus:outline-none focus:border-indigo-500/50"
                    placeholder="Friend"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Sample Sender</label>
                  <input
                    type="text"
                    value={formPreviewSample.sender}
                    onChange={(e) =>
                      setFormPreviewSample({ ...formPreviewSample, sender: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-fg focus:outline-none focus:border-indigo-500/50"
                    placeholder="Jordan"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Sample Age</label>
                  <input
                    type="text"
                    value={formPreviewSample.age}
                    onChange={(e) =>
                      setFormPreviewSample({ ...formPreviewSample, age: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-fg focus:outline-none focus:border-indigo-500/50"
                    placeholder="25"
                  />
                </div>
              </div>
            )}

            {/* Resolved Preview Output */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-500/5 to-violet-500/10 border border-indigo-500/20 text-xs text-fg leading-relaxed whitespace-pre-wrap font-sans min-h-[70px]">
              {formMessage ? (
                renderPersonalizedMessage(
                  formMessage,
                  formPreviewSample.name,
                  formPreviewSample.relationship,
                  formOccasion,
                  formPreviewSample.sender,
                  formPreviewSample.age
                )
              ) : (
                <em className="text-muted">
                  Type a wish message above to see the live preview with variable replacement...
                </em>
              )}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="pt-4 border-t border-line/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              id="cancel-template-btn"
              onClick={() => setShowFormModal(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-fg hover:bg-raised/70 border border-line transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                id="save-draft-btn"
                disabled={formSubmitting}
                onClick={() => handleSaveTemplate('draft')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-amber-500/10"
              >
                <EyeOff size={14} />
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                id="publish-template-btn"
                disabled={formSubmitting}
                onClick={() => handleSaveTemplate('published')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 border border-emerald-400/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>{editingTemplate ? 'Publish Changes' : 'Publish Template'}</span>
              </button>
            </div>
          </div>
        </form>
      </GlassModal>

      {/* Delete Confirmation Modal */}
      <GlassModal
        isOpen={Boolean(deletingTemplate)}
        onClose={() => setDeletingTemplate(null)}
        title="Delete Template?"
        description="This action cannot be undone."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 leading-relaxed flex items-start gap-3">
            <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              Are you sure you want to delete <strong className="text-white">"{deletingTemplate?.name}"</strong>?
              It will be immediately removed from the user-facing Wish Templates page and database.
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <GlassButton
              variant="secondary"
              onClick={() => setDeletingTemplate(null)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="danger"
              loading={deleteSubmitting}
              onClick={handleDeleteConfirm}
            >
              Yes, Delete
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Standalone Preview Modal */}
      {previewTemplate && (
        <GlassModal
          isOpen={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
          title={`Preview: ${previewTemplate.name}`}
          description="Test how this template will appear to users with live personalization values."
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-muted block mb-1">Recipient Name</label>
                <GlassInput
                  value={previewSample.name}
                  onChange={(e) => setPreviewSample({ ...previewSample, name: e.target.value })}
                  placeholder="Sarah"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Relationship</label>
                <GlassInput
                  value={previewSample.relationship}
                  onChange={(e) =>
                    setPreviewSample({ ...previewSample, relationship: e.target.value })
                  }
                  placeholder="Sister"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Sender Name</label>
                <GlassInput
                  value={previewSample.sender}
                  onChange={(e) => setPreviewSample({ ...previewSample, sender: e.target.value })}
                  placeholder="Alex"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Age / Milestone</label>
                <GlassInput
                  value={previewSample.age}
                  onChange={(e) => setPreviewSample({ ...previewSample, age: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
              <div className="flex justify-between items-center text-xs text-indigo-400 font-semibold mb-2">
                <span>Personalized Message Preview</span>
                <span className="uppercase text-[10px] tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  {previewTemplate.occasion}
                </span>
              </div>
              <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap font-sans">
                {renderPersonalizedMessage(
                  previewTemplate.message || previewTemplate.content,
                  previewSample.name,
                  previewSample.relationship,
                  previewTemplate.occasion,
                  previewSample.sender,
                  previewSample.age
                )}
              </p>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const rendered = renderPersonalizedMessage(
                    previewTemplate.message || previewTemplate.content,
                    previewSample.name,
                    previewSample.relationship,
                    previewTemplate.occasion,
                    previewSample.sender,
                    previewSample.age
                  );
                  navigator.clipboard.writeText(rendered);
                  toast.success('Personalized message copied!');
                }}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                <Copy size={14} /> Copy Personalized Text
              </button>
              <GlassButton
                variant="secondary"
                onClick={() => setPreviewTemplate(null)}
              >
                Close Preview
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
};

export default AdminTemplates;

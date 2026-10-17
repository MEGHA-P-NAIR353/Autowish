import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Plus, Edit2, Trash2, Search, CheckCircle2,
  Eye, EyeOff, Globe, Sparkles, Filter, X, RefreshCw, AlertTriangle, Copy, Layers
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

const OCCASIONS = ['All', 'Birthday', 'Anniversary', 'Festival', 'Holiday', 'Custom'];
const TONES = ['All', 'Friendly', 'Professional', 'Funny', 'Romantic', 'Formal', 'Heartfelt', 'Inspiring'];
const LANGUAGES = [
  { code: 'All', label: 'All Languages' },
  { code: 'en', label: 'English (en)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'hi', label: 'Hindi (hi)' },
];
const STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const PLACEHOLDER_CHIPS = ['{{name}}', '{{relationship}}', '{{occasion}}'];

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
  const [previewInModal, setPreviewInModal] = useState(false);

  // Delete Confirmation Modal state
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Standalone Preview Modal state
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewName, setPreviewName] = useState('Alex');
  const [previewRelationship, setPreviewRelationship] = useState('Friend');

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
    setPreviewInModal(false);
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (t) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormOccasion(t.occasion || 'Birthday');
    setFormTone(t.tone || 'Friendly');
    setFormLanguage(t.language || 'en');
    setFormStatus(t.status || (t.is_published ? 'published' : 'draft'));
    setFormMessage(t.message || t.content || '');
    setPreviewInModal(false);
    setShowFormModal(true);
  };

  // Form Submit (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formMessage.trim()) {
      toast.error('Template name and message are required.');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        name: formName.trim(),
        occasion: formOccasion,
        tone: formTone,
        language: formLanguage,
        status: formStatus,
        is_published: formStatus === 'published',
        message: formMessage.trim(),
      };

      if (editingTemplate) {
        await adminAPI.updateTemplate(editingTemplate.id, payload);
        toast.success(`Template "${formName}" updated successfully.`);
      } else {
        await adminAPI.createTemplate(payload);
        toast.success(`Template "${formName}" created successfully.`);
      }

      setShowFormModal(false);
      fetchTemplates();
      fetchStats();
    } catch (err) {
      const errDetail = err.response?.data?.name?.[0] || err.response?.data?.message?.[0] || err.response?.data?.detail || 'Failed to save template.';
      toast.error(errDetail);
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
        prev.map((item) => (item.id === t.id ? { ...item, is_published: res.data.is_published, status: newStatus } : item))
      );
      toast.success(res.data.is_published ? `"${t.name}" published for all users.` : `"${t.name}" unpublished (draft).`);
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

  // Helper to insert placeholder into message textarea
  const insertPlaceholder = (ph) => {
    setFormMessage((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${ph} ` : `${ph} `;
    });
  };

  // Render message with live placeholder substitution
  const renderPersonalizedMessage = (text, nameVal = previewName, relVal = previewRelationship, occVal = 'Birthday') => {
    if (!text) return '';
    const safeName = (nameVal ?? '').toString().trim() || 'Alex';
    const safeRel = (relVal ?? '').toString().trim() || 'Friend';
    const safeOcc = (occVal ?? '').toString().trim() || 'Birthday';
    return String(text)
      .replace(/\{\{\s*name\s*\}\}|\{name\}/gi, safeName)
      .replace(/\{\{\s*relationship\s*\}\}|\{relationship\}/gi, safeRel)
      .replace(/\{\{\s*occasion\s*\}\}|\{occasion\}/gi, safeOcc);
  };

  const hasActiveFilters = selectedOccasion !== 'All' || selectedTone !== 'All' || selectedLanguage !== 'All' || selectedStatus !== 'All' || searchTerm.trim() !== '';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedOccasion('All');
    setSelectedTone('All');
    setSelectedLanguage('All');
    setSelectedStatus('All');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Template Management"
        description="Create, edit, preview, and publish greeting templates for users."
        action={
          <GlassButton
            variant="primary"
            icon={Plus}
            onClick={handleOpenCreate}
            className="shadow-lg shadow-indigo-500/25"
          >
            Create Template
          </GlassButton>
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
              placeholder="Search templates by name or message..."
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
                <option key={occ} value={occ}>{occ === 'All' ? 'All Occasions' : occ}</option>
              ))}
            </GlassSelect>

            <GlassSelect
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value)}
              className="text-xs"
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>{tone === 'All' ? 'All Tones' : tone}</option>
              ))}
            </GlassSelect>

            <GlassSelect
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-xs"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </GlassSelect>

            <GlassSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </GlassSelect>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-line/60 text-xs text-muted">
            <span>Showing filtered results</span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
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
            label: 'Create Template',
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
                      title={isPub ? 'Click to unpublish' : 'Click to publish'}
                      onClick={() => handleTogglePublish(t)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                        isPub
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {isPub ? 'Published' : 'Draft'}
                    </button>
                  </div>

                  {/* Message Preview */}
                  <div className="mt-3 p-3.5 rounded-xl bg-inset/60 border border-line/70 text-xs text-muted leading-relaxed min-h-[90px] whitespace-pre-wrap font-sans">
                    {t.message || t.content}
                  </div>

                  {/* Metadata: Author & Timestamps */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted border-t border-line/50 pt-2.5">
                    <span>By: <strong className="text-fg font-medium">{t.created_by_name || 'System'}</strong></span>
                    <span>{new Date(t.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                        setPreviewName('Alex');
                        setPreviewRelationship('Friend');
                      }}
                      className="p-2 rounded-xl bg-raised/40 border border-line text-muted hover:text-fg hover:bg-raised/80 transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      title="Edit template"
                      onClick={() => handleOpenEdit(t)}
                      className="p-2 rounded-xl bg-raised/40 border border-line text-muted hover:text-indigo-400 hover:bg-raised/80 transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      title="Delete template"
                      onClick={() => setDeletingTemplate(t)}
                      className="p-2 rounded-xl bg-raised/40 border border-line text-muted hover:text-rose-400 hover:bg-raised/80 transition-colors"
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

      {/* Create / Edit Modal */}
      <GlassModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingTemplate ? 'Edit Wish Template' : 'Create New Wish Template'}
        description="Configure ready-to-use greeting messages for users with optional placeholders."
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Field label="Template Title / Name" required hint="Used by administrators and users to identify the greeting.">
            <GlassInput
              type="text"
              required
              maxLength={150}
              placeholder="e.g. Heartfelt Milestone Birthday Greeting"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Occasion" required>
              <GlassSelect
                value={formOccasion}
                onChange={(e) => setFormOccasion(e.target.value)}
              >
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Festival">Festival</option>
                <option value="Holiday">Holiday</option>
                <option value="Custom">Custom</option>
              </GlassSelect>
            </Field>

            <Field label="Tone" required>
              <GlassSelect
                value={formTone}
                onChange={(e) => setFormTone(e.target.value)}
              >
                <option value="Friendly">Friendly</option>
                <option value="Professional">Professional</option>
                <option value="Funny">Funny</option>
                <option value="Romantic">Romantic</option>
                <option value="Formal">Formal</option>
                <option value="Heartfelt">Heartfelt</option>
                <option value="Inspiring">Inspiring</option>
              </GlassSelect>
            </Field>

            <Field label="Language" required>
              <GlassSelect
                value={formLanguage}
                onChange={(e) => setFormLanguage(e.target.value)}
              >
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="hi">Hindi (hi)</option>
              </GlassSelect>
            </Field>
          </div>

          <Field label="Publication Status" hint="Only published templates are visible to regular users.">
            <GlassSelect
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            >
              <option value="published">Published (Live for regular users)</option>
              <option value="draft">Draft (Admin review only)</option>
              <option value="archived">Archived (Hidden)</option>
            </GlassSelect>
          </Field>

          <Field
            label="Greeting Message Content"
            required
            hint="Insert placeholders to personalize text when copied or rendered."
          >
            {/* Quick placeholder insert chips */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="text-[11px] text-muted">Insert Tag:</span>
              {PLACEHOLDER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => insertPlaceholder(chip)}
                  className="px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 font-mono text-[11px] transition-colors"
                >
                  +{chip}
                </button>
              ))}
            </div>

            <GlassTextarea
              required
              rows={5}
              placeholder="Type your greeting message here..."
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
            />
            <div className="flex justify-between items-center text-[11px] text-muted mt-1">
              <span>Supports {'{{name}}'}, {'{{relationship}}'}, {'{{occasion}}'} tags.</span>
              <span>{formMessage.length}/2500 characters</span>
            </div>
          </Field>

          {/* Live Preview Expander */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setPreviewInModal(!previewInModal)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <Eye size={14} />
              {previewInModal ? 'Hide Live Preview' : 'Show Live Preview with Sample Name'}
            </button>
            {previewInModal && (
              <div className="mt-2 p-3 rounded-xl bg-inset/80 border border-line text-xs text-fg leading-relaxed">
                <span className="block text-[10px] text-muted uppercase font-bold tracking-wider mb-1">
                  Preview (Sample: name="Alex", relationship="Friend"):
                </span>
                {renderPersonalizedMessage(formMessage, 'Alex', 'Friend', formOccasion) || <em className="text-muted">Type message above to preview...</em>}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-line flex justify-end gap-3">
            <GlassButton
              type="button"
              variant="secondary"
              onClick={() => setShowFormModal(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              loading={formSubmitting}
            >
              {editingTemplate ? 'Save Changes' : 'Create & Publish'}
            </GlassButton>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sample Recipient Name">
                <GlassInput
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="e.g. Sarah"
                />
              </Field>
              <Field label="Sample Relationship">
                <GlassInput
                  value={previewRelationship}
                  onChange={(e) => setPreviewRelationship(e.target.value)}
                  placeholder="e.g. Sister, Colleague"
                />
              </Field>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
              <div className="flex justify-between items-center text-xs text-indigo-400 font-semibold mb-2">
                <span>Personalized Message Preview</span>
                <span className="uppercase text-[10px] tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  {previewTemplate.occasion}
                </span>
              </div>
              <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap font-sans">
                {renderPersonalizedMessage(previewTemplate.message || previewTemplate.content, previewName, previewRelationship, previewTemplate.occasion)}
              </p>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const rendered = renderPersonalizedMessage(previewTemplate.message || previewTemplate.content, previewName, previewRelationship, previewTemplate.occasion);
                  navigator.clipboard.writeText(rendered);
                  toast.success('Personalized message copied!');
                }}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
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

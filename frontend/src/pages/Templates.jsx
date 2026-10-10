import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Heart, Copy, Plus, Trash2, Bookmark } from 'lucide-react';
import api from '../services/api';
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
} from '../components/ui';
import EmptyState from '../components/common/EmptyState';

const OCCASIONS = ['All', 'Birthday', 'Anniversary', 'Festival', 'Holiday'];

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('All');

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOccasion, setNewOccasion] = useState('Birthday');
  const [newTone, setNewTone] = useState('Friendly');
  const [newContent, setNewContent] = useState('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('templates/');
      setTemplates(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Template copied to clipboard!');
  };

  const handleToggleFavorite = async (id, currentVal) => {
    try {
      const res = await api.patch(`templates/${id}/`, { is_favorite: !currentVal });
      setTemplates(
        templates.map((t) => (t.id === id ? { ...t, is_favorite: res.data.is_favorite } : t))
      );
      toast.success(res.data.is_favorite ? 'Added to favorites!' : 'Removed from favorites.');
    } catch (err) {
      toast.error('Failed to update favorite status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`templates/${id}/`);
      setTemplates(templates.filter((t) => t.id !== id));
      toast.success('Template deleted.');
    } catch (err) {
      toast.error('Failed to delete template.');
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newName || !newContent) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('templates/', {
        name: newName,
        occasion: newOccasion,
        tone: newTone,
        content: newContent,
        is_favorite: false,
      });
      toast.success('Template added successfully!');
      setShowAddModal(false);
      setNewName('');
      setNewContent('');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to add template.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOccasion = selectedOccasion === 'All' || t.occasion === selectedOccasion;
    return matchesSearch && matchesOccasion;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Wish Templates"
        description="Save your custom templates or browse system defaults."
        action={
          <GlassButton
            variant="primary"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Create Template
          </GlassButton>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <GlassInput
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 bg-surface/70 backdrop-blur-md p-1.5 border border-line rounded-2xl">
          {OCCASIONS.map((occ) => {
            const isActive = selectedOccasion === occ;
            return (
              <button
                key={occ}
                type="button"
                onClick={() => setSelectedOccasion(occ)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm font-semibold'
                    : 'text-muted hover:text-fg hover:bg-raised/40'
                }`}
              >
                {occ}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No templates found"
          description={
            searchTerm || selectedOccasion !== 'All'
              ? 'Try modifying your search or filter criteria.'
              : 'Create your first custom wish template to speed up message drafting.'
          }
          action={{
            label: 'Create Template',
            onClick: () => setShowAddModal(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <GlassCardHover
              key={t.id}
              className="p-5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base text-fg truncate">{t.name}</h3>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-[10px] font-semibold rounded-full uppercase">
                        {t.occasion}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-500 dark:text-purple-400 text-[10px] font-semibold rounded-full uppercase">
                        {t.tone}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      title={t.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={() => handleToggleFavorite(t.id, t.is_favorite)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        t.is_favorite
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          : 'bg-raised/40 border-line text-muted hover:text-fg'
                      }`}
                    >
                      <Heart size={14} fill={t.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    {t.user && (
                      <button
                        type="button"
                        title="Delete template"
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg bg-raised/40 border border-line text-muted hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-muted text-xs leading-relaxed mt-2 bg-inset/50 p-3 rounded-xl border border-line/60 min-h-[70px] whitespace-pre-wrap">
                  {t.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-line/60 flex justify-end">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  icon={Copy}
                  onClick={() => handleCopy(t.content)}
                >
                  Copy Text
                </GlassButton>
              </div>
            </GlassCardHover>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <GlassModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="New Custom Template"
        description="Save your reusable greeting template for quick access."
        size="md"
      >
        <form onSubmit={handleAddTemplate} className="space-y-4">
          <Field label="Template Name" required>
            <GlassInput
              type="text"
              required
              placeholder="e.g. Work Anniversary Short"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Occasion" required>
              <GlassSelect
                value={newOccasion}
                onChange={(e) => setNewOccasion(e.target.value)}
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
                value={newTone}
                onChange={(e) => setNewTone(e.target.value)}
              >
                <option value="Friendly">Friendly</option>
                <option value="Professional">Professional</option>
                <option value="Funny">Funny</option>
                <option value="Romantic">Romantic</option>
                <option value="Formal">Formal</option>
              </GlassSelect>
            </Field>
          </div>

          <Field
            label="Template Content"
            hint="You can use placeholder tags like {name}"
            required
          >
            <GlassTextarea
              required
              rows={4}
              placeholder="Type your template text here..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </Field>

          <div className="pt-2 flex justify-end gap-3">
            <GlassButton
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              loading={submitting}
            >
              Create Template
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};

export default Templates;

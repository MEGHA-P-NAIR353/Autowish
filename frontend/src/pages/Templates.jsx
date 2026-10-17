import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, Search, Heart, Copy, Plus, BookTemplate,
  Globe, Filter, Wand2, X, ChevronLeft, ChevronRight, User, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { templatesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';
import {
  GlassCardHover,
  GlassModal,
  GlassInput,
  GlassSelect,
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

const Templates = () => {
  const { user } = useAuth();
  const { contacts } = useData();

  const isAdmin = useMemo(() => {
    return Boolean(
      user?.is_superuser ||
      user?.is_staff ||
      user?.profile?.role === 'admin' ||
      user?.profile?.role === 'super_admin'
    );
  }, [user]);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  const [selectedTone, setSelectedTone] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Personalization Dialog state
  const [activePersonalizeTemplate, setActivePersonalizeTemplate] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');

  // Fetch templates from database via backend API
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page_size: pageSize,
        page,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedOccasion !== 'All') params.occasion = selectedOccasion;
      if (selectedTone !== 'All') params.tone = selectedTone;
      if (selectedLanguage !== 'All') params.language = selectedLanguage;
      if (showFavoritesOnly) params.favorites_only = true;

      const res = await templatesAPI.getAll(params);
      const data = res.data.results || res.data || [];
      setTemplates(data);
      setTotalCount(res.data.count ?? data.length);
    } catch (err) {
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedOccasion, selectedTone, selectedLanguage, showFavoritesOnly, page, pageSize]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Reset page when filters change
  const handleOccasionChange = (occ) => {
    setSelectedOccasion(occ);
    setPage(1);
  };

  const handleToneChange = (tone) => {
    setSelectedTone(tone);
    setPage(1);
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleToggleFavoritesFilter = () => {
    setShowFavoritesOnly((prev) => !prev);
    setPage(1);
  };

  // Copy raw template text directly to clipboard
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Template copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard.');
    }
  };

  // Toggle favorite status on a template
  const handleToggleFavorite = async (id, currentVal) => {
    try {
      const res = await templatesAPI.toggleFavorite(id);
      const isFav = res.data.is_favorite ?? !currentVal;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_favorite: isFav } : t))
      );
      toast.success(isFav ? 'Added to favorites!' : 'Removed from favorites.');
    } catch (err) {
      toast.error('Failed to update favorite status.');
    }
  };

  // Open Personalization Dialog
  const handleOpenPersonalize = (t) => {
    setActivePersonalizeTemplate(t);
    setRecipientName('');
    setRelationship('');
    setSelectedContactId('');
  };

  // Select contact inside Personalization Dialog
  const handleContactSelect = (contactId) => {
    setSelectedContactId(contactId);
    if (!contactId) return;
    const found = contacts?.find((c) => String(c.id) === String(contactId));
    if (found) {
      setRecipientName(found.name || '');
      setRelationship(found.relationship || '');
    }
  };

  // Generate personalized message text
  const getPersonalizedMessage = (rawText, nameVal, relVal, occVal, senderVal, ageVal) => {
    if (!rawText) return '';
    const safeName = (nameVal ?? '').toString().trim() || 'Friend';
    const safeRel = (relVal ?? '').toString().trim() || 'Friend';
    const safeOcc = (occVal ?? '').toString().trim() || 'Special Occasion';
    const safeSender = (senderVal ?? '').toString().trim() || 'Your Friend';
    const safeAge = (ageVal ?? '').toString().trim() || 'Milestone';
    return String(rawText)
      .replace(/\{\{\s*name\s*\}\}|\{name\}/gi, safeName)
      .replace(/\{\{\s*relationship\s*\}\}|\{relationship\}/gi, safeRel)
      .replace(/\{\{\s*occasion\s*\}\}|\{occasion\}/gi, safeOcc)
      .replace(/\{\{\s*sender\s*\}\}|\{sender\}/gi, safeSender)
      .replace(/\{\{\s*age\s*\}\}|\{age\}/gi, safeAge);
  };

  // Copy personalized text
  const handleCopyPersonalized = async () => {
    if (!activePersonalizeTemplate) return;
    const raw = activePersonalizeTemplate.message || activePersonalizeTemplate.content || '';
    const text = getPersonalizedMessage(
      raw,
      recipientName.trim(),
      relationship.trim(),
      activePersonalizeTemplate.occasion
    );
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Personalized wish copied to clipboard! 🎉');
      setActivePersonalizeTemplate(null);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const hasPlaceholders = (text) => {
    if (!text) return false;
    return /\{\{\s*(name|relationship|occasion|sender|age)\s*\}\}|\{(name|relationship|occasion|sender|age)\}/i.test(text);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const hasActiveFilters =
    selectedOccasion !== 'All' ||
    selectedTone !== 'All' ||
    selectedLanguage !== 'All' ||
    showFavoritesOnly ||
    searchTerm.trim() !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedOccasion('All');
    setSelectedTone('All');
    setSelectedLanguage('All');
    setShowFavoritesOnly(false);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Wish Templates"
        description="Browse, personalize, and copy ready-made greeting messages created by our team."
        action={
          isAdmin && (
            <Link to="/admin/templates">
              <GlassButton variant="primary" icon={BookTemplate}>
                Manage in Admin Panel
              </GlassButton>
            </Link>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface/70 border border-line backdrop-blur-md space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
            <GlassInput
              type="text"
              placeholder="Search templates by keywords..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          {/* Tone & Language Dropdowns */}
          <div className="flex gap-2">
            <GlassSelect
              value={selectedTone}
              onChange={(e) => handleToneChange(e.target.value)}
              className="text-xs min-w-[130px]"
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone === 'All' ? 'All Tones' : tone}
                </option>
              ))}
            </GlassSelect>

            <GlassSelect
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs min-w-[130px]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </GlassSelect>

            {/* Favorites Toggle Button */}
            <button
              type="button"
              onClick={handleToggleFavoritesFilter}
              title={showFavoritesOnly ? 'Show all templates' : 'Show favorites only'}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                showFavoritesOnly
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 font-bold'
                  : 'bg-raised/40 border-line text-muted hover:text-fg'
              }`}
            >
              <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">Favorites</span>
            </button>
          </div>
        </div>

        {/* Occasions Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex gap-1.5 shrink-0">
            {OCCASIONS.map((occ) => {
              const isActive = selectedOccasion === occ;
              return (
                <button
                  key={occ}
                  type="button"
                  onClick={() => handleOccasionChange(occ)}
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap shrink-0"
            >
              <RefreshCw size={12} /> Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <SkeletonCards count={6} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={BookTemplate}
          title="No templates found"
          description={
            hasActiveFilters
              ? 'No templates match your selected filters. Try broadening your criteria.'
              : 'No templates are currently available. Check back soon or contact your administrator.'
          }
          action={
            hasActiveFilters
              ? {
                  label: 'Reset Filters',
                  onClick: handleResetFilters,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => {
            const rawMessage = t.message || t.content || '';
            const carriesPlaceholders = hasPlaceholders(rawMessage);
            return (
              <GlassCardHover
                key={t.id}
                className="p-5 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Card Top */}
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base text-fg truncate" title={t.name}>
                        {t.name}
                      </h3>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-[10px] font-semibold rounded-full uppercase">
                          {t.occasion}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-500 dark:text-purple-400 text-[10px] font-semibold rounded-full uppercase">
                          {t.tone}
                        </span>
                        {t.language && (
                          <span className="px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-semibold rounded-full uppercase flex items-center gap-1">
                            <Globe size={10} />
                            {t.language}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={t.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        onClick={() => handleToggleFavorite(t.id, t.is_favorite)}
                        className={`p-2 rounded-xl border transition-colors ${
                          t.is_favorite
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                            : 'bg-raised/40 border-line text-muted hover:text-fg'
                        }`}
                      >
                        <Heart size={15} fill={t.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Message Content */}
                  <p className="text-muted text-xs leading-relaxed mt-2 bg-inset/50 p-3.5 rounded-xl border border-line/60 min-h-[85px] whitespace-pre-wrap font-sans">
                    {rawMessage}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                  {carriesPlaceholders ? (
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      icon={Wand2}
                      onClick={() => handleOpenPersonalize(t)}
                    >
                      Personalize
                    </GlassButton>
                  ) : (
                    <span className="text-[11px] text-muted italic">Ready to use</span>
                  )}

                  <GlassButton
                    variant="ghost"
                    size="sm"
                    icon={Copy}
                    onClick={() => handleCopy(rawMessage)}
                  >
                    Copy Text
                  </GlassButton>
                </div>
              </GlassCardHover>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-line/60 text-xs text-muted">
          <span>
            Showing page <strong className="text-fg">{page}</strong> of <strong className="text-fg">{totalPages}</strong> ({totalCount} total)
          </span>
          <div className="flex gap-2">
            <GlassButton
              size="sm"
              variant="secondary"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </GlassButton>
            <GlassButton
              size="sm"
              variant="secondary"
              icon={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </GlassButton>
          </div>
        </div>
      )}

      {/* Personalization Dialog */}
      {activePersonalizeTemplate && (
        <GlassModal
          isOpen={Boolean(activePersonalizeTemplate)}
          onClose={() => setActivePersonalizeTemplate(null)}
          title={`Personalize Wish: ${activePersonalizeTemplate.name}`}
          description="Fill in the details to customize placeholders before copying."
          size="md"
        >
          <div className="space-y-4">
            {/* Quick Contact Selection if contacts exist */}
            {contacts && contacts.length > 0 && (
              <Field label="Choose from Contacts (Optional)" hint="Automatically fills name and relationship.">
                <GlassSelect
                  value={selectedContactId}
                  onChange={(e) => handleContactSelect(e.target.value)}
                >
                  <option value="">-- Or enter custom name below --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.relationship ? `(${c.relationship})` : ''}
                    </option>
                  ))}
                </GlassSelect>
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Recipient Name" required>
                <GlassInput
                  placeholder="e.g. Sarah"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </Field>

              <Field label="Relationship (Optional)">
                <GlassInput
                  placeholder="e.g. Sister, Friend, Colleague"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                />
              </Field>
            </div>

            {/* Live Personalized Preview */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
              <div className="flex justify-between items-center text-xs text-indigo-400 font-semibold mb-2">
                <span>Personalized Message</span>
                <span className="uppercase text-[10px] tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  {activePersonalizeTemplate.occasion}
                </span>
              </div>
              <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap font-sans">
                {getPersonalizedMessage(
                  activePersonalizeTemplate.message || activePersonalizeTemplate.content,
                  recipientName.trim(),
                  relationship.trim(),
                  activePersonalizeTemplate.occasion
                )}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activePersonalizeTemplate.message || activePersonalizeTemplate.content)}
                className="text-xs text-muted hover:text-fg underline text-center sm:text-left"
              >
                Copy original with placeholders intact
              </button>

              <div className="flex justify-end gap-2">
                <GlassButton
                  variant="secondary"
                  onClick={() => setActivePersonalizeTemplate(null)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  icon={Copy}
                  onClick={handleCopyPersonalized}
                >
                  Copy Personalized Text
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
};

export default Templates;

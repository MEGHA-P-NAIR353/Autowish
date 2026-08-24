import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Sparkles, Star, X, AlertTriangle, Loader2 } from 'lucide-react';
import { cardTemplatesAPI, cardsAPI } from '../../services/greetingCardsAPI';
import TemplateGrid from '../components/TemplateGrid';
import LivePreview from '../components/LivePreview';
import { CardTemplate } from '../types';
import toast from 'react-hot-toast';

// Occasion groups shown in the gallery (order matters for layout).
const OCCASION_GROUPS: { key: string; label: string; emoji: string }[] = [
  { key: 'Birthday', label: 'Birthday', emoji: '🎂' },
  { key: 'Anniversary', label: 'Anniversary', emoji: '💍' },
  { key: 'Wedding', label: 'Wedding', emoji: '💐' },
  { key: 'Festival', label: 'Festival', emoji: '🎉' },
  { key: 'Christmas', label: 'Christmas', emoji: '🎄' },
  { key: 'NewYear', label: 'New Year', emoji: '🎆' },
  { key: 'Diwali', label: 'Diwali', emoji: '🪔' },
  { key: 'Eid', label: 'Eid', emoji: '🌙' },
  { key: "Mother's Day", label: 'Mother\'s Day', emoji: '🌸' },
  { key: "Father's Day", label: 'Father\'s Day', emoji: '💙' },
  { key: 'Graduation', label: 'Graduation', emoji: '🎓' },
  { key: 'Congratulations', label: 'Congratulations', emoji: '🏆' },
  { key: 'Baby Shower', label: 'Baby Shower', emoji: '🧸' },
  { key: 'FriendshipDay', label: 'Friendship', emoji: '🌈' },
  { key: 'Valentine', label: 'Valentine', emoji: '❤️' },
  { key: 'ThankYou', label: 'Thank You', emoji: '🙏' },
  { key: 'GetWellSoon', label: 'Get Well Soon', emoji: '🌷' },
  { key: 'Custom', label: 'Custom', emoji: '✨' },
];

const PAGE_SIZE = 12;

export default function GreetingTemplates() {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [premiumFilter, setPremiumFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const [page, setPage] = useState(1);

  const [previewingTemplate, setPreviewingTemplate] = useState<CardTemplate | null>(null);
  const navigate = useNavigate();

  const fetchMeta = useCallback(async () => {
    try {
      const res = await cardTemplatesAPI.getCategories();
      setOccasions((res.data.occasions || []).map((o: any) => (typeof o === 'string' ? o : o.label || o.value)));
      setCategories(res.data.categories || []);
    } catch {
      // Fallback standard occasions
      setOccasions(OCCASION_GROUPS.map((o) => o.label));
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        page_size: PAGE_SIZE,
        ordering: sortBy === 'newest' ? '-created_at' : 'sort_order',
        search: search || undefined,
        occasion: selectedOccasion || undefined,
        category: selectedCategory || undefined,
        premium: premiumFilter === 'all' ? undefined : premiumFilter === 'premium',
        featured: featuredOnly ? true : undefined,
      };
      const res = await cardTemplatesAPI.getAll(params);
      const raw: CardTemplate[] = res.data.results || res.data || [];
      setTemplates(raw);
    } catch {
      setError('Failed to load templates. Please try again.');
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedOccasion, selectedCategory, premiumFilter, featuredOnly, sortBy]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleUseTemplate = async (template: CardTemplate) => {
    try {
      const res = await cardsAPI.create({
        title: `Greeting Card (${template.title})`,
        occasion: template.occasion,
        card_size: 'instagram_square',
        card_theme: 'dark',
        card_width: template.card_width || 500,
        card_height: template.card_height || 500,
        background_color: template.background_color,
        background_image: template.background_image_url || '',
        font_family: template.font_family || 'Inter',
        font_size: template.font_size || 16,
        font_color: template.text_color || '#ffffff',
        elements_json: JSON.stringify(template.elements_json || []),
        status: 'draft',
      });
      toast.success('Template loaded! Opening editor...');
      navigate(`/greeting-cards/create/${res.data.id}`);
    } catch {
      toast.error('Could not initialize template editor');
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      await cardsAPI.favorite(id);
      setFavorites((prev) =>
        prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
      );
      toast.success('Template preference updated');
    } catch {
      toast.error('Failed to register template preference');
    }
  };

  // Group templates by occasion for the gallery view.
  const grouped = useMemo(() => {
    const map = new Map<string, CardTemplate[]>();
    templates.forEach((tpl) => {
      const list = map.get(tpl.occasion) || [];
      list.push(tpl);
      map.set(tpl.occasion, list);
    });
    return OCCASION_GROUPS
      .filter((g) => map.has(g.key))
      .map((g) => ({ ...g, items: map.get(g.key)! }));
  }, [templates]);

  const totalShown = grouped.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="p-6 bg-[#0B0F19] min-h-screen text-slate-100 space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Greeting Card Templates
          </h1>
          <p className="text-xs text-slate-400">
            Choose from professionally designed templates to generate your wishes in seconds
          </p>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col lg:flex-row gap-3 items-center bg-[#131926]/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2 bg-[#1A2234] border border-slate-700/50 rounded-xl px-3 py-2 flex-1 w-full">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent border-none text-xs text-white outline-none w-full"
          />
        </div>

        <select
          value={selectedOccasion}
          onChange={(e) => { setSelectedOccasion(e.target.value); setPage(1); }}
          className="bg-[#1A2234] border border-slate-700/50 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all w-full lg:w-auto"
        >
          <option value="">All Occasions</option>
          {occasions.map((o, i) => (
            <option key={`${o}-${i}`} value={o}>{o}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          className="bg-[#1A2234] border border-slate-700/50 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all w-full lg:w-auto"
        >
          <option value="">All Styles</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select
          value={premiumFilter}
          onChange={(e) => { setPremiumFilter(e.target.value as any); setPage(1); }}
          className="bg-[#1A2234] border border-slate-700/50 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all w-full lg:w-auto"
        >
          <option value="all">Free &amp; Premium</option>
          <option value="free">Free Only</option>
          <option value="premium">Premium Only</option>
        </select>

        <button
          type="button"
          onClick={() => { setFeaturedOnly((v) => !v); setPage(1); }}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all w-full lg:w-auto justify-center ${
            featuredOnly
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-[#1A2234] border-slate-700/50 text-slate-300 hover:border-indigo-500'
          }`}
        >
          <Star size={12} /> Featured
        </button>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
          className="bg-[#1A2234] border border-slate-700/50 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all w-full lg:w-auto"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest First</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-[#131926]/40 rounded-2xl h-[340px] border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-[#131926]/40">
          <AlertTriangle size={48} className="mb-4 text-amber-500" />
          <h3 className="text-white font-semibold mb-1 text-sm">Something went wrong</h3>
          <p className="text-xs max-w-xs text-center mb-4">{error}</p>
          <button
            onClick={() => fetchTemplates()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-[#131926]/40">
          <SlidersHorizontal size={48} className="mb-4 text-slate-600" />
          <h3 className="text-white font-semibold mb-1 text-sm">No Templates Found</h3>
          <p className="text-xs max-w-xs text-center">Try widening your filters to show all card designs</p>
        </div>
      ) : (
        <div className="space-y-10">
          {selectedOccasion || selectedCategory || premiumFilter !== 'all' || featuredOnly || search ? (
            // Filtered flat view
            <TemplateGrid
              templates={templates}
              onUseTemplate={handleUseTemplate}
              onPreviewTemplate={(tpl) => setPreviewingTemplate(tpl)}
              onToggleFavorite={handleToggleFavorite}
              favorites={favorites}
            />
          ) : (
            // Grouped-by-occasion gallery
            grouped.map((group) => (
              <section key={group.key} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{group.emoji}</span>
                  <h2 className="text-lg font-bold text-white">{group.label}</h2>
                  <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">
                    {group.items.length}
                  </span>
                </div>
                <TemplateGrid
                  templates={group.items}
                  onUseTemplate={handleUseTemplate}
                  onPreviewTemplate={(tpl) => setPreviewingTemplate(tpl)}
                  onToggleFavorite={handleToggleFavorite}
                  favorites={favorites}
                />
              </section>
            ))
          )}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>Showing {totalShown} template{totalShown === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl bg-[#1A2234] border border-slate-700/50 disabled:opacity-40 hover:border-indigo-500 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <span>Page {page}</span>
              <button
                disabled={templates.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-xl bg-[#1A2234] border border-slate-700/50 disabled:opacity-40 hover:border-indigo-500 transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Preview Modal overlay */}
      <AnimatePresence>
        {previewingTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setPreviewingTemplate(null)}
          >
            <div
              className="bg-[#0F1422] border border-slate-800/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewingTemplate(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 hover:bg-slate-950 text-slate-400 hover:text-white border border-slate-850 z-20"
              >
                <X size={16} />
              </button>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Quick Card Preview
                  </h3>
                </div>

                <div className="flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
                  <LivePreview
                    cardData={{
                      title: previewingTemplate.title,
                      occasion: previewingTemplate.occasion,
                      recipient_name: 'Recipient Name',
                      card_size: 'instagram_square',
                      card_theme: 'dark',
                      card_width: previewingTemplate.card_width || 500,
                      card_height: previewingTemplate.card_height || 500,
                      background_color: previewingTemplate.background_color,
                      background_image: previewingTemplate.background_image_url || undefined,
                      font_family: previewingTemplate.font_family || 'Inter',
                      font_size: previewingTemplate.font_size || 16,
                      text_color: previewingTemplate.text_color || '#ffffff',
                      elements_json: previewingTemplate.elements_json,
                      status: 'draft',
                      personal_message: 'May your day be filled with warm smiles, loving laughter, and beautiful memories.',
                    }}
                  />
                </div>

                <div className="flex justify-between items-center bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                  <div>
                    <h4 className="text-white text-xs font-bold">{previewingTemplate.title}</h4>
                    <p className="text-[10px] text-slate-400">{previewingTemplate.occasion}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleUseTemplate(previewingTemplate);
                      setPreviewingTemplate(null);
                    }}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-650/15"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

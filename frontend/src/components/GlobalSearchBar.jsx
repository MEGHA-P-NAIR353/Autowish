import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Loader2, Users, Calendar, Clock,
  Palette, ArrowRight, AlertCircle, CornerDownLeft, Sparkles, Filter
} from 'lucide-react';
import { searchAPI } from '../services/api';

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'scheduled_wishes', label: 'Wishes', icon: Clock },
  { id: 'greeting_cards', label: 'Cards', icon: Palette },
];

const CATEGORY_COLORS = {
  contacts: {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    iconBg: 'bg-blue-500/10 text-blue-400',
    dot: 'bg-blue-400',
  },
  events: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-400',
  },
  scheduled_wishes: {
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    iconBg: 'bg-purple-500/10 text-purple-400',
    dot: 'bg-purple-400',
  },
  greeting_cards: {
    badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    iconBg: 'bg-pink-500/10 text-pink-400',
    dot: 'bg-pink-400',
  },
};

export default function GlobalSearchBar({ className = '' }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    results: [],
    grouped: {
      contacts: [],
      events: [],
      scheduled_wishes: [],
      greeting_cards: [],
    },
    counts: {
      total: 0,
      contacts: 0,
      events: 0,
      scheduled_wishes: 0,
      greeting_cards: 0,
    },
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const listRef = useRef(null);
  const abortControllerRef = useRef(null);
  const navigate = useNavigate();

  // Detect OS for shortcut hint (Cmd vs Ctrl)
  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }, []);

  // Filter results based on selected category tab
  const displayedResults = useMemo(() => {
    if (selectedCategory === 'all') {
      return data.results || [];
    }
    return data.grouped?.[selectedCategory] || [];
  }, [data, selectedCategory]);

  // Execute Search API call
  const executeSearch = useCallback(async (searchQuery, categoryFilter) => {
    const trimmed = (searchQuery || '').trim();
    if (!trimmed) {
      setData({
        results: [],
        grouped: { contacts: [], events: [], scheduled_wishes: [], greeting_cards: [] },
        counts: { total: 0, contacts: 0, events: 0, scheduled_wishes: 0, greeting_cards: 0 },
      });
      setLoading(false);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const res = await searchAPI.search(
        trimmed,
        { category: categoryFilter, limit: 6 },
        abortControllerRef.current.signal
      );
      setData(res.data);
      setActiveIndex(-1);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        // Request was intentionally cancelled due to new keystroke
        return;
      }
      console.error('Global search error:', err);
      setError(err?.response?.data?.error || 'Failed to search across AutoWish AI. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setData({
        results: [],
        grouped: { contacts: [], events: [], scheduled_wishes: [], greeting_cards: [] },
        counts: { total: 0, contacts: 0, events: 0, scheduled_wishes: 0, greeting_cards: 0 },
      });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      executeSearch(query, selectedCategory);
    }, 280);

    return () => clearTimeout(timer);
  }, [query, selectedCategory, executeSearch]);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileExpanded(true);
          setTimeout(() => mobileInputRef.current?.focus(), 80);
        } else {
          inputRef.current?.focus();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure active element scrolls into view during keyboard navigation
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-search-idx="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  const handleSelectResult = useCallback((item) => {
    if (!item || !item.url) return;
    setIsOpen(false);
    setMobileExpanded(false);
    navigate(item.url);
  }, [navigate]);

  // Keyboard navigation inside search input
  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setMobileExpanded(false);
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      return;
    }

    if (!displayedResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= displayedResults.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? displayedResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < displayedResults.length) {
        handleSelectResult(displayedResults[activeIndex]);
      } else if (displayedResults.length > 0) {
        handleSelectResult(displayedResults[0]);
      }
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'contacts':
        return <Users size={16} className="text-blue-400" />;
      case 'events':
        return <Calendar size={16} className="text-emerald-400" />;
      case 'scheduled_wishes':
        return <Clock size={16} className="text-purple-400" />;
      case 'greeting_cards':
        return <Palette size={16} className="text-pink-400" />;
      default:
        return <Search size={16} className="text-slate-400" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Desktop & Tablet Search Bar ───────────────────────────────── */}
      <div className="hidden md:flex relative items-center w-72 lg:w-96">
        <Search
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
            isOpen ? 'text-indigo-400' : 'text-slate-400'
          }`}
          size={16}
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="global-search-results"
          aria-label="Search contacts, events, scheduled wishes, greeting cards"
          placeholder="Search contacts, events, cards..."
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="glass-input pl-10 pr-20 py-2 text-sm !rounded-xl w-full transition-all focus:ring-2 focus:ring-indigo-500/40"
        />

        {/* Right side controls (Spinner, Clear button, Keyboard shortcut hint) */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
          {loading ? (
            <Loader2 size={15} className="animate-spin text-indigo-400" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setData({
                  results: [],
                  grouped: { contacts: [], events: [], scheduled_wishes: [], greeting_cards: [] },
                  counts: { total: 0, contacts: 0, events: 0, scheduled_wishes: 0, greeting_cards: 0 },
                });
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-raised/70 border border-line-soft rounded shadow-sm">
              <span>{isMac ? '⌘' : 'Ctrl'}</span>
              <span>K</span>
            </kbd>
          )}
        </div>
      </div>

      {/* ── Mobile Search Toggle Button ───────────────────────────────── */}
      <button
        type="button"
        onClick={() => {
          setMobileExpanded(true);
          setIsOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 80);
        }}
        className="md:hidden w-10 h-10 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-fg hover:bg-raised/70 transition-colors"
        aria-label="Open search"
      >
        <Search size={19} />
      </button>

      {/* ── Mobile Search Overlay / Modal ──────────────────────────────── */}
      {mobileExpanded && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                placeholder="Search AutoWish AI..."
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="glass-input pl-10 pr-10 py-2.5 text-sm !rounded-xl w-full"
              />
              {loading ? (
                <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileExpanded(false);
                setIsOpen(false);
              }}
              className="p-2.5 text-sm font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {/* Category Tabs for Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-2">
            {CATEGORY_TABS.map((tab) => {
              const count = tab.id === 'all' ? data.counts.total : data.counts[tab.id] || 0;
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-raised/60 text-slate-400 hover:text-fg'
                  }`}
                >
                  {tab.icon && <tab.icon size={13} />}
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface text-slate-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Search Results */}
          <div className="flex-1 overflow-y-auto rounded-xl bg-surface/90 border border-line-soft divide-y divide-line-soft">
            {renderResultsContent()}
          </div>
        </div>
      )}

      {/* ── Desktop Dropdown ──────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="global-search-results"
          className="hidden md:block absolute left-0 right-0 sm:left-auto sm:right-auto sm:w-[500px] lg:w-[540px] top-full mt-2 rounded-2xl glass-panel border border-line-soft shadow-2xl bg-surface/95 backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header with Category Filter Tabs */}
          <div className="p-2.5 border-b border-line-soft bg-raised/40 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1">
              {CATEGORY_TABS.map((tab) => {
                const count = tab.id === 'all' ? data.counts.total : data.counts[tab.id] || 0;
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(tab.id);
                      setActiveIndex(-1);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-fg hover:bg-raised/70'
                    }`}
                  >
                    {tab.icon && <tab.icon size={12} />}
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/25 text-white' : 'bg-surface text-slate-400 border border-line-soft'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {data.counts.total > 0 && (
              <span className="text-[11px] text-slate-400 px-2 font-medium shrink-0">
                {displayedResults.length} {displayedResults.length === 1 ? 'match' : 'matches'}
              </span>
            )}
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="max-h-[380px] overflow-y-auto divide-y divide-line-soft p-1.5 scrollbar-thin scrollbar-thumb-slate-700"
          >
            {renderResultsContent()}
          </div>

          {/* Footer with Keyboard Hints */}
          <div className="px-3.5 py-2 border-t border-line-soft bg-inset/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-raised border border-line-soft text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-raised border border-line-soft text-[10px]">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-raised border border-line-soft text-[10px]">↵</kbd>
                <span>Open</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-raised border border-line-soft text-[10px]">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
            <span className="text-slate-500 font-medium">Real-time Search</span>
          </div>
        </div>
      )}
    </div>
  );

  function renderResultsContent() {
    // 1. Loading State
    if (loading && !displayedResults.length) {
      return (
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
          <Loader2 size={24} className="animate-spin text-indigo-400 mb-2" />
          <p className="text-xs text-slate-400">Searching contacts, events, wishes, and cards...</p>
        </div>
      );
    }

    // 2. Error State
    if (error) {
      return (
        <div className="py-6 px-4 text-center">
          <AlertCircle size={24} className="text-rose-400 mx-auto mb-2" />
          <p className="text-xs text-rose-400 font-medium mb-2">{error}</p>
          <button
            type="button"
            onClick={() => executeSearch(query, selectedCategory)}
            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-semibold transition-colors"
          >
            Retry Search
          </button>
        </div>
      );
    }

    // 3. Prompt / Initial Empty State
    if (!query.trim()) {
      return (
        <div className="py-6 px-4 text-center">
          <Sparkles size={24} className="text-indigo-400/80 mx-auto mb-2" />
          <h4 className="text-xs font-semibold text-fg mb-1">Universal AutoWish Search</h4>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Type anything to search contacts, upcoming events, scheduled wishes, or greeting cards.
          </p>
        </div>
      );
    }

    // 4. No Results Found State
    if (!displayedResults.length) {
      return (
        <div className="py-8 px-4 text-center">
          <Search size={24} className="text-slate-500 mx-auto mb-2" />
          <h4 className="text-xs font-semibold text-fg mb-1">No results for &ldquo;{query}&rdquo;</h4>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            {selectedCategory !== 'all'
              ? `No matches in ${CATEGORY_TABS.find((t) => t.id === selectedCategory)?.label}. Try switching to "All".`
              : 'Try searching by contact name, email, event title, occasion, or card topic.'}
          </p>
        </div>
      );
    }

    // 5. Render Result List
    return (
      <div className="space-y-0.5">
        {displayedResults.map((item, idx) => {
          const isSelected = idx === activeIndex;
          const styling = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.contacts;

          return (
            <div
              key={`${item.category}-${item.id}-${idx}`}
              data-search-idx={idx}
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelectResult(item)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-raised border border-line-soft text-fg shadow-sm'
                  : 'hover:bg-raised/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Category Icon or Card Thumbnail */}
                {item.preview_image_url ? (
                  <img
                    src={item.preview_image_url}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover border border-line-soft shrink-0"
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-line-soft ${styling.iconBg}`}>
                    {getCategoryIcon(item.category)}
                  </div>
                )}

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-fg truncate">
                      {item.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border shrink-0 ${styling.badge}`}>
                      {item.category_label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              {/* Action arrow indicator */}
              <div className={`shrink-0 transition-transform ${isSelected ? 'translate-x-0.5 text-indigo-400' : 'text-slate-500 opacity-60'}`}>
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

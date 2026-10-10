import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Download,
  Search, Filter, User, Heart, Cake, Gift, Sparkles, Clock, CheckCircle2,
  AlertCircle, RefreshCw, ExternalLink, CalendarDays, List, X, Mail,
  Phone, Tag, Info, AlertTriangle, ArrowRight, Share2
} from 'lucide-react';
import { eventsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  GlassCard,
  GlassModal,
  GlassButton,
  PageHeader,
  StatusBadge,
} from '../components/ui';

// ─── Constants & Metadata ───────────────────────────────────────────────────

const CATEGORIES = ['All', 'Birthday', 'Anniversary', 'Festival', 'Holiday', 'Custom'];

const CATEGORY_STYLES = {
  Birthday: {
    label: 'Birthday',
    color: '#3B82F6',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    icon: Cake,
    emoji: '🎂',
  },
  Anniversary: {
    label: 'Anniversary',
    color: '#EC4899',
    badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    dot: 'bg-pink-400',
    icon: Heart,
    emoji: '💍',
  },
  Festival: {
    label: 'Festival',
    color: '#F59E0B',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    icon: Sparkles,
    emoji: '🎉',
  },
  Holiday: {
    label: 'Holiday',
    color: '#10B981',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: Gift,
    emoji: '🌟',
  },
  Custom: {
    label: 'Custom',
    color: '#8B5CF6',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400',
    icon: Tag,
    emoji: '✨',
  },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ─── Helper Functions ────────────────────────────────────────────────────────

const formatISODate = (year, month, day) => {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const parseDateParts = (isoStr) => {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  return { year: y, month: m, day: d };
};

const formatReadableDate = (isoStr) => {
  if (!isoStr) return '';
  const parts = parseDateParts(isoStr);
  if (!parts) return isoStr;
  const d = new Date(parts.year, parts.month - 1, parts.day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRelativeTiming = (isoStr, todayIso) => {
  if (!isoStr || !todayIso) return '';
  if (isoStr === todayIso) return 'Today';
  const pEvent = parseDateParts(isoStr);
  const pToday = parseDateParts(todayIso);
  const tEvent = new Date(pEvent.year, pEvent.month - 1, pEvent.day).getTime();
  const tToday = new Date(pToday.year, pToday.month - 1, pToday.day).getTime();
  const diffDays = Math.round((tEvent - tToday) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const CalendarPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Current date state
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => formatISODate(today.getFullYear(), today.getMonth() + 1, today.getDate()), [today]);

  // Calendar view navigation
  const [currentYear, setCurrentYear] = useState(() => {
    const y = parseInt(searchParams.get('year'), 10);
    return !isNaN(y) && y >= 1900 && y <= 2100 ? y : today.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const m = parseInt(searchParams.get('month'), 10);
    return !isNaN(m) && m >= 1 && m <= 12 ? m : today.getMonth() + 1;
  });

  // Filters & display modes
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'agenda'

  // Data & loading states
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Selected event for details modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Day expansion modal for days with multiple events
  const [expandedDay, setExpandedDay] = useState(null);

  // Fetch calendar events from backend API
  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Calculate buffer for 6-week display window
      const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const startDow = firstDayOfMonth.getDay();
      const startDate = new Date(currentYear, currentMonth - 1, 1 - startDow);

      const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
      const endDow = lastDayOfMonth.getDay();
      const endDate = new Date(currentYear, currentMonth, 6 - endDow);

      const startIso = formatISODate(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
      const endIso = formatISODate(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate());

      const res = await eventsAPI.getCalendar({
        start: startIso,
        end: endIso,
        year: currentYear,
        month: currentMonth,
      });

      const loaded = res.data?.results || [];
      setEvents(loaded);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      setFetchError(err.response?.data?.detail || 'Unable to connect to calendar service. Please retry.');
      toast.error('Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  // Sync year and month to URL search params
  useEffect(() => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('year', String(currentYear));
      p.set('month', String(currentMonth));
      return p;
    }, { replace: true });
  }, [currentYear, currentMonth, setSearchParams]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Jump to today's date
  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Category event counts for the active view
  const categoryCounts = useMemo(() => {
    const counts = { All: events.length };
    CATEGORIES.slice(1).forEach(cat => {
      counts[cat] = events.filter(e => (e.type || 'Custom').toLowerCase() === cat.toLowerCase()).length;
    });
    return counts;
  }, [events]);

  // Filtered events based on category filter and search query
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchesType = selectedType === 'All' || (ev.type || 'Custom').toLowerCase() === selectedType.toLowerCase();
      if (!matchesType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (ev.title || '').toLowerCase().includes(q) ||
        (ev.recipient || '').toLowerCase().includes(q) ||
        (ev.type || '').toLowerCase().includes(q) ||
        (ev.notes || '').toLowerCase().includes(q)
      );
    });
  }, [events, selectedType, searchQuery]);

  // Group filtered events by date
  const eventsByDate = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach(ev => {
      if (!ev.date) return;
      if (!map.has(ev.date)) {
        map.set(ev.date, []);
      }
      map.get(ev.date).push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Build grid calendar days (standard 7 columns x 5-6 rows)
  const calendarGridDays = useMemo(() => {
    const days = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startDow = firstDayOfMonth.getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    // Days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      const iso = formatISODate(y, m, d);
      days.push({
        dayNumber: d,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatISODate(currentYear, currentMonth, d);
      days.push({
        dayNumber: d,
        iso,
        isCurrentMonth: true,
        isToday: iso === todayIso,
      });
    }

    // Days from next month to complete standard grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 12 ? 1 : currentMonth + 1;
      const y = currentMonth === 12 ? currentYear + 1 : currentYear;
      const iso = formatISODate(y, m, d);
      days.push({
        dayNumber: d,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayIso]);

  // Export visible calendar events to CSV
  const handleExportCSV = () => {
    if (!filteredEvents || filteredEvents.length === 0) {
      toast.error('No calendar events to export for this period.');
      return;
    }

    const headers = ['Title', 'Recipient', 'Category', 'Date', 'Source', 'Recurrence', 'Scheduled Wish'];
    const rows = filteredEvents.map(e => [
      e.title || '',
      e.recipient || '',
      e.type || 'Custom',
      e.date || '',
      e.source === 'contact' ? 'Contact Record' : e.source === 'event' ? 'Custom Event' : 'Public Holiday',
      e.recurring ? (e.recurring_type || 'Yearly') : 'One-time',
      e.scheduled_wish ? `${e.scheduled_wish.status} (${e.scheduled_wish.time || 'N/A'})` : 'None',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autowish_calendar_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredEvents.length} calendar events to CSV.`);
  };

  // Action: Navigate to Schedule Wish page with prefilled parameters
  const handleScheduleWish = (ev) => {
    if (!ev) return;
    const params = new URLSearchParams();
    params.set('new', 'true');
    if (ev.contact_id) params.set('contactId', String(ev.contact_id));
    if (ev.recipient && ev.recipient !== 'Everyone') params.set('recipient', ev.recipient);
    if (ev.type) params.set('occasion', ev.type);
    if (ev.date) params.set('date', ev.date);

    navigate(`/schedule?${params.toString()}`);
  };

  // Action: Navigate to Events or Contacts page for editing/viewing
  const handleViewManageRecord = (ev) => {
    if (!ev) return;
    if (ev.source === 'event') {
      navigate(`/events?search=${encodeURIComponent(ev.title || ev.recipient || '')}`);
    } else if (ev.source === 'contact') {
      navigate(`/contacts?search=${encodeURIComponent(ev.recipient || '')}`);
    } else {
      toast('Public holidays and festivals are shared occasions.', { icon: 'ℹ️' });
    }
  };

  // Action: Add event for a specific date or in general
  const handleAddEvent = (targetDateIso = '') => {
    const params = new URLSearchParams();
    params.set('create', 'true');
    if (targetDateIso) {
      params.set('date', targetDateIso);
    }
    navigate(`/events?${params.toString()}`);
  };

  // Render Category Badge
  const renderCategoryBadge = (type) => {
    const style = CATEGORY_STYLES[type] || CATEGORY_STYLES.Custom;
    const IconComponent = style.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.badge}`}>
        <IconComponent size={12} aria-hidden="true" />
        <span>{style.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Calendar"
        description="Visual overview of birthdays, anniversaries, festivals, holidays, and custom events."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <GlassButton
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleExportCSV}
              title="Export calendar events to CSV"
            >
              Export CSV
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => handleAddEvent('')}
              title="Create new event in Events page"
            >
              Add Event
            </GlassButton>
          </div>
        }
      />

      {/* Control Bar: Month Navigation, Today, View Switcher & Search */}
      <GlassCard className="p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Navigation & Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-raised/70 border border-line-soft p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-slate-400 hover:text-fg hover:bg-surface transition-colors"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-fg hover:bg-surface transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-slate-400 hover:text-fg hover:bg-surface transition-colors"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Current Month & Year Display */}
          <div className="flex items-center gap-2 ml-1">
            <h2 className="text-lg sm:text-xl font-bold text-fg tracking-tight min-w-[160px]">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h2>
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              aria-label="Select month"
              className="input py-1 px-2 text-xs h-8 bg-raised/50 border-line-soft rounded-lg font-medium"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              aria-label="Select year"
              className="input py-1 px-2 text-xs h-8 bg-raised/50 border-line-soft rounded-lg font-medium"
            >
              {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search occasions or names..."
              className="input pl-8 pr-3 py-1.5 text-xs w-full bg-raised/40 border-line-soft rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-fg"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="inline-flex p-1 rounded-xl bg-raised/70 border border-line-soft">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-surface text-fg shadow-sm border border-line-soft'
                  : 'text-slate-400 hover:text-fg'
              }`}
            >
              <CalendarDays size={14} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-surface text-fg shadow-sm border border-line-soft'
                  : 'text-slate-400 hover:text-fg'
              }`}
            >
              <List size={14} />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = selectedType === cat;
          const count = categoryCounts[cat] || 0;
          const style = cat === 'All' ? null : CATEGORY_STYLES[cat];

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedType(cat)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm font-semibold'
                  : 'bg-surface/70 border-line text-slate-400 hover:text-fg hover:bg-raised'
              }`}
            >
              {style && <span className={`w-2 h-2 rounded-full ${style.dot}`} />}
              <span>{cat}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-raised text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error Banner with Retry */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span className="text-xs font-medium">{fetchError}</span>
          </div>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={fetchCalendarEvents}
            leftIcon={<RefreshCw size={13} />}
          >
            Retry
          </GlassButton>
        </div>
      )}

      {/* Calendar Area */}
      {loading ? (
        <GlassCard className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {WEEKDAYS.map((w) => (
              <div key={w} className="h-6 bg-raised/40 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 min-h-[520px]">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[100px] bg-raised/20 border border-line-soft/40 rounded-xl p-2 animate-pulse flex flex-col justify-between">
                <div className="w-5 h-4 bg-raised/50 rounded" />
                <div className="space-y-1">
                  <div className="h-3.5 bg-raised/40 rounded w-3/4" />
                  <div className="h-3.5 bg-raised/30 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : viewMode === 'agenda' ? (
        /* Agenda / List View */
        <GlassCard className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line-soft pb-3">
            <h3 className="text-sm font-bold text-fg uppercase tracking-wider">
              Occasions in {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h3>
            <span className="text-xs text-subtle font-medium">
              {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarIcon size={36} className="mx-auto text-subtle mb-3 opacity-60" />
              <h4 className="text-fg font-semibold text-base mb-1">No events scheduled</h4>
              <p className="text-subtle text-xs max-w-sm mx-auto mb-4">
                No occasions match your filter criteria for this month. You can add new events or change the category filter.
              </p>
              <GlassButton
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => handleAddEvent('')}
              >
                Add Event
              </GlassButton>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEvents.map((ev) => {
                const style = CATEGORY_STYLES[ev.type] || CATEGORY_STYLES.Custom;
                const isToday = ev.date === todayIso;
                const timing = getRelativeTiming(ev.date, todayIso);

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="group p-3.5 rounded-xl bg-raised/40 hover:bg-raised/80 border border-line-soft hover:border-line-strong transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-line-soft flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[10px] font-bold text-subtle uppercase leading-none">
                          {MONTH_NAMES[parseInt(ev.date.split('-')[1], 10) - 1].slice(0, 3)}
                        </span>
                        <span className="text-sm font-extrabold text-fg leading-none mt-0.5">
                          {parseInt(ev.date.split('-')[2], 10)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-fg truncate">
                            {ev.title}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white">
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Recipient: <strong className="text-fg font-medium">{ev.recipient}</strong></span>
                          <span>·</span>
                          <span>{timing}</span>
                          {ev.age && <span>· Turning {ev.age}</span>}
                          {ev.anniversary_years && <span>· {ev.anniversary_years}th Anniversary</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                      {ev.scheduled_wish && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          <span>Wish Scheduled</span>
                        </span>
                      )}
                      {renderCategoryBadge(ev.type)}
                      <span className="text-slate-400 group-hover:text-fg transition-colors">
                        <ArrowRight size={15} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      ) : (
        /* Month Grid View */
        <GlassCard className="p-3 sm:p-5 overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {WEEKDAYS.map((weekday, idx) => (
              <div
                key={weekday}
                className={`py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-subtle' : 'text-slate-300'
                }`}
              >
                {weekday}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
            {calendarGridDays.map((dayObj) => {
              const dayEvents = eventsByDate.get(dayObj.iso) || [];
              const hasEvents = dayEvents.length > 0;
              const maxDisplay = 2;
              const overflowCount = dayEvents.length - maxDisplay;

              return (
                <div
                  key={dayObj.iso}
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatReadableDate(dayObj.iso)}, ${dayEvents.length} events`}
                  onClick={() => {
                    if (dayEvents.length === 1) {
                      setSelectedEvent(dayEvents[0]);
                    } else if (dayEvents.length > 1) {
                      setExpandedDay({ date: dayObj.iso, events: dayEvents });
                    } else {
                      handleAddEvent(dayObj.iso);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (dayEvents.length === 1) {
                        setSelectedEvent(dayEvents[0]);
                      } else if (dayEvents.length > 1) {
                        setExpandedDay({ date: dayObj.iso, events: dayEvents });
                      } else {
                        handleAddEvent(dayObj.iso);
                      }
                    }
                  }}
                  className={`min-h-[90px] sm:min-h-[120px] rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col justify-between transition-all outline-none border text-left group relative ${
                    dayObj.isCurrentMonth
                      ? 'bg-raised/30 hover:bg-raised/70 border-line-soft'
                      : 'bg-raised/10 border-transparent opacity-40 hover:opacity-70'
                  } ${
                    dayObj.isToday
                      ? 'ring-2 ring-indigo-500/80 bg-indigo-500/5 shadow-md shadow-indigo-500/10'
                      : ''
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-extrabold flex items-center justify-center rounded-lg ${
                        dayObj.isToday
                          ? 'w-6 h-6 sm:w-7 sm:h-7 bg-indigo-600 text-white shadow-sm'
                          : dayObj.isCurrentMonth
                          ? 'text-fg'
                          : 'text-subtle'
                      }`}
                    >
                      {dayObj.dayNumber}
                    </span>

                    {/* Quick Add indicator on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddEvent(dayObj.iso);
                      }}
                      title={`Add occasion on ${dayObj.iso}`}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-subtle hover:text-fg hover:bg-raised transition-all hidden sm:block"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Event Chips List */}
                  <div className="mt-1 space-y-1 flex-1">
                    {dayEvents.slice(0, maxDisplay).map((ev) => {
                      const style = CATEGORY_STYLES[ev.type] || CATEGORY_STYLES.Custom;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          title={`${ev.title} (${ev.type}) for ${ev.recipient}`}
                          className={`px-1.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-semibold border truncate flex items-center gap-1 transition-transform hover:scale-[1.02] cursor-pointer ${style.badge}`}
                        >
                          <span className="flex-shrink-0 text-xs leading-none">{style.emoji}</span>
                          <span className="truncate flex-1">{ev.recipient || ev.title}</span>
                          {ev.scheduled_wish && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Wish Scheduled" />
                          )}
                        </div>
                      );
                    })}

                    {/* Overflow Badge */}
                    {overflowCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDay({ date: dayObj.iso, events: dayEvents });
                        }}
                        className="w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                      >
                        +{overflowCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ─── Event Details Modal ────────────────────────────────────────────── */}
      <GlassModal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
        description={`Scheduled occasion for ${selectedEvent?.recipient || 'Recipient'}`}
        size="md"
      >
        {selectedEvent && (
          <div className="space-y-4">
            {/* Occasion & Timing Header */}
            <div className="p-3.5 rounded-xl bg-raised/50 border border-line-soft flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    backgroundColor: `${(CATEGORY_STYLES[selectedEvent.type] || CATEGORY_STYLES.Custom).color}20`,
                    border: `1px solid ${(CATEGORY_STYLES[selectedEvent.type] || CATEGORY_STYLES.Custom).color}40`,
                  }}
                >
                  {(CATEGORY_STYLES[selectedEvent.type] || CATEGORY_STYLES.Custom).emoji}
                </div>
                <div>
                  <h4 className="text-base font-bold text-fg">{selectedEvent.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatReadableDate(selectedEvent.date)} · <strong className="text-indigo-400 font-semibold">{getRelativeTiming(selectedEvent.date, todayIso)}</strong>
                  </p>
                </div>
              </div>
              <div>
                {renderCategoryBadge(selectedEvent.type)}
              </div>
            </div>

            {/* Recipient Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-line-soft space-y-1">
                <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Recipient</span>
                <span className="font-semibold text-fg text-sm block truncate">{selectedEvent.recipient}</span>
                {selectedEvent.relationship && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-raised text-slate-300 text-[11px] font-medium mt-1">
                    {selectedEvent.relationship}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-surface border border-line-soft space-y-1">
                <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Recurrence & Origin</span>
                <span className="font-semibold text-fg block">
                  {selectedEvent.recurring ? `Yearly occasion` : 'One-time event'}
                </span>
                <span className="text-subtle text-[11px] block">
                  Source: {selectedEvent.source === 'contact' ? 'Contact record' : selectedEvent.source === 'event' ? 'Custom event' : 'Public holiday'}
                </span>
              </div>
            </div>

            {/* Milestone or Age details */}
            {(selectedEvent.age || selectedEvent.anniversary_years) && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-2">
                <Sparkles size={14} className="flex-shrink-0" />
                <span>
                  {selectedEvent.age
                    ? `Milestone: Turning ${selectedEvent.age} years old on this birthday!`
                    : `Milestone: Celebrating ${selectedEvent.anniversary_years} years of anniversary!`}
                </span>
              </div>
            )}

            {/* Recipient Contact Details if available */}
            {(selectedEvent.recipient_email || selectedEvent.recipient_phone) && (
              <div className="p-3 rounded-xl bg-surface border border-line-soft space-y-2 text-xs">
                <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">Contact Channels</span>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedEvent.recipient_email && (
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <Mail size={13} className="text-subtle" />
                      {selectedEvent.recipient_email}
                    </span>
                  )}
                  {selectedEvent.recipient_phone && (
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <Phone size={13} className="text-subtle" />
                      {selectedEvent.recipient_phone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scheduled Wish Status Card */}
            <div className="p-3.5 rounded-xl border bg-raised/40 border-line-soft">
              <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1.5">AutoWish Delivery Status</span>
              {selectedEvent.scheduled_wish ? (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <div>
                      <span className="font-semibold text-fg">Wish Scheduled for {selectedEvent.scheduled_wish.time || '09:00'}</span>
                      <span className="text-subtle block text-[11px]">Channel: {selectedEvent.scheduled_wish.notification_type || 'Email'}</span>
                    </div>
                  </div>
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/schedule?id=${selectedEvent.scheduled_wish.id}`)}
                  >
                    View Schedule
                  </GlassButton>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 text-xs text-subtle">
                  <span>No automated wish scheduled yet for this occasion.</span>
                  <span className="text-[11px] text-indigo-400 font-medium">Ready to schedule</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-line-soft">
              <div>
                {selectedEvent.source !== 'public_holiday' && (
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    leftIcon={<ExternalLink size={13} />}
                    onClick={() => handleViewManageRecord(selectedEvent)}
                  >
                    {selectedEvent.source === 'event' ? 'View in Events' : 'View Contact'}
                  </GlassButton>
                )}
              </div>

              <div className="flex items-center gap-2">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="sm"
                  leftIcon={<Clock size={14} />}
                  onClick={() => handleScheduleWish(selectedEvent)}
                >
                  Schedule Wish
                </GlassButton>
              </div>
            </div>
          </div>
        )}
      </GlassModal>

      {/* ─── Day Events Overview Modal (for days with multiple events) ──────── */}
      <GlassModal
        isOpen={Boolean(expandedDay)}
        onClose={() => setExpandedDay(null)}
        title={expandedDay ? `Occasions on ${formatReadableDate(expandedDay.date)}` : 'Day Overview'}
        description={`${expandedDay?.events?.length || 0} occasions scheduled for this day`}
        size="md"
      >
        {expandedDay && (
          <div className="space-y-3">
            <div className="space-y-2">
              {expandedDay.events.map((ev) => {
                const style = CATEGORY_STYLES[ev.type] || CATEGORY_STYLES.Custom;
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setExpandedDay(null);
                      setSelectedEvent(ev);
                    }}
                    className="p-3 rounded-xl bg-raised/50 hover:bg-raised border border-line-soft hover:border-line-strong transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl leading-none flex-shrink-0">{style.emoji}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-fg block truncate">{ev.title}</span>
                        <span className="text-xs text-subtle block truncate">For: {ev.recipient}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {renderCategoryBadge(ev.type)}
                      <ArrowRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-line-soft">
              <GlassButton
                variant="secondary"
                size="sm"
                leftIcon={<Plus size={13} />}
                onClick={() => {
                  const target = expandedDay.date;
                  setExpandedDay(null);
                  handleAddEvent(target);
                }}
              >
                Add Another Event
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setExpandedDay(null)}
              >
                Close
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};

export default CalendarPage;

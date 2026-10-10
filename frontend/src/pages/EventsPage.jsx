import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import EmptyState from '../components/common/EmptyState';
import { Plus, Calendar, Trash2, RefreshCw, LayoutGrid, List, Download, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  GlassCard, GlassButton, GlassModal, GlassInput,
  GlassSelect, PageHeader, StatusBadge, SkeletonCards
} from '../components/ui';

const EventsPage = () => {
  const { events = [], addEvent, deleteEvent, contacts = [], loading = false, fetchAll } = useData();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [view, setView] = useState('card');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', type: 'Birthday', date: '', recipient: '', status: 'Upcoming'
  });
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }

    const isCreate = searchParams.get('create') === 'true' || searchParams.get('new') === 'true';
    if (isCreate) {
      const defaultDate = searchParams.get('date') || '';
      const defaultType = searchParams.get('type') || 'Birthday';
      const defaultRecipient = searchParams.get('recipient') || '';
      const defaultTitle = searchParams.get('title') || '';
      setFormData(prev => ({
        ...prev,
        title: defaultTitle,
        type: defaultType,
        date: defaultDate,
        recipient: defaultRecipient,
        status: 'Upcoming'
      }));
      setShowModal(true);
    }
  }, [searchParams]);

  const safeEvents = Array.isArray(events) ? events : [];
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const filteredEvents = safeEvents.filter(e => {
    const matchesType = filterType === 'All' || e?.type === filterType;
    const matchesSearch = !search ||
      (e?.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e?.recipient || '').toLowerCase().includes(search.toLowerCase()) ||
      (e?.type || '').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleAdd = () => {
    setFormData({ title: '', type: 'Birthday', date: '', recipient: '', status: 'Upcoming' });
    setShowModal(true);
  };

  const exportCSV = () => {
    if (!safeEvents || safeEvents.length === 0) {
      toast.error('No events to export');
      return;
    }
    const csv = [
      ['Title', 'Type', 'Date', 'Recipient', 'Status'],
      ...safeEvents.map(e => [
        e.title || '',
        e.type || '',
        e.date || '',
        e.recipient || '',
        e.status || ''
      ])
    ].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported events.csv');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.recipient) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      await addEvent(formData);
      toast.success('Event added successfully');
      setShowModal(false);
    } catch {
      toast.error('Failed to save event');
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Delete ${title || 'this event'}?`)) {
      try {
        await deleteEvent(id);
        toast.success('Event removed');
      } catch {
        toast.error('Failed to remove event');
      }
    }
  };

  const eventTypes = ['All', 'Birthday', 'Anniversary', 'Holiday', 'Festival'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Management"
        subtitle={`Track and organize special occasions (${safeEvents.length} total).`}
        icon={Calendar}
        actions={
          <div className="flex items-center gap-2.5">
            {fetchAll && (
              <GlassButton
                variant="secondary"
                size="sm"
                iconOnly
                onClick={() => fetchAll()}
                title="Refresh events"
                aria-label="Refresh events"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </GlassButton>
            )}
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={exportCSV}
              leftIcon={<Download size={14} />}
            >
              Export CSV
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleAdd}
              leftIcon={<Plus size={15} />}
            >
              Add Event
            </GlassButton>
          </div>
        }
      />

      {/* View Switcher & Filters */}
      <GlassCard className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Card / Table toggle */}
        <div className="inline-flex p-1 rounded-xl bg-raised/70 border border-line-soft">
          <button
            type="button"
            onClick={() => setView('card')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'card'
                ? 'bg-surface text-fg shadow-sm border border-line-soft'
                : 'text-slate-400 hover:text-fg'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Card View</span>
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'list'
                ? 'bg-surface text-fg shadow-sm border border-line-soft'
                : 'text-slate-400 hover:text-fg'
            }`}
          >
            <List size={14} />
            <span>Table View</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {eventTypes.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all border ${
                filterType === type
                  ? 'bg-indigo-600 text-white border-transparent shadow-sm shadow-indigo-600/20'
                  : 'bg-raised/40 border-line-soft text-slate-400 hover:text-fg hover:bg-raised'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Loading Skeleton */}
      {loading && safeEvents.length === 0 ? (
        <SkeletonCards count={6} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={filterType === 'All' ? 'No events scheduled yet' : `No ${filterType} events found`}
          description={filterType === 'All' ? 'Add your first event to start tracking birthdays, anniversaries, and holidays.' : `Try selecting another category or create a new ${filterType} event.`}
          actionLabel="Add Event"
          onAction={handleAdd}
        />
      ) : (
        <>
          {/* Card View */}
          {view === 'card' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEvents.map(event => (
                <GlassCard key={event.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        event.type === 'Birthday'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : event.type === 'Anniversary'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {event.type || 'Event'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 tabular-nums">{event.date}</span>
                    </div>

                    <h3 className="font-bold text-base text-fg truncate" title={event.title}>{event.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 truncate">For: {event.recipient}</p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-line-soft">
                    <StatusBadge status={event.status || 'Upcoming'} />
                    <button
                      type="button"
                      className="btn-ghost btn-icon p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                      onClick={() => handleDelete(event.id, event.title)}
                      title="Delete event"
                      aria-label={`Delete ${event.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Table View */}
          {view === 'list' && (
            <GlassCard className="overflow-hidden">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Recipient</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(event => (
                      <tr key={event.id} className="transition-colors">
                        <td className="font-semibold text-fg">{event.title}</td>
                        <td>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-raised text-slate-400 border border-line-soft">
                            {event.type}
                          </span>
                        </td>
                        <td className="text-sm text-slate-300 tabular-nums">{event.date}</td>
                        <td className="text-sm text-slate-300">{event.recipient}</td>
                        <td>
                          <StatusBadge status={event.status || 'Upcoming'} />
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(event.id, event.title)}
                            className="btn-ghost btn-icon p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                            title="Delete event"
                            aria-label={`Delete ${event.title}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* Add Event Modal */}
      <GlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Event"
        description="Schedule an upcoming celebration in your calendar."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <GlassInput
            label="Event Title"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. John's 30th Birthday"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassSelect
              label="Occasion Type"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option>Birthday</option>
              <option>Anniversary</option>
              <option>Holiday</option>
              <option>Festival</option>
              <option>Custom</option>
            </GlassSelect>

            <GlassInput
              label="Date"
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <GlassSelect
            label="Recipient"
            value={formData.recipient}
            onChange={e => setFormData({ ...formData, recipient: e.target.value })}
            required
          >
            <option value="">Select recipient...</option>
            {safeContacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="Team">Team</option>
          </GlassSelect>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-line-soft">
            <GlassButton variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" type="submit">
              Save Event
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};

export default EventsPage;

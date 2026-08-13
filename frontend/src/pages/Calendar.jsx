import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar as CalendarIcon, Plus, Filter, AlertCircle, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('All');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Birthday');
  const [newDate, setNewDate] = useState('');
  const [newRecipient, setNewRecipient] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('events/');
      const eventList = res.data.results || res.data || [];
      const formatted = eventList.map(ev => ({
        id: ev.id.toString(),
        title: `${ev.recipient} - ${ev.type}`,
        start: ev.date,
        allDay: true,
        backgroundColor: getEventColor(ev.type),
        borderColor: getEventColor(ev.type),
        extendedProps: { ...ev }
      }));
      setEvents(formatted);
      setFilteredEvents(formatted);
    } catch (err) {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedType === 'All') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(e => e.extendedProps.type === selectedType));
    }
  }, [selectedType, events]);

  const getEventColor = (type) => {
    switch (type) {
      case 'Birthday': return '#3B82F6'; // Blue
      case 'Anniversary': return '#EC4899'; // Pink
      case 'Holiday': return '#EF4444'; // Red
      case 'Festival': return '#F59E0B'; // Amber
      default: return '#8B5CF6'; // Purple
    }
  };

  const handleDateClick = (info) => {
    setNewDate(info.dateStr);
    setShowAddModal(true);
  };

  const handleEventClick = (info) => {
    const ev = info.event.extendedProps;
    toast.success(`Event: ${ev.title} (${ev.type}) for ${ev.recipient} on ${ev.date}`);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newTitle || !newRecipient || !newDate) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    try {
      await api.post('events/', {
        title: newTitle,
        type: newType,
        date: newDate,
        recipient: newRecipient,
        status: 'Upcoming',
        recurring: true
      });
      toast.success('Event scheduled successfully!');
      setShowAddModal(false);
      setNewTitle('');
      setNewRecipient('');
      fetchEvents();
    } catch (err) {
      toast.error('Failed to add event.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-slate-400 text-sm">Visualize all wishing occasions, holidays, and custom events.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-medium text-sm rounded-xl transition-all shadow-lg shadow-blue-500/10"
        >
          <Plus size={18} />
          Add Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-800/40 p-2 border border-slate-700/40 rounded-2xl w-fit">
        {['All', 'Birthday', 'Anniversary', 'Festival', 'Holiday', 'Custom'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedType === type
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Calendar Area */}
      <div className="bg-slate-800/25 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
          </div>
        ) : (
          <div className="fc-theme-custom text-white">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={filteredEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
              height="auto"
            />
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold">Schedule New Event</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm">Cancel</button>
            </div>
            
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">EVENT TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grandma's 80th birthday"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">CATEGORY</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                  >
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Festival">Festival</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">DATE</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">RECIPIENT NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mary Jane"
                  value={newRecipient}
                  onChange={e => setNewRecipient(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm"
              >
                Schedule Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;

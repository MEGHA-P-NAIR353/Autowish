import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import EmptyState from '../components/common/EmptyState';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EventsPage = () => {
  const { events, addEvent, deleteEvent, contacts } = useData();
  const [view, setView] = useState('card');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', type: 'Birthday', date: '', recipient: '', status: 'Upcoming'
  });
  const [filterType, setFilterType] = useState('All');

  const filteredEvents = events.filter(e => filterType === 'All' || e.type === filterType);

  const handleAdd = () => {
    setFormData({ title: '', type: 'Birthday', date: '', recipient: '', status: 'Upcoming' });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.recipient) {
      toast.error('Please fill required fields');
      return;
    }
    addEvent(formData);
    toast.success('Event added successfully');
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this event?')) {
      deleteEvent(id);
      toast.success('Event removed');
    }
  };

  const eventTypes = ['All', 'Birthday', 'Anniversary', 'Holiday', 'Festival'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Event Management</h1>
          <p className="text-[#94A3B8]">Manage birthdays, anniversaries, holidays and more</p>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Event
        </button>
      </div>

      {/* Tabs: Card / List View */}
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => setView('card')} 
          className={`tab px-6 ${view === 'card' ? 'tab-active' : 'bg-[#334155] text-[#CBD5E1]'}`}
        >
          Card View
        </button>
        <button 
          onClick={() => setView('list')} 
          className={`tab px-6 ${view === 'list' ? 'tab-active' : 'bg-[#334155] text-[#CBD5E1]'}`}
        >
          Event View
        </button>
        
        <div className="ml-auto flex gap-2">
          {eventTypes.map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1 text-xs rounded-full border transition ${filterType === type ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#475569] text-[#94A3B8]'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Card View */}
      {view === 'card' && (
        filteredEvents.length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} />}
            title={filterType === 'All' ? 'No events yet' : `No ${filterType} events`}
            description={filterType === 'All' ? 'Add your first event to start tracking birthdays, anniversaries, and more.' : `No events of type "${filterType}" found. Try a different filter or add a new event.`}
            action={{ label: 'Add Event', onClick: handleAdd }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEvents.map(event => (
              <div key={event.id} className="event-card">
                <div className="flex items-center justify-between mb-3">
                  <div className={`badge px-3 py-0.5 text-xs ${event.type === 'Birthday' ? 'bg-blue-500/20 text-blue-400' :
                    event.type === 'Anniversary' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {event.type}
                  </div>
                  <div className="text-xs text-[#64748B]">{event.date}</div>
                </div>

                <div className="font-semibold text-lg mb-1">{event.title}</div>
                <div className="text-sm text-[#94A3B8]">{event.recipient}</div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-[#334155]">
                  <div className="text-xs px-3 py-1 rounded-full bg-[#0F172A] border border-[#334155]">{event.status}</div>
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-[#334155] rounded-lg" onClick={() => handleDelete(event.id)}>
                      <Trash2 size={15} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* List / Event View */}
      {view === 'list' && (
        filteredEvents.length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} />}
            title={filterType === 'All' ? 'No events yet' : `No ${filterType} events`}
            description={filterType === 'All' ? 'Add your first event to start tracking birthdays, anniversaries, and more.' : `No events of type "${filterType}" found.`}
            action={{ label: 'Add Event', onClick: handleAdd }}
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-[#1E293B]/40">
                    <td className="font-medium">{event.title}</td>
                    <td><span className="badge bg-[#334155] px-2.5">{event.type}</span></td>
                    <td className="text-sm">{event.date}</td>
                    <td>{event.recipient}</td>
                    <td><span className="text-emerald-400 text-xs font-medium">{event.status}</span></td>
                    <td className="text-right">
                      <button onClick={() => handleDelete(event.id)} className="p-2 text-red-400 hover:bg-[#334155] rounded-md"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Add Event Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Event">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#94A3B8]">Event Title</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input" placeholder="e.g. Annual Team Celebration" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#94A3B8]">Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input">
                <option>Birthday</option>
                <option>Anniversary</option>
                <option>Holiday</option>
                <option>Festival</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8]">Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input" required />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8]">Recipient</label>
            <select value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})} className="input">
              <option value="">Select recipient</option>
              {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Team">Team</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Event</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EventsPage;

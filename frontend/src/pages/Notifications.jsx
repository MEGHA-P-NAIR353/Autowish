import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, CheckCircle2, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { 
    notifications, 
    notificationsLoading, 
    markNotificationRead, 
    markAllNotificationsRead, 
    deleteNotification
  } = useData();
  const [filter, setFilter] = useState('All');

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      toast.success('Notification marked as read.');
    } catch (err) {
      toast.error('Failed to update notification.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error('Failed to mark all as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      toast.success('Notification removed.');
    } catch (err) {
      toast.error('Failed to delete notification.');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'email': return <Mail size={16} className="text-blue-400" />;
      case 'sms': return <MessageSquare size={16} className="text-amber-400" />;
      case 'whatsapp': return <CheckCircle2 size={16} className="text-emerald-400" />;
      default: return <Bell size={16} className="text-purple-400" />;
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.is_read;
    return n.type === filter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-slate-400 text-sm">System notifications, activity history, and delivery alerts.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-700/50"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', 'Unread', 'System', 'Email', 'SMS', 'WhatsApp'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              filter === tab
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-800/10 text-slate-400 border-transparent hover:text-white hover:bg-slate-800/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List Container */}
      <div className="bg-slate-850 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        {notificationsLoading ? (
          <div className="h-48 flex items-center justify-center">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-slate-800/40 rounded-full flex items-center justify-center border border-slate-700/50">
              <BellOff size={20} className="text-slate-500" />
            </div>
            <p className="text-sm font-medium">All clear! No notifications found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filtered.map(n => (
              <div 
                key={n.id} 
                className={`py-4 flex gap-4 items-start transition-all ${
                  !n.is_read ? 'bg-blue-500/[0.02] -mx-4 px-4 rounded-xl' : ''
                }`}
              >
                <div className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className={`text-sm font-bold ${!n.is_read ? 'text-white' : 'text-slate-200'}`}>{n.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                      <span className="text-[10px] text-slate-500 mt-2 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20 transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-[10px] font-bold rounded-lg border border-slate-700/50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
import React, { useState } from 'react';
import { Bell, BellOff, Mail, CheckCircle2, MessageSquare, CheckCheck, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';
import {
  GlassCard, GlassButton, PageHeader, StatusBadge, SkeletonRows
} from '../components/ui';
import EmptyState from '../components/common/EmptyState';

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
    } catch {
      toast.error('Failed to update notification.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Failed to mark all as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      toast.success('Notification removed.');
    } catch {
      toast.error('Failed to delete notification.');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail size={16} className="text-blue-400" />;
      case 'sms':
        return <MessageSquare size={16} className="text-amber-400" />;
      case 'whatsapp':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      default:
        return <Bell size={16} className="text-purple-400" />;
    }
  };

  const filtered = (notifications || []).filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.is_read;
    return n.type === filter.toLowerCase();
  });

  const unreadCount = (notifications || []).filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="System alerts, automated delivery reports, and important account activity."
        icon={Bell}
        actions={
          unreadCount > 0 && (
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<CheckCheck size={15} />}
            >
              Mark all read ({unreadCount})
            </GlassButton>
          )
        }
      />

      {/* Tabs */}
      <GlassCard className="p-2 sm:p-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {['All', 'Unread', 'System', 'Email', 'SMS', 'WhatsApp'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                filter === tab
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-fg hover:bg-raised/70'
              }`}
            >
              {tab}
              {tab === 'Unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Notification List Container */}
      <GlassCard className="p-4 sm:p-6">
        {notificationsLoading ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="All clear! No notifications"
            description={filter === 'All' ? 'You have no system notifications at this time.' : `No notifications matching the "${filter}" filter.`}
          />
        ) : (
          <div className="divide-y divide-line-soft">
            {filtered.map(n => (
              <div 
                key={n.id} 
                className={`py-4 px-3 sm:px-4 rounded-xl flex gap-4 items-start transition-all ${
                  !n.is_read ? 'bg-indigo-500/[0.04] border border-indigo-500/15 my-1' : 'hover:bg-raised/30'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-raised border border-line-soft flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  {getIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-bold ${!n.is_read ? 'text-fg' : 'text-slate-300'}`}>
                          {n.title}
                        </h3>
                        {n.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {n.category}
                          </span>
                        )}
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" aria-label="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                      <time className="text-[11px] text-slate-500 mt-2 block font-medium">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </time>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-lg border border-indigo-500/20 transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Notifications;
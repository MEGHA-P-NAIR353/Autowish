import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, CheckCircle2, Mail, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';

const TYPE_ICON = {
  email: { Icon: Mail, tone: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  sms: { Icon: MessageSquare, tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  whatsapp: { Icon: CheckCircle2, tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  default: { Icon: Bell, tone: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
};

const relTime = (iso) => {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return ''; }
};

/**
 * Glass notification dropdown anchored to the header bell.
 * Data and actions come from the existing DataContext (no new API calls).
 * Keyboard: Enter/Space toggles, Esc closes, ArrowUp/Down moves between items.
 */
const NotificationPanel = () => {
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useData();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus();
  }, []);

  // Outside click + Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) close(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);

  // Move focus to first item when opened via keyboard
  useEffect(() => {
    if (open) requestAnimationFrame(() => panelRef.current?.querySelector('[data-nitem]')?.focus?.({ preventScroll: true }));
  }, [open]);

  const onListKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = Array.from(panelRef.current?.querySelectorAll('[data-nitem]') || []);
    if (!items.length) return;
    e.preventDefault();
    const idx = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
    items[next].focus();
  };

  const handleRead = async (n) => {
    if (n.is_read) return;
    try { await markNotificationRead(n.id); } catch { toast.error('Failed to update notification.'); }
  };

  const handleReadAll = async () => {
    try { await markAllNotificationsRead(); toast.success('All notifications marked as read.'); }
    catch { toast.error('Failed to mark all as read.'); }
  };

  const recent = (notifications || []).slice(0, 6);
  const countLabel = unreadNotificationCount > 99 ? '99+' : unreadNotificationCount;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadNotificationCount > 0 ? `Notifications, ${unreadNotificationCount} unread` : 'Notifications'}
        className="relative w-10 h-10 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-fg hover:bg-raised/70 border border-transparent hover:border-line-soft transition-colors"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadNotificationCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 bg-rose-500 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] flex items-center justify-center text-white font-bold ring-2 ring-app">
            {countLabel}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="glass-dropdown absolute right-0 mt-2 w-[min(92vw,380px)] z-50 overflow-hidden"
            onKeyDown={onListKeyDown}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-fg">Notifications</h2>
                {unreadNotificationCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">{unreadNotificationCount} new</span>
                )}
              </div>
              {unreadNotificationCount > 0 && (
                <button type="button" onClick={handleReadAll} className="btn-ghost btn-sm !px-2 text-indigo-400">
                  <CheckCheck size={13} aria-hidden="true" /> Mark all read
                </button>
              )}
            </div>

            <ul className="max-h-[360px] overflow-y-auto py-1" role="list">
              {recent.length === 0 ? (
                <li className="px-6 py-10 text-center text-slate-500 flex flex-col items-center gap-2">
                  <span className="w-11 h-11 rounded-2xl bg-raised/60 border border-line-soft flex items-center justify-center"><BellOff size={18} aria-hidden="true" /></span>
                  <span className="text-sm font-medium text-slate-400">You're all caught up</span>
                  <span className="text-xs">New notifications will show up here.</span>
                </li>
              ) : recent.map((n) => {
                const { Icon, tone } = TYPE_ICON[n.type] || TYPE_ICON.default;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      data-nitem
                      onClick={() => handleRead(n)}
                      className={`w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-fg/[0.05] focus-visible:bg-fg/[0.05] ${!n.is_read ? 'bg-indigo-500/[0.05]' : ''}`}
                    >
                      <span className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${tone}`}><Icon size={15} aria-hidden="true" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-[13px] leading-snug ${!n.is_read ? 'font-semibold text-fg' : 'font-medium text-slate-300'}`}>{n.title}</span>
                          {!n.is_read && (
                            <>
                              <span aria-hidden="true" className="mt-1.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_0_3px] shadow-indigo-400/20" />
                              <span className="sr-only">Unread</span>
                            </>
                          )}
                        </span>
                        {n.message && <span className="block text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</span>}
                        <time dateTime={n.created_at} className="block text-[11px] text-slate-500 mt-1">{relTime(n.created_at)}</time>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-line-soft p-2">
              <Link
                to="/notifications"
                data-nitem
                onClick={() => close(false)}
                className="block text-center text-xs font-semibold text-indigo-400 hover:bg-fg/[0.05] rounded-xl py-2 transition-colors"
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationPanel;

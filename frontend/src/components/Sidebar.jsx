import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, Sparkles, Clock,
  Mail, Settings, BarChart3, LogOut, FileText, Bell, CreditCard,
  HelpCircle, Shield, UserCheck, Terminal, Heart,
  CreditCard as CardIcon, PlusSquare, BookTemplate, Archive, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './common/Avatar';

const SCROLL_KEY = 'autowish-sidebar-scroll';

const NavItem = ({ item, size = 15, tone = 'primary', end, onNavigate, pillId }) => (
  <NavLink
    to={item.to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 px-3.5 py-2 mb-0.5 rounded-xl text-[13px] font-medium transition-colors duration-200 ${
        isActive ? 'text-fg' : 'text-slate-400 hover:text-fg hover:bg-fg/[0.045]'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.span
            layoutId={pillId}
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={`absolute inset-0 rounded-xl border ${
              tone === 'danger'
                ? 'bg-gradient-to-r from-rose-500/15 via-rose-500/[0.06] to-transparent border-rose-500/25'
                : 'bg-gradient-to-r from-indigo-500/[0.17] via-violet-500/[0.07] to-transparent border-indigo-500/25'
            }`}
          />
        )}
        {isActive && (
          <span
            aria-hidden="true"
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full ${tone === 'danger' ? 'bg-rose-400' : 'bg-gradient-to-b from-blue-400 to-violet-500'}`}
          />
        )}
        <item.icon
          size={size}
          aria-hidden="true"
          className={`relative shrink-0 transition-colors ${isActive ? (tone === 'danger' ? 'text-rose-400' : 'text-indigo-400') : 'text-slate-500 group-hover:text-slate-300'}`}
        />
        <span className="relative truncate">{item.label}</span>
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ children, danger }) => (
  <div className={`text-[10px] font-bold px-3.5 mb-2 tracking-[0.14em] uppercase ${danger ? 'text-rose-400/90' : 'text-slate-500'}`}>
    {children}
  </div>
);

const Sidebar = ({ mobile = false, onNavigate }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.profile?.role === 'admin' || user?.profile?.role === 'super_admin' || user?.is_staff || user?.is_superuser;
  const inCards = location.pathname.startsWith('/greeting-cards');
  const [cardsOpen, setCardsOpen] = useState(inCards);
  const scrollRef = useRef(null);

  // Keep the Greeting Cards group open while browsing inside it
  useEffect(() => { if (inCards) setCardsOpen(true); }, [inCards]);

  // Persist sidebar scroll position across route changes (layout remounts per route)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    try { el.scrollTop = Number(sessionStorage.getItem(SCROLL_KEY)) || 0; } catch { /* ignore */ }
    const onScroll = () => { try { sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop)); } catch { /* ignore */ } };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const menuItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/contacts', icon: Users, label: 'Contacts' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/calendar', icon: Calendar, label: 'Calendar View' },
    { to: '/ai-greeting', icon: Sparkles, label: 'AI Generator' },
    { to: '/schedule', icon: Clock, label: 'Schedule Wish' },
    { to: '/templates', icon: Heart, label: 'Templates' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/email-logs', icon: Mail, label: 'Email Logs' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ];

  const cardSubItems = [
    { to: '/greeting-cards', icon: CardIcon, label: 'My Cards' },
    { to: '/greeting-cards/create', icon: PlusSquare, label: 'Create Card' },
    { to: '/greeting-cards/templates', icon: BookTemplate, label: 'Templates' },
    { to: '/greeting-cards/drafts', icon: Archive, label: 'Saved Drafts' },
  ];

  const accountItems = [
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/subscription', icon: CreditCard, label: 'Subscription' },
    { to: '/billing', icon: FileText, label: 'Billing' },
    { to: '/help-center', icon: HelpCircle, label: 'Help Center' },
  ];

  const adminItems = [
    { to: '/admin-dashboard', icon: Shield, label: 'Admin Dashboard' },
    { to: '/admin/users', icon: UserCheck, label: 'User Management' },
    { to: '/admin/roles', icon: Shield, label: 'Roles & Perms' },
    { to: '/admin/templates', icon: BookTemplate, label: 'Template Management' },
    { to: '/admin/logs', icon: Terminal, label: 'Audit Logs' },
  ];

  const pill = mobile ? 'nav-pill-mobile' : 'nav-pill';
  const displayName = user?.display_name || user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'User');

  return (
    <aside className="glass-sidebar w-64 h-screen flex flex-col shrink-0 select-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-line-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 on-accent">
            <Sparkles size={19} aria-hidden="true" />
          </div>
          <div>
            <div className="font-bold text-[17px] tracking-tight text-fg leading-tight">AutoWish</div>
            <div className="text-[10px] text-indigo-400 font-bold tracking-[0.16em] uppercase">SaaS Enterprise</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" ref={scrollRef} className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        <div>
          <SectionLabel>Application</SectionLabel>
          {menuItems.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} pillId={pill} />
          ))}
        </div>

        {/* Greeting Cards Section */}
        <div>
          <SectionLabel>Greeting Cards</SectionLabel>
          <button
            type="button"
            onClick={() => setCardsOpen((o) => !o)}
            aria-expanded={cardsOpen}
            aria-controls="sidebar-greeting-cards"
            className="flex items-center justify-between w-full px-3.5 py-2 mb-0.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-fg hover:bg-fg/[0.045] transition-colors"
          >
            <span className="flex items-center gap-3">
              <CardIcon size={15} aria-hidden="true" className="text-violet-400" />
              <span>Greeting Cards</span>
            </span>
            <ChevronDown size={14} aria-hidden="true" className={`text-slate-500 transition-transform duration-200 ${cardsOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {cardsOpen && (
              <motion.div
                id="sidebar-greeting-cards"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pl-3 border-l border-line ml-5 mt-1 space-y-0.5">
                  {cardSubItems.map((item) => (
                    <NavItem key={item.to} item={item} size={13} end={item.to === '/greeting-cards'} onNavigate={onNavigate} pillId={pill} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <SectionLabel>Billing &amp; Help</SectionLabel>
          {accountItems.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} pillId={pill} />
          ))}
        </div>

        {isAdmin && (
          <div>
            <SectionLabel danger>Admin Panel</SectionLabel>
            {adminItems.map((item) => (
              <NavItem key={item.to} item={item} tone="danger" onNavigate={onNavigate} pillId={`${pill}-admin`} />
            ))}
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-line-soft">
        <div className="flex items-center gap-3 mb-3 px-1">
          <Avatar src={user?.avatar || user?.profile?.avatar} name={displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-fg truncate">{displayName}</div>
            <div className="text-[10px] text-slate-500 truncate">{user?.email || ''}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
        >
          <LogOut size={14} aria-hidden="true" /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

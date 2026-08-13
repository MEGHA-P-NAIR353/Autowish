import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Sparkles, Clock,
  Mail, Settings, BarChart3, LogOut, FileText, Bell, CreditCard,
  HelpCircle, Shield, UserCheck, Terminal, Heart,
  CreditCard as CardIcon, PlusSquare, BookTemplate, Archive, ChevronDown, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './common/Avatar';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.profile?.role === 'admin' || user?.profile?.role === 'super_admin' || user?.is_staff || user?.is_superuser;
  const [cardsOpen, setCardsOpen] = useState(false);

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
    { to: '/admin/prompts', icon: Sparkles, label: 'AI Prompts' },
    { to: '/admin/logs', icon: Terminal, label: 'Audit Logs' },
  ];

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 mb-1 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 border border-blue-500/20'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
    }`;

  return (
    <div className="w-64 bg-[#0F172A] border-r border-slate-800 h-screen flex flex-col fixed lg:static z-50 overflow-y-auto shrink-0 select-none">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white">AutoWish</div>
            <div className="text-[10px] text-blue-400 font-bold -mt-1 tracking-widest uppercase">SaaS Enterprise</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-6">
        {/* Application Items */}
        <div>
          <div className="text-[10px] font-extrabold text-slate-500 px-4 mb-2 tracking-widest uppercase">Application</div>
          {menuItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <item.icon size={15} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Greeting Cards Section */}
        <div>
          <div className="text-[10px] font-extrabold text-slate-500 px-4 mb-2 tracking-widest uppercase">Greeting Cards</div>

          {/* Collapsible trigger */}
          <button
            onClick={() => setCardsOpen((o) => !o)}
            className="flex items-center justify-between w-full px-4 py-2 mb-1 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <CardIcon size={15} className="text-violet-400" />
              <span>Greeting Cards</span>
            </div>
            {cardsOpen
              ? <ChevronDown size={13} className="text-slate-500" />
              : <ChevronRight size={13} className="text-slate-500" />}
          </button>

          {cardsOpen && (
            <div className="pl-3 border-l border-slate-700/50 ml-4 space-y-0.5">
              {cardSubItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/greeting-cards'} className={navLinkClass}>
                  <item.icon size={13} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Account Items */}
        <div>
          <div className="text-[10px] font-extrabold text-slate-500 px-4 mb-2 tracking-widest uppercase">Billing & Help</div>
          {accountItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <item.icon size={15} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Admin Items */}
        {isAdmin && (
          <div>
            <div className="text-[10px] font-extrabold text-rose-500/80 px-4 mb-2 tracking-widest uppercase">Admin Panel</div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 mb-1 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-md border border-rose-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`
                }
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-1">
          <Avatar src={user?.avatar || user?.profile?.avatar} name={user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || user?.email || 'User'} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-200 truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'User'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{user?.email || ''}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all border border-transparent hover:border-slate-800"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

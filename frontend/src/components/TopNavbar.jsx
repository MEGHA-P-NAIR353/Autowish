import React from 'react';
import { Bell, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Avatar from './common/Avatar';

const TopNavbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { unreadNotificationCount } = useData();

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.username || user?.email?.split('@')[0] || 'User';

  const avatarSrc = user?.profile?.avatar
    ? user.profile.avatar.startsWith('http')
      ? user.profile.avatar
      : `http://localhost:8000${user.profile.avatar}`
    : null;

  const planBadge = user?.profile?.subscription_plan;

  return (
    <div className="top-nav h-16 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-[#94A3B8]"
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative w-80 hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
          <input
            type="text"
            placeholder="Search contacts, events..."
            className="input pl-10 pr-4 py-2 text-sm w-full bg-[#1E293B] border border-[#334155] focus:border-indigo-500 outline-none rounded-xl"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-[#1E293B] px-3 py-1 rounded-full border border-[#334155]">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-[#94A3B8]">All systems operational</span>
        </div>

        {/* Notifications bell */}
        <Link to="/notifications" className="p-2.5 hover:bg-[#334155] rounded-full relative text-[#94A3B8] transition-colors">
          <Bell size={19} />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1 right-1.5 bg-red-500 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </Link>

        {/* User avatar + name */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#334155]">
          <Avatar src={avatarSrc} name={displayName} size="sm" />
          <div className="hidden md:block">
            <div className="text-sm font-medium leading-none text-slate-100">{displayName}</div>
            {planBadge && (
              <div className={`text-[9px] mt-1 font-semibold uppercase tracking-wider ${
                planBadge === 'FREE' ? 'text-[#64748B]' :
                planBadge === 'PRO' ? 'text-blue-400' :
                planBadge === 'BUSINESS' ? 'text-purple-400' :
                'text-amber-400'
              }`}>
                {planBadge}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;

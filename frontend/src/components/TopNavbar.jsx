import React from 'react';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './common/Avatar';
import ThemeToggle from './ui/ThemeToggle';
import NotificationPanel from './NotificationPanel';
import GlobalSearchBar from './GlobalSearchBar';

const TopNavbar = ({ onMenuClick, menuOpen = false, menuButtonRef }) => {
  const { user } = useAuth();

  const displayName = user?.display_name || user?.full_name || (user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`.trim()
    : user?.username || user?.email?.split('@')[0] || 'User');

  const avatarSrc = user?.profile?.avatar
    ? user.profile.avatar.startsWith('http')
      ? user.profile.avatar
      : `http://localhost:8000${user.profile.avatar}`
    : null;

  const planBadge = user?.profile?.subscription_plan;

  return (
    <header className="top-nav h-16 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-40">
      <div className="flex items-center gap-3 min-w-0">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 -ml-1 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-fg hover:bg-raised/70 transition-colors"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <GlobalSearchBar />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Status indicator */}
        <div className="hidden xl:flex items-center gap-2 bg-raised/50 px-3 py-1.5 rounded-full border border-line-soft mr-2" role="status">
          <span className="relative flex w-2 h-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-slate-400 font-medium">All systems operational</span>
        </div>

        <ThemeToggle />
        <NotificationPanel />

        {/* User profile */}
        <Link
          to="/settings"
          aria-label={`Account settings for ${displayName}`}
          className="flex items-center gap-2.5 ml-1 pl-3 border-l border-line-soft rounded-xl py-1 pr-2 hover:bg-raised/60 transition-colors"
        >
          <Avatar src={avatarSrc} name={displayName} size="sm" />
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold leading-none text-fg">{displayName}</div>
            {planBadge && (
              <div className={`text-[9px] mt-1 font-bold uppercase tracking-wider ${
                planBadge === 'FREE' ? 'text-slate-500' :
                planBadge === 'PRO' ? 'text-blue-400' :
                planBadge === 'BUSINESS' ? 'text-purple-400' :
                'text-amber-400'
              }`}>
                {planBadge}
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default TopNavbar;

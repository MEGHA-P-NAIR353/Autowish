import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Users, Mail, Clock, TrendingUp, Plus, RefreshCw, Sparkles, Gift } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import EmptyState from '../components/common/EmptyState';

// ─── Animated Count ─────────────────────────────────────────────────────────────
const useCountUp = (target, duration = 600) => {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const end = Number(target) || 0;
    if (start === end) { setValue(end); return; }
    let raf;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
};

const AnimatedNumber = ({ value }) => {
  const v = useCountUp(value);
  return <>{v.toLocaleString()}</>;
};

// ─── Greeting Stat Card ────────────────────────────────────────────────────────
const GreetingStatCard = ({ icon, iconBg, title, data, loading, error }) => {
  if (error) {
    return (
      <div className="stat-card border border-rose-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#94A3B8]">{title}</div>
            <div className="stat-number mt-1 text-rose-400">Error</div>
          </div>
          <div className={iconBg}><TrendingUp size={26} /></div>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div className="w-full">
            <div className="h-3 w-20 bg-slate-700/60 rounded animate-pulse mb-2" />
            <div className="h-6 w-12 bg-slate-700/60 rounded animate-pulse" />
          </div>
          <div className={`${iconBg} opacity-60`}><TrendingUp size={26} /></div>
        </div>
      </div>
    );
  }
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[#94A3B8]">{title}</div>
          <div className="stat-number mt-1"><AnimatedNumber value={data?.total ?? 0} /></div>
        </div>
        <div className={iconBg}>{icon}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="bg-[#0F172A] rounded-lg py-1.5">
          <div className="text-[10px] text-[#64748B] uppercase">Today</div>
          <div className="text-sm font-semibold text-slate-200"><AnimatedNumber value={data?.today ?? 0} /></div>
        </div>
        <div className="bg-[#0F172A] rounded-lg py-1.5">
          <div className="text-[10px] text-[#64748B] uppercase">Week</div>
          <div className="text-sm font-semibold text-slate-200"><AnimatedNumber value={data?.week ?? 0} /></div>
        </div>
        <div className="bg-[#0F172A] rounded-lg py-1.5">
          <div className="text-[10px] text-[#64748B] uppercase">Month</div>
          <div className="text-sm font-semibold text-slate-200"><AnimatedNumber value={data?.month ?? 0} /></div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { stats, events, greetingAnalytics, recentActivities, activitiesLoading, activitiesError, fetchAll, loading } = useData();
  const { user } = useAuth();
  const displayName = user?.first_name || user?.username || 'there';

  const analyticsLoading = loading;
  const analyticsError = !greetingAnalytics;

  // Mock data for charts
  const monthlyData = [
    { month: 'Jan', wishes: 68 }, { month: 'Feb', wishes: 81 }, { month: 'Mar', wishes: 94 },
    { month: 'Apr', wishes: 76 }, { month: 'May', wishes: 115 }, { month: 'Jun', wishes: 88 },
    { month: 'Jul', wishes: 124 }, { month: 'Aug', wishes: 105 }
  ];

  const categoryData = [
    { name: 'Birthday', value: 54, color: '#3B82F6' },
    { name: 'Anniversary', value: 22, color: '#8B5CF6' },
    { name: 'Holiday', value: 15, color: '#10B981' },
    { name: 'Other', value: 9, color: '#F59E0B' },
  ];

  const upcomingEvents = events.slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-[#94A3B8]">Welcome back, {displayName}! Here's what's happening.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchAll} disabled={loading} className="btn-secondary flex items-center gap-2" title="Refresh data">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/ai-greeting" className="btn-secondary flex items-center gap-2">
            <Plus size={16} /> Generate Greeting
          </Link>
          <Link to="/schedule" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Schedule Wish
          </Link>
        </div>
      </div>

      {/* Stats Cards - Exact from screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex justify-between">
            <div>
              <div className="text-sm text-[#94A3B8]">Total Contacts</div>
              <div className="stat-number mt-1">{stats.totalContacts ?? '—'}</div>
            </div>
            <Users className="text-blue-400" size={26} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex justify-between">
            <div>
              <div className="text-sm text-[#94A3B8]">Upcoming Events</div>
              <div className="stat-number mt-1">{stats.upcomingEvents ?? '—'}</div>
            </div>
            <Calendar className="text-purple-400" size={26} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex justify-between">
            <div>
              <div className="text-sm text-[#94A3B8]">Wishes Sent</div>
              <div className="stat-number mt-1">{stats.wishesSent ?? '—'}</div>
            </div>
            <Mail className="text-emerald-400" size={26} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex justify-between">
            <div>
              <div className="text-sm text-[#94A3B8]">Pending Replies</div>
              <div className="stat-number mt-1">{stats.pendingReplies ?? 0}</div>
            </div>
            <Clock className="text-amber-400" size={26} />
          </div>
        </div>
      </div>

      {/* Greeting Stat Cards - AI Greetings Sent & Greeting Cards Sent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <GreetingStatCard
          icon={<Sparkles size={26} className="text-indigo-400" />}
          iconBg="text-indigo-400"
          title="AI Greetings Sent"
          data={greetingAnalytics?.aiGreetings}
          loading={analyticsLoading}
          error={analyticsError}
        />
        <GreetingStatCard
          icon={<Gift size={26} className="text-emerald-400" />}
          iconBg="text-emerald-400"
          title="Greeting Cards Sent"
          data={greetingAnalytics?.greetingCards}
          loading={analyticsLoading}
          error={analyticsError}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar + Stats */}
        <div className="lg:col-span-7 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Upcoming Events</div>
            <Link to="/events" className="text-xs text-blue-400">View All →</Link>
          </div>

          <div className="space-y-2 mb-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <div key={event.id} className="flex justify-between items-center bg-[#0F172A] px-4 py-[13px] rounded-xl border border-[#334155]">
                <div>
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-[#64748B]">{event.recipient} • {event.date}</div>
                </div>
                <div className={`text-xs px-3 py-1 rounded-full ${event.status === 'Today' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {event.status}
                </div>
              </div>
            )) : <div className="text-[#64748B]">No upcoming events</div>}
          </div>

          {/* Mini Calendar */}
          <div className="pt-4 border-t border-[#334155]">
            <div className="text-sm font-medium mb-3">Calendar Overview</div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-[#64748B] py-1">{d}</div>)}
              {Array.from({ length: 28 }, (_, i) => {
                const day = i + 1;
                const hasEvent = [18,19,22,25].includes(day);
                return (
                  <div key={i} className={`py-[5px] rounded-lg text-sm ${hasEvent ? 'bg-blue-500 text-white font-medium' : 'hover:bg-[#334155]'}`}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side - Stats + Quick Actions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Stats breakdown */}
          <div className="card p-5">
            <div className="font-semibold mb-4">Stats</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between py-2 border-b border-[#334155]"><span>Total Contacts</span> <span className="font-semibold">{stats.totalContacts}</span></div>
              <div className="flex justify-between py-2 border-b border-[#334155]"><span>Upcoming Events</span> <span className="font-semibold">{stats.upcomingEvents}</span></div>
              <div className="flex justify-between py-2 border-b border-[#334155]"><span>Wishes Sent</span> <span className="font-semibold">{stats.wishesSent}</span></div>
              <div className="flex justify-between py-2 border-b border-[#334155]"><span>Pending Replies</span> <span className="font-semibold">{stats.pendingReplies}</span></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <div className="font-semibold mb-4">Quick Actions</div>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/contacts" className="flex items-center gap-2 bg-[#334155] hover:bg-[#475569] px-4 py-3 rounded-xl text-sm transition-colors">
                <Users size={17} /> Add Contact
              </Link>
              <Link to="/events" className="flex items-center gap-2 bg-[#334155] hover:bg-[#475569] px-4 py-3 rounded-xl text-sm transition-colors">
                <Calendar size={17} /> Add Event
              </Link>
              <Link to="/ai-greeting" className="flex items-center gap-2 bg-[#334155] hover:bg-[#475569] px-4 py-3 rounded-xl text-sm transition-colors">
                <span>✨</span> Generate AI Wish
              </Link>
              <Link to="/schedule" className="flex items-center gap-2 bg-[#334155] hover:bg-[#475569] px-4 py-3 rounded-xl text-sm transition-colors">
                <Clock size={17} /> Schedule Wish
              </Link>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="lg:col-span-7 card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Monthly Wishes</div>
            <div className="text-xs text-[#64748B]">Last 8 months</div>
          </div>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="wishes" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 card p-5">
          <div className="font-semibold mb-4">Event Categories</div>
          <div className="flex items-center gap-7">
            <div className="flex-1 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-sm">
              {categoryData.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: cat.color }}></div>
                  <span>{cat.name}</span>
                  <span className="ml-auto text-[#64748B]">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-12 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Recent Activity</div>
            <Link to="/activities" className="text-xs text-blue-400 hover:text-blue-300">View All →</Link>
          </div>
          
          {activitiesLoading ? (
            <div className="grid md:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 px-4 py-3 bg-[#0F172A] rounded-xl border border-[#334155] animate-pulse">
                  <div className="w-5 h-5 bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-700 rounded w-3/4" />
                    <div className="h-2 bg-slate-700 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activitiesError ? (
            <div className="py-8 text-center">
              <div className="text-rose-400 mb-2">Unable to load recent activity.</div>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="btn-secondary text-sm"
              >
                Retry
              </button>
            </div>
          ) : recentActivities && recentActivities.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-3">
              {recentActivities.map(act => (
                <div key={act.id} className="flex gap-3 px-4 py-3 bg-[#0F172A] rounded-xl border border-[#334155]">
                  <div className="mt-0.5 shrink-0">
                    {act.action_type.startsWith('CONTACT_') && <Users size={18} className="text-blue-400" />}
                    {act.action_type.startsWith('EVENT_') && <Calendar size={18} className="text-purple-400" />}
                    {(act.action_type === 'WISH_SENT' || act.action_type === 'GREETING_CARD_SENT') && <Mail size={18} className="text-emerald-400" />}
                    {act.action_type === 'WISH_SCHEDULED' && <Clock size={18} className="text-amber-400" />}
                    {(act.action_type === 'WISH_GENERATED' || act.action_type === 'AI_GREETING_GENERATED') && <Sparkles size={18} className="text-indigo-400" />}
                    {act.action_type.startsWith('GREETING_CARD_') && <Gift size={18} className="text-pink-400" />}
                    {!['CONTACT_', 'EVENT_', 'WISH_SENT', 'GREETING_CARD_SENT', 'WISH_SCHEDULED', 'WISH_GENERATED', 'AI_GREETING_GENERATED', 'GREETING_CARD_'].some(prefix => act.action_type.startsWith(prefix)) && <Clock size={18} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate" title={act.title}>{act.title}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{act.relative_time}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={Clock}
                title="No recent activity"
                description="Activities like sent emails, scheduled wishes, and created events will appear here."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

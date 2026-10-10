import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Users, Mail, Clock, TrendingUp, Plus, RefreshCw, Sparkles, Gift, CheckCircle2, CalendarClock } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useChartTheme, chartTooltipStyle } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import EmptyState from '../components/common/EmptyState';
import { GlassCard, GlassStatCard, GlassButton, PageHeader, StatusBadge, Skeleton } from '../components/ui';

// ─── Animated Count ─────────────────────────────────────────────────────────────
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const useCountUp = (target, duration = 600) => {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const end = Number(target) || 0;
    if (start === end || prefersReducedMotion()) { setValue(end); prevRef.current = end; return; }
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

const CATEGORY_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Greeting Stat Card (AI greetings / greeting cards) ────────────────────────
const GreetingStatCard = ({ icon: Icon, accent, title, data, loading, error, delay }) => (
  <GlassStatCard icon={Icon} accent={accent} label={title} loading={loading} error={error} delay={delay}
    value={<AnimatedNumber value={data?.total ?? 0} />}>
    {!loading && !error && (
      <dl className="grid grid-cols-3 gap-2 mt-4 text-center">
        {[['Today', data?.today], ['Week', data?.week], ['Month', data?.month]].map(([k, v]) => (
          <div key={k} className="bg-inset/60 border border-line-soft rounded-xl py-2">
            <dt className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{k}</dt>
            <dd className="text-sm font-semibold text-slate-200 tabular-nums"><AnimatedNumber value={v ?? 0} /></dd>
          </div>
        ))}
      </dl>
    )}
  </GlassStatCard>
);

const ACTIVITY_ICON = (type = '') => {
  if (type.startsWith('CONTACT_')) return <Users size={18} className="text-blue-400" />;
  if (type.startsWith('EVENT_')) return <Calendar size={18} className="text-purple-400" />;
  if (type === 'WISH_SENT' || type === 'GREETING_CARD_SENT') return <Mail size={18} className="text-emerald-400" />;
  if (type === 'WISH_SCHEDULED') return <Clock size={18} className="text-amber-400" />;
  if (type === 'WISH_GENERATED' || type === 'AI_GREETING_GENERATED') return <Sparkles size={18} className="text-indigo-400" />;
  if (type.startsWith('GREETING_CARD_')) return <Gift size={18} className="text-pink-400" />;
  return <Clock size={18} className="text-slate-400" />;
};

const Dashboard = () => {
  const { stats, events, emailLogs, greetingAnalytics, recentActivities, activitiesLoading, activitiesError, fetchAll, loading } = useData();
  const { user } = useAuth();
  const chart = useChartTheme();
  const displayName = user?.display_name || user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'there');

  const analyticsLoading = loading;
  const analyticsError = !greetingAnalytics;

  // ── Derived from real data already loaded in DataContext ──
  const monthlyData = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS[d.getMonth()], wishes: 0 };
    });
    (emailLogs || []).forEach((log) => {
      if (!['Sent', 'Delivered'].includes(log.status) || !log.created_at) return;
      const d = new Date(log.created_at);
      const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.wishes += 1;
    });
    return buckets;
  }, [emailLogs]);
  const hasMonthly = monthlyData.some((m) => m.wishes > 0);

  const categoryData = useMemo(() => {
    const counts = {};
    (events || []).forEach((e) => { if (e.type) counts[e.type] = (counts[e.type] || 0) + 1; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).map(([name, count], i) => ({
      name, count, value: Math.round((count / total) * 100), color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [events]);

  const upcomingEvents = (events || []).slice(0, 3);

  // Calendar overview for the current month with real event days highlighted
  const calendar = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const eventDays = new Set();
    (events || []).forEach((e) => {
      const d = new Date(`${e.date}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m) eventDays.add(d.getDate());
    });
    return { label: now.toLocaleString(undefined, { month: 'long', year: 'numeric' }), first, days, eventDays, today: now.getDate() };
  }, [events]);

  // Backend reports 100% when nothing has been attempted, so only show it once there is data.
  const attempted = (Number(stats.wishesSent) || 0) + (Number(stats.failedEmails) || 0);
  const successRate = attempted > 0 ? stats.successRate : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${displayName}! Here's what's happening.`}
        actions={
          <>
            <GlassButton onClick={fetchAll} disabled={loading} iconOnly aria-label="Refresh data" title="Refresh data">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            </GlassButton>
            <GlassButton as={Link} to="/ai-greeting" variant="secondary" leftIcon={<Sparkles size={16} aria-hidden="true" />}>
              Generate Greeting
            </GlassButton>
            <GlassButton as={Link} to="/schedule" variant="primary" leftIcon={<Plus size={16} aria-hidden="true" />}>
              Schedule Wish
            </GlassButton>
          </>
        }
      />

      {/* Key metrics */}
      <section aria-label="Key metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
        <GlassStatCard icon={Users} accent="blue" label="Total Contacts" delay={0}
          value={stats.totalContacts != null ? <AnimatedNumber value={stats.totalContacts} /> : '—'} />
        <GlassStatCard icon={Calendar} accent="violet" label="Upcoming Events" delay={0.05}
          value={stats.upcomingEvents != null ? <AnimatedNumber value={stats.upcomingEvents} /> : '—'} />
        <GlassStatCard icon={CalendarClock} accent="amber" label="Scheduled Wishes" delay={0.1}
          value={stats.totalScheduled != null ? <AnimatedNumber value={stats.totalScheduled} /> : '—'} />
        <GlassStatCard icon={Mail} accent="emerald" label="Wishes Sent" delay={0.15}
          value={stats.wishesSent != null ? <AnimatedNumber value={stats.wishesSent} /> : '—'} />
        <GlassStatCard icon={CheckCircle2} accent="indigo" label="Success Rate" delay={0.2}
          value={successRate != null ? `${successRate}%` : '—'}
          hint={stats.failedEmails ? `${stats.failedEmails} failed` : undefined} />
      </section>

      {/* Greeting stat cards */}
      <section aria-label="Greeting activity" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <GreetingStatCard icon={Sparkles} accent="indigo" title="AI Greetings Sent" data={greetingAnalytics?.aiGreetings}
          loading={analyticsLoading} error={analyticsError} delay={0.25} />
        <GreetingStatCard icon={Gift} accent="pink" title="Greeting Cards Sent" data={greetingAnalytics?.greetingCards}
          loading={analyticsLoading} error={analyticsError} delay={0.3} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming events + calendar */}
        <GlassCard className="lg:col-span-7 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-fg">Upcoming Events</h2>
            <Link to="/events" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>

          <div className="space-y-2 mb-5">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <div key={event.id} className="flex justify-between items-center gap-3 bg-inset/60 hover:bg-inset px-4 py-3 rounded-xl border border-line-soft transition-colors">
                <div className="min-w-0">
                  <div className="font-medium text-fg truncate">{event.title}</div>
                  <div className="text-sm text-slate-500 truncate">{event.recipient} • {event.date}</div>
                </div>
                <StatusBadge status={event.status} />
              </div>
            )) : <div className="text-slate-500 text-sm">No upcoming events</div>}
          </div>

          <div className="pt-4 border-t border-line-soft">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-fg">Calendar Overview</div>
              <div className="text-xs text-slate-500">{calendar.label}</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label={`Calendar for ${calendar.label}`}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-slate-500 py-1 font-semibold" role="columnheader">{d}</div>)}
              {Array.from({ length: calendar.first }, (_, i) => <div key={`pad-${i}`} />)}
              {Array.from({ length: calendar.days }, (_, i) => {
                const day = i + 1;
                const hasEvent = calendar.eventDays.has(day);
                const isToday = day === calendar.today;
                return (
                  <div
                    key={day}
                    role="gridcell"
                    aria-label={`${day}${hasEvent ? ', has event' : ''}${isToday ? ', today' : ''}`}
                    className={`py-[6px] rounded-lg text-sm tabular-nums transition-colors ${
                      hasEvent ? 'bg-gradient-to-br from-blue-500 to-violet-500 text-white font-semibold shadow-sm' :
                      isToday ? 'border border-indigo-400/60 text-fg font-semibold' : 'text-slate-300 hover:bg-raised'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {/* Right side - Stats + Quick Actions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <GlassCard className="p-5 sm:p-6">
            <h2 className="font-semibold text-fg mb-4">Stats</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm">
              {[
                ['Total Contacts', stats.totalContacts],
                ['Upcoming Events', stats.upcomingEvents],
                ['Wishes Sent', stats.wishesSent],
                ['Pending Replies', stats.pendingReplies],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5 border-b border-line-soft">
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="font-semibold text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <h2 className="font-semibold text-fg mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/contacts', icon: <Users size={17} />, label: 'Add Contact' },
                { to: '/events', icon: <Calendar size={17} />, label: 'Add Event' },
                { to: '/ai-greeting', icon: <Sparkles size={17} />, label: 'Generate AI Wish' },
                { to: '/schedule', icon: <Clock size={17} />, label: 'Schedule Wish' },
              ].map((a) => (
                <Link key={a.to + a.label} to={a.to}
                  className="group flex items-center gap-2.5 bg-inset/60 hover:bg-raised border border-line-soft hover:border-line px-4 py-3 rounded-xl text-sm font-medium text-slate-200 transition-all hover:-translate-y-0.5">
                  <span className="text-indigo-400 group-hover:scale-110 transition-transform" aria-hidden="true">{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Charts */}
        <GlassCard className="lg:col-span-7 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-fg">Monthly Wishes</h2>
            <div className="text-xs text-slate-500">Last 8 months</div>
          </div>
          {loading && !hasMonthly ? <Skeleton className="h-[210px] w-full" /> : hasMonthly ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.primary} stopOpacity={1} />
                      <stop offset="100%" stopColor={chart.secondary} stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="month" stroke={chart.axis} tick={{ fill: chart.axis }} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={chart.axis} tick={{ fill: chart.axis }} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle(chart)} cursor={{ fill: chart.cursor }} />
                  <Bar dataKey="wishes" name="Wishes sent" fill="url(#barFill)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="No sent wishes yet" description="Delivered wishes will be charted here by month." />
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-5 p-5 sm:p-6">
          <h2 className="font-semibold text-fg mb-4">Event Categories</h2>
          {categoryData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:flex-1 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} stroke="none">
                      {categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle(chart)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 text-sm w-full sm:w-auto sm:min-w-[140px]">
                {categoryData.map((cat) => (
                  <li key={cat.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} aria-hidden="true" />
                    <span className="text-slate-300">{cat.name}</span>
                    <span className="ml-auto text-slate-500 tabular-nums">{cat.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState icon={Calendar} title="No events yet" description="Add events to see how they break down by category." />
          )}
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="lg:col-span-12 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-fg">Recent Activity</h2>
            <Link to="/activities" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>

          {activitiesLoading ? (
            <div className="grid md:grid-cols-3 gap-3" role="status" aria-label="Loading recent activity">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3 bg-inset/60 rounded-xl border border-line-soft">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activitiesError ? (
            <div className="py-8 text-center">
              <div className="text-rose-400 mb-3 text-sm font-medium" role="alert">Unable to load recent activity.</div>
              <GlassButton onClick={fetchAll} disabled={loading} size="sm">Retry</GlassButton>
            </div>
          ) : recentActivities && recentActivities.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-3">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3 px-4 py-3 bg-inset/60 hover:bg-inset rounded-xl border border-line-soft transition-colors">
                  <div className="mt-0.5 shrink-0" aria-hidden="true">{ACTIVITY_ICON(act.action_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate" title={act.title}>{act.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{act.relative_time}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4">
              <EmptyState
                icon={Clock}
                title="No recent activity"
                description="Activities like sent emails, scheduled wishes, and created events will appear here."
              />
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;

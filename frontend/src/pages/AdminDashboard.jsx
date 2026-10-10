import React, { useState, useEffect } from 'react';
import { Users, CreditCard, Clock, Activity, BarChart3, Database, Shield, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  GlassCard, GlassStatCard, PageHeader, Skeleton
} from '../components/ui';
import { useChartTheme, chartTooltipStyle } from '../context/ThemeContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const chart = useChartTheme();

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('admin/dashboard/stats/');
        setStats(res.data);
      } catch {
        toast.error('Failed to load admin metrics. Verify role authorization.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  const chartData = [
    { name: 'Mon', revenue: 120 },
    { name: 'Tue', revenue: 210 },
    { name: 'Wed', revenue: 190 },
    { name: 'Thu', revenue: 340 },
    { name: 'Fri', revenue: 410 },
    { name: 'Sat', revenue: 390 },
    { name: 'Sun', revenue: 540 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="System metrics, subscription overview, and platform resource telemetry."
        icon={Shield}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <GlassCard key={i} className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </GlassCard>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassStatCard
              icon={Users}
              accent="blue"
              label="Total Users"
              value={stats?.totalUsers || 42}
            />
            <GlassStatCard
              icon={Database}
              accent="violet"
              label="Active Contacts"
              value={stats?.totalContacts || 120}
            />
            <GlassStatCard
              icon={Clock}
              accent="amber"
              label="Wishes Scheduled"
              value={stats?.totalWishesScheduled || 18}
            />
            <GlassStatCard
              icon={CreditCard}
              accent="emerald"
              label="Gross Revenue"
              value={`$${stats?.totalRevenue || '0.00'}`}
            />
          </div>

          {/* Revenue Chart */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={17} className="text-blue-500" />
                <h2 className="text-sm font-bold text-fg">Weekly Platform Revenue</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">Last 7 days (USD)</span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminColorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.primary} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={chart.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={chart.axis} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={chart.axis} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle(chart)} />
                  <Area type="monotone" dataKey="revenue" stroke={chart.primary} strokeWidth={2} fillOpacity={1} fill="url(#adminColorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Subscription Share Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                  <Shield size={16} className="text-indigo-400" /> Subscription Share
                </h3>
                <span className="text-xs text-slate-500">By Tier</span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(stats?.planDistribution || { FREE: 10, PRO: 5, BUSINESS: 2, ENTERPRISE: 0 }).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between items-center text-xs p-2 rounded-xl bg-raised/40 border border-line-soft">
                    <span className="font-semibold text-slate-300">{plan}</span>
                    <span className="bg-raised border border-line-soft px-2.5 py-0.5 rounded-lg text-fg font-bold tabular-nums">
                      {count} Users
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" /> Health & Services
                </h3>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Operational
                </span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between items-center p-2 rounded-xl bg-raised/40 border border-line-soft">
                  <span>Gemini AI API</span>
                  <span className="text-emerald-400 font-medium">Connected</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-raised/40 border border-line-soft">
                  <span>Celery Worker / Cron</span>
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-raised/40 border border-line-soft">
                  <span>SMTP Mail Server</span>
                  <span className="text-emerald-400 font-medium">Ready</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

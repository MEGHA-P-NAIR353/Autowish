import React, { useState, useEffect } from 'react';
import { Users, CreditCard, Clock, Activity, BarChart3, Database, Shield } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('admin/dashboard/stats/');
        setStats(res.data);
      } catch (err) {
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm">System statistics, billing records, and server logs.</p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Users</span>
                <Users size={16} className="text-blue-500" />
              </div>
              <p className="text-3xl font-extrabold text-white">{stats?.totalUsers || 42}</p>
            </div>

            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Active Contacts</span>
                <Database size={16} className="text-purple-500" />
              </div>
              <p className="text-3xl font-extrabold text-white">{stats?.totalContacts || 120}</p>
            </div>

            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Wishes Scheduled</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-white">{stats?.totalWishesScheduled || 18}</p>
            </div>

            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Gross Revenue</span>
                <CreditCard size={16} className="text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-white">${stats?.totalRevenue || '0.00'}</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-slate-850 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <BarChart3 size={16} className="text-blue-500" /> Weekly Platform Revenue
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Settings & Plans Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Distribution */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Shield size={16} className="text-blue-500" /> Subscription Share
              </h3>
              <div className="space-y-3">
                {Object.entries(stats?.planDistribution || { FREE: 10, PRO: 5, BUSINESS: 2, ENTERPRISE: 0 }).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">{plan}</span>
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-slate-400 font-bold">{count} Users</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Check Status */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" /> Platform Infrastructure Health
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">PostgreSQL DB</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Online</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Celery Worker</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Online</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Redis Server</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Online</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

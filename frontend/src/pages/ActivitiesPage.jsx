import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { 
  Users, Calendar, Mail, Clock, Sparkles, Gift, 
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw 
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import EmptyState from '../components/common/EmptyState';

const ActivitiesPage = () => {
  const { fetchRecentActivity } = useData();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [limit] = useState(20);

  const fetchAllActivities = async (p = 1) => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getRecentActivity({ 
        limit: limit,
        offset: (p - 1) * limit
      });
      setActivities(res.data.results ?? []);
      setCount(res.data.count ?? 0);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllActivities(page);
  }, [page]);

  const getActivityIcon = (actionType) => {
    if (actionType.startsWith('CONTACT_')) return <Users size={20} className="text-blue-400" />;
    if (actionType.startsWith('EVENT_')) return <Calendar size={20} className="text-purple-400" />;
    if (actionType === 'WISH_SENT' || actionType === 'GREETING_CARD_SENT') return <Mail size={20} className="text-emerald-400" />;
    if (actionType === 'WISH_SCHEDULED') return <Clock size={20} className="text-amber-400" />;
    if (actionType === 'WISH_GENERATED' || actionType === 'AI_GREETING_GENERATED') return <Sparkles size={20} className="text-indigo-400" />;
    if (actionType.startsWith('GREETING_CARD_')) return <Gift size={20} className="text-pink-400" />;
    return <Clock size={20} className="text-slate-400" />;
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-[#94A3B8]">A complete history of your actions</p>
        </div>
        <button 
          onClick={() => { setPage(1); fetchAllActivities(1); fetchRecentActivity(); }} 
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#334155] bg-slate-800/50">
                  <th className="px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-full" />
                          <div className="h-4 bg-slate-700 rounded w-48" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-3 bg-slate-700 rounded w-20 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : activities.length > 0 ? (
                  activities.map(act => (
                    <tr key={act.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 border border-[#334155] rounded-xl flex items-center justify-center shrink-0">
                            {getActivityIcon(act.action_type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-200">{act.title}</div>
                            {act.description && <div className="text-xs text-[#64748B] mt-0.5">{act.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm text-slate-400">{act.relative_time}</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          {new Date(act.created_at).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="px-6 py-12">
                      <EmptyState
                        icon={Clock}
                        title="No activity found"
                        description="Your recent actions will appear here once you start using Auto-Wish AI."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#334155] flex items-center justify-between bg-slate-800/20">
            <div className="text-xs text-[#64748B]">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, count)} of {count} activities
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 bg-[#1E293B] border border-[#334155] rounded-lg disabled:opacity-50 hover:bg-[#334155] transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="p-2 bg-[#1E293B] border border-[#334155] rounded-lg disabled:opacity-50 hover:bg-[#334155] transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesPage;

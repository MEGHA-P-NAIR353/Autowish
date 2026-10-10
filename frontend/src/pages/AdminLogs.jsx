import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, Search, ShieldAlert, Cpu, Download, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('admin/audit-logs/');
      setLogs(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load system logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.event_type && l.event_type.toLowerCase().includes(term)) ||
      (l.username && l.username.toLowerCase().includes(term)) ||
      (l.display_name && l.display_name.toLowerCase().includes(term)) ||
      (l.actor_name && l.actor_name.toLowerCase().includes(term)) ||
      (l.details && l.details.toLowerCase().includes(term)) ||
      (l.previous_name && l.previous_name.toLowerCase().includes(term)) ||
      (l.updated_name && l.updated_name.toLowerCase().includes(term)) ||
      (l.ip_address && l.ip_address.toLowerCase().includes(term))
    );
  });

  const exportCSV = () => {
    if (!filtered || filtered.length === 0) {
      toast.error('No audit logs to export');
      return;
    }
    const csv = [
      ['Action', 'Event Type', 'User ID', 'User Display Name', 'Details', 'Previous Name', 'Updated Name', 'IP Address', 'Timestamp'],
      ...filtered.map(l => [
        l.action || '',
        l.event_type || l.action || '',
        l.user || '',
        l.display_name || l.actor_name || l.username || 'System',
        l.details || '',
        l.previous_name || '',
        l.updated_name || '',
        l.ip_address || '',
        l.timestamp || l.created_at || ''
      ])
    ].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'autowish_audit_logs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported autowish_audit_logs.csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted text-sm">System configuration audit logs, authentication history, and IP verification.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-sm disabled:opacity-50"
            title="Refresh Audit Logs"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-sm"
            title="Export Audit Logs to CSV"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-subtle" size={18} />
        <input
          type="text"
          placeholder="Search by action, details, user, or IP..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-raised/40 border border-line/50 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-fg"
        />
      </div>

      {/* Table */}
      <div className="bg-surface/80 backdrop-blur-md border border-line rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-subtle text-sm">No activity logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-inset text-muted font-semibold border-b border-line">
                  <th className="p-4">USER</th>
                  <th className="p-4">ACTION</th>
                  <th className="p-4">DETAILS</th>
                  <th className="p-4">IP ADDRESS</th>
                  <th className="p-4">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft/60 font-mono text-[11px] text-muted">
                {filtered.map(log => {
                  const isNameChange = log.action === 'profile_name_changed' || log.event_type === 'profile_name_changed';
                  const userDisplay = log.display_name || log.actor_name || log.username || 'System';

                  return (
                    <tr key={log.id} className="hover:bg-raised/20">
                      <td className="p-4 text-blue-400 font-bold">
                        <div>{userDisplay}</div>
                        {log.user && (
                          <div className="text-[10px] text-subtle font-mono font-normal">ID: #{log.user}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {isNameChange ? (
                          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded text-indigo-400 font-semibold inline-block">
                            Profile Name Changed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-raised border border-line rounded text-muted font-semibold inline-block">
                            {log.action}
                          </span>
                        )}
                      </td>
                      <td className="p-4 max-w-sm md:max-w-md text-muted" title={log.details}>
                        <div className="truncate font-sans text-xs">{log.details}</div>
                        {log.previous_name && log.updated_name && (
                          <div className="flex items-center gap-1.5 mt-1 font-sans text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-raised text-slate-400">{log.previous_name}</span>
                            <span className="text-blue-400 font-bold">→</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">{log.updated_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-subtle">{log.ip_address || '127.0.0.1'}</td>
                      <td className="p-4 text-subtle">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogs;

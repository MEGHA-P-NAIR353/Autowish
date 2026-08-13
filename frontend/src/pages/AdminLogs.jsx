import React, { useState, useEffect } from 'react';
import { Terminal, Search, ShieldAlert, Cpu } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get('admin/audit-logs/');
        setLogs(res.data.results || res.data || []);
      } catch (err) {
        toast.error('Failed to load system logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter(l => 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.username && l.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-slate-400 text-sm">System configuration audit logs, authentication history, and IP verification.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Search by action, details, or username..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/40 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-white"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-850 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No activity logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="p-4">USER</th>
                  <th className="p-4">ACTION</th>
                  <th className="p-4">DETAILS</th>
                  <th className="p-4">IP ADDRESS</th>
                  <th className="p-4">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/20">
                    <td className="p-4 text-blue-400 font-bold">{log.username || 'System'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate text-slate-400" title={log.details}>{log.details}</td>
                    <td className="p-4 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                    <td className="p-4 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogs;

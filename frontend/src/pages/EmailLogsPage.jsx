import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const EmailLogsPage = () => {
  const { emailLogs, addEmailLog } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = log.recipient.toLowerCase().includes(search.toLowerCase()) || 
                         log.subject.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || log.status === filter;
    return matchesSearch && matchesFilter;
  });

  const retryEmail = (log) => {
    // Simulate retry
    const newLog = {
      ...log,
      id: Date.now(),
      status: 'Delivered',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    addEmailLog(newLog);
    toast.success('Email retried and delivered!');
  };

  const exportCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error('No email logs to export');
      return;
    }
    const csv = [
      ['Recipient', 'Subject', 'Status', 'Date', 'Delivery Status'],
      ...filteredLogs.map(l => [
        l.recipient || '',
        l.subject || '',
        l.status || '',
        l.date || '',
        l.delivery || ''
      ])
    ].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email_logs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported email_logs.csv');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <div>
          <h1 className="text-3xl font-bold">Email Logs</h1>
          <p className="text-slate-400">Track delivery of all scheduled wishes</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search logs..." 
          className="input flex-1 max-w-sm" 
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input max-w-[150px]">
          <option>All</option>
          <option>Delivered</option>
          <option>Sent</option>
          <option>Failed</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table min-w-[760px]">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Date</th>
              <th>Delivery</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? filteredLogs.map(log => (
              <tr key={log.id}>
                <td className="font-medium">{log.recipient}</td>
                <td>{log.subject}</td>
                <td>
                  <span className={`badge px-3 py-[1px] ${log.status === 'Delivered' || log.status === 'Sent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {log.status}
                  </span>
                </td>
                <td className="text-sm">{log.date}</td>
                <td className="text-sm text-slate-400">{log.delivery}</td>
                <td>
                  {log.status === 'Failed' && (
                    <button onClick={() => retryEmail(log)} className="text-blue-400 flex items-center gap-1 text-sm">
                      <RefreshCw size={14} /> Retry
                    </button>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan="6" className="text-center py-7 text-slate-500">No email logs found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmailLogsPage;

import React from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportsPage = () => {
  const { stats } = useData();

  const monthly = [
    { month: 'Jan', sent: 78, delivered: 76 }, { month: 'Feb', sent: 91, delivered: 89 },
    { month: 'Mar', sent: 102, delivered: 101 }, { month: 'Apr', sent: 84, delivered: 80 },
    { month: 'May', sent: 125, delivered: 122 }, { month: 'Jun', sent: 98, delivered: 94 }
  ];

  const exportPDF = () => {
    toast.success('PDF report downloaded (simulated)');
  };

  return (
    <div>
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-[#94A3B8]">Detailed insights and exports</p>
        </div>
        <button onClick={exportPDF} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-xs text-[#64748B]">Total Wishes Sent</div>
          <div className="text-4xl font-bold mt-1">{stats.wishesSent}</div>
          <div className="text-xs text-green-400 mt-1">+18% from last month</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-[#64748B]">Email Success Rate</div>
          <div className="text-4xl font-bold mt-1">98.4%</div>
          <div className="text-xs text-[#94A3B8] mt-1">1,220 delivered out of 1,240</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-[#64748B]">AI Greetings Used</div>
          <div className="text-4xl font-bold mt-1">743</div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="font-semibold mb-4">Monthly Delivery Performance</div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid stroke="#334155" />
              <XAxis dataKey="month" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Bar dataKey="sent" fill="#3B82F6" radius={4} />
              <Bar dataKey="delivered" fill="#10B981" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <div className="font-semibold mb-4">AI Usage Trends</div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={monthly}>
              <CartesianGrid stroke="#334155" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sent" stroke="#8B5CF6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

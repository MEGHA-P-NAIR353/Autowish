import React from 'react';
import { Shield, Check, AlertCircle } from 'lucide-react';

const AdminRoles = () => {
  const roles = [
    {
      name: 'Super Admin',
      desc: 'Complete control over system parameters, databases, user credentials, prompts, and server settings.',
      permList: ['Create/Read/Update/Delete Users', 'Manage Global AI Prompts', 'View System logs & Audit entries', 'Direct API and server health checks']
    },
    {
      name: 'Admin',
      desc: 'Operational management of users, subscriptions, template database, and audit history.',
      permList: ['Update User Plans', 'Manage AI templates', 'Read system activity logs', 'Support Desk resolution']
    },
    {
      name: 'Premium User (Pro/Biz)',
      desc: 'Full access to consumer SaaS wish automation features.',
      permList: ['Unlimited Scheduled Wishes', 'Multi-channel (Email, SMS, WhatsApp) deliveries', 'Advanced AI greeting generation parameters', 'CSV contacts upload/download']
    },
    {
      name: 'Free User',
      desc: 'Default tier with limited features for trial purposes.',
      permList: ['Up to 10 wishes per month', 'Email delivery only', 'Standard AI prompt generation model']
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-slate-400 text-sm">System authorization levels and permission rules definition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role, idx) => (
          <div key={idx} className="bg-slate-850 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Shield className="text-blue-400" size={20} />
              </div>
              <h3 className="text-base font-extrabold text-white">{role.name}</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">{role.desc}</p>
            
            <ul className="space-y-2 pt-3 border-t border-slate-800">
              {role.permList.map((perm, pidx) => (
                <li key={pidx} className="flex gap-2 items-start text-[11px] text-slate-300">
                  <Check size={12} className="text-blue-500 mt-0.5" />
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRoles;

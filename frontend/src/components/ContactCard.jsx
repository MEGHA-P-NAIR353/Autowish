import React from 'react';
import { User, Mail, Phone, Heart, Calendar, Gift } from 'lucide-react';

export default function ContactCard({ contact }) {
  if (!contact) return null;
  const items = [
    { icon: <User size={14} className="text-indigo-400" />, label: 'Name', value: contact.name },
    { icon: <Mail size={14} className="text-emerald-400" />, label: 'Email', value: contact.email || '—' },
    { icon: <Phone size={14} className="text-amber-400" />, label: 'Phone', value: contact.phone || '—' },
    { icon: <Heart size={14} className="text-rose-400" />, label: 'Relation', value: contact.relationship || '—' },
    { icon: <Calendar size={14} className="text-sky-400" />, label: 'Birthday', value: contact.birthday || '—' },
    { icon: <Gift size={14} className="text-purple-400" />, label: 'Anniversary', value: contact.anniversary || '—' },
  ];
  return (
    <div className="mt-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 shrink-0">{item.icon}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</div>
            <div className="text-xs text-slate-300 truncate">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

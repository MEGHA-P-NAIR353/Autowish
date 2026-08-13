import React from 'react';
import { Sparkles, Heart, Users, Target } from 'lucide-react';

const About = () => {
  const values = [
    { icon: Sparkles, name: 'AI Innovation', desc: 'Leveraging Google Gemini models to create custom wishes.' },
    { icon: Heart, name: 'Emotional Connection', desc: 'Bringing family, friends, and colleagues closer together through timely wishes.' },
    { icon: Users, name: 'Reliable Delivery', desc: 'Automating background queues with Nginx, Celery, and PostgreSQL.' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-4">
      {/* Intro */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">About Auto-Wish AI</h1>
        <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
          Auto-Wish AI is an enterprise-grade SaaS platform built to solve the hassle of forgetting special milestones. We automate, draft, and deliver personalized messages at scale.
        </p>
      </div>

      {/* Grid values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {values.map((v, idx) => (
          <div key={idx} className="bg-slate-850 border border-slate-800 p-6 rounded-3xl space-y-3.5">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center">
              <v.icon size={20} />
            </div>
            <h3 className="font-bold text-slate-100 text-sm">{v.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;

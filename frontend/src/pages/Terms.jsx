import React from 'react';

const Terms = () => {
  return (
    <div className="max-w-3xl mx-auto bg-slate-850 border border-slate-800 p-8 rounded-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-slate-400 text-xs">Last updated: July 11, 2026</p>

      <div className="space-y-4 text-xs text-slate-300 leading-relaxed border-t border-slate-850 pt-4">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100">1. Acceptance of Terms</h3>
          <p>By creating an account on Auto-Wish AI, you agree to comply with our delivery rules, payment schedules, and usage limits.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100">2. Prohibited Uses</h3>
          <p>You may not use our AI generation or delivery worker processes to distribute spam messages, harassment, malware, or deceptive marketing emails.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100">3. Termination</h3>
          <p>We reserve the right to suspend accounts that violate our security guidelines, fail payment authorizations, or bypass API constraints.</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;

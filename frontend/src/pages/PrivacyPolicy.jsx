import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-3xl mx-auto bg-slate-850 border border-slate-800 p-8 rounded-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-slate-400 text-xs">Last updated: July 11, 2026</p>

      <div className="space-y-4 text-xs text-slate-300 leading-relaxed border-t border-slate-850 pt-4">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100">1. Information We Collect</h3>
          <p>We collect credentials (email, hashed password), contact details (emails, phone numbers, birthdates) for scheduled queues, and AI parameters needed to generate greetings.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100">2. How We Use Information</h3>
          <p>Data is strictly used to deliver scheduled wishes, handle payment upgrades, configure AI prompts, and send system updates. We never sell customer data to third-party advertisers.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100">3. Data Security</h3>
          <p>We deploy secure JWT rotation, password hashing, and HTTPS protocols to safeguard transactions. Sensitive payment methods are routed entirely through Stripe and Razorpay integrations.</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

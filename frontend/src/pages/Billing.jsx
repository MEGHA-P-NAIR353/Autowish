import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CreditCard, FileText, CheckCircle2, AlertCircle, Calendar, ArrowUpRight } from 'lucide-react';
import api, { subscriptionAPI } from '../services/api';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';

const Billing = () => {
  const { fetchNotifications } = useData();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const success = searchParams.get('success');
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trigger webhooks mock validation if coming from checkout redirect
  useEffect(() => {
    const handleWebhookMock = async () => {
      if (sessionId && success === 'true') {
        try {
          await api.post('payments/webhook/', { transactionId: sessionId, status: 'Completed' });
          toast.success('Subscription upgraded successfully!');
          if (fetchNotifications) fetchNotifications();
        } catch (err) {
          toast.error('Payment verification failed.');
        }
      }
    };
    handleWebhookMock();
  }, [sessionId, success]);

  useEffect(() => {
    // Load mock transaction history (real Stripe/Razorpay would populate this from webhook)
    setHistory([
      { id: '1', date: 'Jul 11, 2026', desc: 'AutoWish Pro - Monthly Subscription', amount: '$9.99', status: 'Paid', method: 'Stripe' },
      { id: '2', date: 'Jun 11, 2026', desc: 'AutoWish Pro - Monthly Subscription', amount: '$9.99', status: 'Paid', method: 'Stripe' },
      { id: '3', date: 'May 11, 2026', desc: 'AutoWish Free Trial', amount: '$0.00', status: 'Paid', method: 'Free' },
    ]);
    setLoading(false);
  }, []);


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
        <p className="text-slate-400 text-sm">Manage payment history, subscription status, and download receipts.</p>
      </div>

      {sessionId && success === 'true' && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-2xl mb-4">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
          <div>
            <h4 className="text-sm font-bold">Payment Verified!</h4>
            <p className="text-xs text-emerald-400/80 mt-0.5">Your sandbox transaction `{sessionId}` was cleared. Your account tier has been updated.</p>
          </div>
        </div>
      )}

      {/* Subscription Card */}
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/15 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase rounded-full">Active Plan</span>
          <h2 className="text-2xl font-black">Pro Tier</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5"><Calendar size={13} /> Next renewal date: Aug 11, 2026</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/subscription"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl transition-all shadow-lg text-white"
          >
            Upgrade Plan
          </Link>
          <button
            onClick={() => toast('Subscription cancellation requested. Contact support for assistance.')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Cards & Invoices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Method */}
        <div className="md:col-span-1 bg-slate-850 border border-slate-800 p-5 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
            <CreditCard size={16} className="text-blue-500" /> Payment Methods
          </h3>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-10 h-7 bg-slate-800 border border-slate-700/60 rounded flex items-center justify-center font-bold text-[10px] tracking-widest text-slate-400">VISA</div>
            <div>
              <p className="text-xs font-bold">Visa ending in 4242</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Expires 12/28</p>
            </div>
            <span className="absolute top-2 right-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase">Primary</span>
          </div>
        </div>

        {/* Invoice List */}
        <div className="md:col-span-2 bg-slate-850 border border-slate-800 p-5 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
            <FileText size={16} className="text-blue-500" /> Recent Receipts
          </h3>
          
          <div className="border border-slate-800/80 rounded-2xl divide-y divide-slate-800/60 overflow-hidden">
            {history.map(item => (
              <div key={item.id} className="p-3.5 bg-slate-900/40 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-200">{item.desc}</p>
                  <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.method}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-200">{item.amount}</span>
                  <button 
                    onClick={() => toast.success('Downloading Invoice PDF...')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/40 text-slate-400 hover:text-white"
                  >
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;

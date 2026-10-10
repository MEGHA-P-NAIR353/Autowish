import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatInrPrice } from '../utils/pricing';

const PLAN_LABELS = { PRO: 'Pro', BUSINESS: 'Business', FREE: 'Free', ENTERPRISE: 'Enterprise' };

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const { refreshUser } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (paymentId) {
          const res = await api.get(`payments/${paymentId}/`);
          setPayment(res.data);
        }
        await refreshUser();
      } catch {
        // still show success shell if refresh worked
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paymentId, refreshUser]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  const planLabel = PLAN_LABELS[payment?.plan] || payment?.plan_name || 'Pro';

  return (
    <div className="max-w-lg mx-auto space-y-6 text-center py-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex justify-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-emerald-400" />
        </div>
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-emerald-400">Payment Successful</h1>
        <p className="text-slate-300 text-sm">
          Your {planLabel} subscription is now active.
        </p>
      </div>

      {payment && (
        <div className="bg-surface border border-line-soft rounded-2xl p-5 text-left space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Plan</span>
            <span className="text-slate-100 font-semibold">{payment.plan_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Amount</span>
            <span className="text-slate-100 font-semibold">{formatInrPrice(payment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Currency</span>
            <span className="text-slate-100">{payment.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Transaction</span>
            <span className="text-slate-100 font-mono text-xs">{payment.transaction_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status</span>
            <span className="text-emerald-400 font-semibold">Successful</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Payment date</span>
            <span className="text-slate-100">
              {new Date(payment.updated_at || payment.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          to="/dashboard"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/subscription"
          className="px-6 py-2.5 bg-raised hover:bg-raised-hover text-slate-200 font-semibold text-sm rounded-xl border border-line transition-all"
        >
          View Subscription
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;

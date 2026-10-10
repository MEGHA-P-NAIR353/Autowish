import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(!!paymentId);

  useEffect(() => {
    if (!paymentId) return;
    api.get(`payments/${paymentId}/`)
      .then(res => setPayment(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [paymentId]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-red-400" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 text-center py-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex justify-center"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <XCircle size={36} className="text-red-400" />
        </div>
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-red-400">Payment Failed</h1>
        <p className="text-slate-300 text-sm">
          Your payment was not completed. Your subscription has not been changed.
        </p>
      </div>

      {payment?.transaction_id && (
        <div className="bg-surface border border-line-soft rounded-2xl p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Reference</span>
            <span className="text-slate-200 font-mono text-xs">{payment.transaction_id}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        {payment?.plan && (
          <Link
            to={`/checkout/${payment.plan}`}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all"
          >
            Try Again
          </Link>
        )}
        <Link
          to="/subscription"
          className="px-6 py-2.5 bg-raised hover:bg-raised-hover text-slate-200 font-semibold text-sm rounded-xl border border-line transition-all"
        >
          Back to Subscription
        </Link>
      </div>
    </div>
  );
};

export default PaymentFailed;

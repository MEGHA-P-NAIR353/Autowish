import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CreditCard, ShieldCheck, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatInrPrice } from '../utils/pricing';

const DummyPayment = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cardName, setCardName] = useState('Demo User');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');

  useEffect(() => {
    const loadPayment = async () => {
      try {
        const res = await api.get(`payments/${paymentId}/`);
        if (res.data.status !== 'PENDING') {
          if (res.data.status === 'SUCCESS') {
            navigate(`/payment/success?paymentId=${paymentId}`, { replace: true });
          } else if (res.data.status === 'FAILED') {
            navigate(`/payment/failed?paymentId=${paymentId}`, { replace: true });
          }
          return;
        }
        setPayment(res.data);
      } catch {
        toast.error('Payment session not found.');
        navigate('/subscription');
      } finally {
        setLoading(false);
      }
    };
    loadPayment();
  }, [paymentId, navigate]);

  const handleProcess = async (outcome) => {
    if (processing) return;
    setProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      const res = await api.post('payments/dummy/process/', {
        payment_id: paymentId,
        outcome,
      });
      if (res.data.payment_status === 'SUCCESS') {
        navigate(`/payment/success?paymentId=${paymentId}`, {
          state: { result: res.data },
        });
      } else {
        navigate(`/payment/failed?paymentId=${paymentId}`, {
          state: { result: res.data },
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payment processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.post('payments/dummy/cancel/', { payment_id: paymentId });
      toast('Payment cancelled. Your subscription has not changed.');
      navigate('/subscription');
    } catch {
      navigate('/subscription');
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm text-slate-400">Loading payment session...</p>
      </div>
    );
  }

  if (!payment) return null;

  const price = formatInrPrice(payment.amount);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold tracking-wider uppercase rounded-full">
          <AlertTriangle size={12} /> Demo Payment · Test Mode
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">Secure Payment</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          This is a simulated payment environment. No real money will be charged.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-surface border border-line-soft rounded-3xl p-6 space-y-5"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-2">CARDHOLDER NAME</label>
              <input
                type="text"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                placeholder="Demo User"
                className="w-full px-4 py-2.5 bg-inset border border-line-soft rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-2">CARD NUMBER</label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full pl-10 pr-4 py-2.5 bg-inset border border-line-soft rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Demo only — not stored or transmitted.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">EXPIRY DATE</label>
                <input
                  type="text"
                  defaultValue="12/28"
                  placeholder="MM/YY"
                  className="w-full px-4 py-2.5 bg-inset border border-line-soft rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">CVV</label>
                <input
                  type="password"
                  defaultValue="123"
                  placeholder="•••"
                  className="w-full px-4 py-2.5 bg-inset border border-line-soft rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-line-soft pt-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simulate Payment Outcome</p>
            {processing ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-300">
                <Loader2 size={18} className="animate-spin text-blue-500" />
                Processing payment...
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleProcess('success')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all"
                >
                  Simulate Successful Payment
                </button>
                <button
                  onClick={() => handleProcess('failed')}
                  className="w-full py-3 bg-red-600/80 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all"
                >
                  Simulate Failed Payment
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleCancel}
            disabled={processing}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
          >
            <XCircle size={14} /> Cancel Payment
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-surface border border-line-soft rounded-3xl p-6 space-y-4 h-fit"
        >
          <h3 className="text-sm font-bold text-slate-200">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Plan</span>
              <span className="text-slate-200 font-semibold">{payment.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Price</span>
              <span className="text-slate-200">{price}/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Billing period</span>
              <span className="text-slate-200">Monthly</span>
            </div>
            <div className="border-t border-line-soft pt-3 flex justify-between">
              <span className="font-bold text-slate-100">Total</span>
              <span className="font-extrabold text-fg">{price}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-2">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>256-bit SSL simulated connection · No real charges</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DummyPayment;

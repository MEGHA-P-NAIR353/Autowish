import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Check, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatInrPrice } from '../utils/pricing';

const VALID_PLANS = ['PRO', 'BUSINESS'];

const Checkout = () => {
  const { plan: planParam } = useParams();
  const planId = (planParam || '').toUpperCase();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!VALID_PLANS.includes(planId)) {
      toast.error('Invalid checkout plan.');
      navigate('/subscription');
      return;
    }

    const fetchPlan = async () => {
      try {
        const res = await api.get('subscriptions/plans/');
        const found = (res.data.plans || []).find(p => p.id === planId);
        if (!found) {
          toast.error('Plan not found.');
          navigate('/subscription');
          return;
        }
        if (user?.profile?.subscription_plan === planId) {
          toast('You are already on this plan.');
          navigate('/subscription');
          return;
        }
        setPlan(found);
      } catch {
        toast.error('Failed to load plan details.');
        navigate('/subscription');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId, navigate, user]);

  const handleProceed = async () => {
    setProcessing(true);
    try {
      const res = await api.post('payments/dummy/create/', { plan: planId });
      navigate(`/payment/${res.data.payment_id}`);
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.detail || 'Could not start checkout. Please try again.');
      if (data?.code === 'ALREADY_SUBSCRIBED') navigate('/subscription');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!plan) return null;

  const price = formatInrPrice(plan.price);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Complete Your Upgrade</h1>
        <p className="text-slate-400 text-sm">Review your order before proceeding to secure payment.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-surface border border-line-soft rounded-3xl p-6 space-y-5"
        >
          <div>
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Selected Plan
            </span>
            <h2 className="text-2xl font-bold text-slate-100 mt-3">{plan.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{price}/month</p>
          </div>

          <ul className="space-y-2.5 pt-4 border-t border-line-soft">
            {plan.features.map((feat, idx) => (
              <li key={idx} className="flex gap-2 items-start text-xs text-slate-300">
                <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-surface border border-line-soft rounded-3xl p-6 space-y-5 h-fit"
        >
          <h3 className="text-sm font-bold text-slate-200">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="text-slate-200 font-semibold">{price}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Billing period</span>
              <span className="text-slate-200">Monthly</span>
            </div>
            <div className="border-t border-line-soft pt-3 flex justify-between">
              <span className="font-bold text-slate-100">Total</span>
              <span className="font-extrabold text-fg text-lg">{price}</span>
            </div>
          </div>

          <button
            onClick={handleProceed}
            disabled={processing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {processing && <Loader2 size={16} className="animate-spin" />}
            Proceed to Payment
          </button>

          <Link
            to="/subscription"
            className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Plans
          </Link>
        </motion.div>
      </div>

      <div className="flex items-center gap-3 justify-center text-xs text-slate-500">
        <ShieldCheck size={16} className="text-emerald-500" />
        <span>Your subscription will only activate after successful payment confirmation.</span>
      </div>
    </div>
  );
};

export default Checkout;

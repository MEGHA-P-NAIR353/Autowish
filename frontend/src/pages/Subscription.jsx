import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Subscription = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasingPlan, setPurchasingPlan] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('subscriptions/plans/');
        setPlans(res.data.plans);
      } catch (err) {
        toast.error('Failed to load subscription plans.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId) => {
    if (user?.profile?.subscription_plan === planId) {
      toast('You are already subscribed to this plan.');
      return;
    }
    
    try {
      setPurchasingPlan(planId);
      const res = await api.post('payments/checkout/', { planId, gateway: 'mock' });
      toast.success('Redirecting to checkout sandbox...');
      
      // Simulate Stripe/Razorpay redirect by going to checkoutUrl
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      toast.error('Payment checkout initiation failed.');
    } finally {
      setPurchasingPlan(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Flexible SaaS Subscription Plans</h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          Upgrade your plan to unlock unlimited wish logs, custom prompt templates, multi-channel (SMS/WhatsApp) deliveries, and team access.
        </p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          {plans.map(plan => {
            const isCurrent = user?.profile?.subscription_plan === plan.id;
            return (
              <div 
                key={plan.id}
                className={`bg-slate-850 border rounded-3xl p-6 flex flex-col justify-between transition-all relative ${
                  isCurrent 
                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 border border-blue-500 text-[10px] font-extrabold tracking-wider px-3 py-1 rounded-full uppercase">
                    Current Plan
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-100">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline">
                      <span className="text-3xl font-extrabold text-white">${plan.price}</span>
                      <span className="text-slate-500 text-xs ml-1">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-4 border-t border-slate-800">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex gap-2 items-start text-xs text-slate-300">
                        <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || purchasingPlan !== null}
                    className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : purchasingPlan === plan.id
                        ? 'bg-blue-600/50 text-white cursor-wait'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                    }`}
                  >
                    {purchasingPlan === plan.id && <Loader2 size={12} className="animate-spin" />}
                    {isCurrent ? 'Active' : `Upgrade to ${plan.id}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Footer */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center bg-slate-900/40 border border-slate-850 p-4 rounded-2xl text-center sm:text-left">
        <ShieldCheck className="text-emerald-400" size={24} />
        <p className="text-xs text-slate-400">
          All checkouts are simulated securely using our sandbox payment gateway. No real credit cards or financial charges are required.
        </p>
      </div>
    </div>
  );
};

export default Subscription;

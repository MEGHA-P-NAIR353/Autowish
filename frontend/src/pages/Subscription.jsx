import React, { useState, useEffect } from 'react';
import { Check, ShieldCheck, BarChart3, Sparkles, Zap, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  getPlanPriceDisplay,
  getPlanButtonLabel,
  formatUsageLimit,
} from '../utils/pricing';
import {
  GlassCard, GlassButton, PageHeader, Skeleton
} from '../components/ui';

const UsageMeter = ({ label, used, limit, remaining }) => {
  const hasLimit = limit !== null && limit !== undefined;
  const pct = hasLimit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold text-fg">{label}</span>
        <span className="text-xs text-slate-400 tabular-nums">
          {used} / {formatUsageLimit(limit)} used this month
        </span>
      </div>
      {hasLimit && (
        <div className="h-2 bg-raised rounded-full overflow-hidden border border-line-soft">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {remaining !== null && remaining !== undefined && (
        <p className="text-[11px] text-slate-500">{remaining} remaining</p>
      )}
    </div>
  );
};

const Subscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('subscriptions/plans/');
        setPlans(res.data.plans || []);
        setUsage(res.data.usage || null);
      } catch {
        toast.error('Failed to load subscription plans.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = (plan) => {
    const planId = plan.id;
    const isCurrent = user?.profile?.subscription_plan === planId;

    if (isCurrent) {
      toast('You are already subscribed to this plan.');
      return;
    }

    if (plan.contact_sales) {
      navigate('/contact?subject=enterprise');
      return;
    }

    if (!plan.checkout_available) {
      toast('This plan is not available for direct checkout.');
      return;
    }

    navigate(`/checkout/${planId}`);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Sparkles size={14} />
          <span>Predictable SaaS Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
          Flexible Subscription Plans
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
          Choose the plan tailored to your celebration and outreach volume. All prices shown in Indian Rupees (INR).
        </p>
      </div>

      {/* Usage summary for current plan */}
      {usage && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BarChart3 size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-fg">Current Month Usage</h2>
              <p className="text-xs text-slate-500">Track your automated and AI allocations</p>
            </div>
            <span className="ml-auto text-[11px] font-bold tracking-wider uppercase bg-raised text-indigo-400 border border-line-soft px-3 py-1 rounded-full">
              {usage.plan} Plan
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <UsageMeter
              label="Scheduled Wishes"
              used={usage.scheduled_wishes.used}
              limit={usage.scheduled_wishes.limit}
              remaining={usage.scheduled_wishes.remaining}
            />
            <UsageMeter
              label="AI Generations"
              used={usage.ai_generations.used}
              limit={usage.ai_generations.limit}
              remaining={usage.ai_generations.remaining}
            />
          </div>
        </GlassCard>
      )}

      {/* Pricing Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <GlassCard key={n} className="p-6 space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map(plan => {
            const isCurrent = user?.profile?.subscription_plan === plan.id;
            const priceDisplay = getPlanPriceDisplay(plan);
            const isEnterprise = plan.is_custom_pricing;
            const isPro = plan.id === 'PRO' || plan.name?.toLowerCase().includes('pro');
            const buttonLabel = getPlanButtonLabel(plan, isCurrent);
            const isDisabled = isCurrent || (plan.id === 'FREE' && !isCurrent);

            return (
              <GlassCard
                key={plan.id}
                className={`p-6 flex flex-col justify-between relative transition-all duration-300 ${
                  isCurrent
                    ? '!border-indigo-500 shadow-glow'
                    : isPro
                    ? 'border-indigo-500/40 bg-gradient-to-b from-indigo-500/[0.08] to-transparent'
                    : isEnterprise
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/[0.08] to-transparent'
                    : ''
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold tracking-wider px-3.5 py-1 rounded-full uppercase shadow-md">
                    Current Plan
                  </span>
                )}

                {isPro && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold tracking-wider px-3 py-1 rounded-full uppercase shadow-sm">
                    Most Popular
                  </span>
                )}

                {isEnterprise && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-bold tracking-wider px-3 py-1 rounded-full uppercase shadow-sm">
                    Enterprise
                  </span>
                )}

                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-lg text-fg">{plan.name}</h3>
                    <div className="mt-3">
                      <div className="flex items-baseline">
                        <span className={`text-3xl font-extrabold ${isEnterprise ? 'text-amber-400' : 'text-fg'}`}>
                          {priceDisplay.main}
                        </span>
                        {priceDisplay.period && (
                          <span className="text-slate-500 text-xs ml-1.5 font-medium">{priceDisplay.period}</span>
                        )}
                      </div>
                      {priceDisplay.subtitle && (
                        <p className="text-[11px] text-slate-400 mt-1">{priceDisplay.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 pt-4 border-t border-line-soft">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-300 leading-snug">
                        <Check size={14} className={`shrink-0 mt-0.5 ${isEnterprise ? 'text-amber-400' : 'text-indigo-400'}`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-4 border-t border-line-soft/60">
                  <GlassButton
                    variant={isCurrent ? 'secondary' : isEnterprise ? 'accent' : isPro ? 'primary' : 'secondary'}
                    className="w-full"
                    disabled={isDisabled}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {buttonLabel}
                  </GlassButton>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Security Footer */}
      <GlassCard className="p-4 flex flex-col sm:flex-row gap-3.5 items-center justify-center text-center sm:text-left">
        <ShieldCheck className="text-emerald-400 shrink-0" size={24} />
        <p className="text-xs text-slate-400">
          All checkouts are simulated securely using our sandbox payment gateway. No real credit cards or financial charges are required.
        </p>
      </GlassCard>
    </div>
  );
};

export default Subscription;

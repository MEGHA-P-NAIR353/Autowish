/**
 * Centralized pricing display utilities for subscription plans.
 * Plan data is sourced from the backend API; this module only handles formatting.
 */

export function formatInrPrice(amount) {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPlanPriceDisplay(plan) {
  if (plan.is_custom_pricing || plan.price_display === 'Custom') {
    return {
      main: 'Custom',
      period: null,
      subtitle: plan.price_subtitle || 'Tailored pricing for your organization',
    };
  }
  return {
    main: formatInrPrice(plan.price),
    period: '/month',
    subtitle: null,
  };
}

export function getPlanButtonLabel(plan, isCurrent) {
  if (isCurrent) return 'Active';
  if (plan.contact_sales) return 'Contact Sales';
  if (!plan.checkout_available) return 'Included';
  return `Upgrade to ${plan.id}`;
}

export function formatUsageLimit(limit) {
  if (limit === null || limit === undefined) return 'Unlimited';
  return limit.toLocaleString('en-IN');
}

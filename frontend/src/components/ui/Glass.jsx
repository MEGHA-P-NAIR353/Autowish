import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/** Base glass surface. Use for large containers (blurred). */
export const GlassPanel = forwardRef(({ as: Tag = 'div', strong = false, className, children, ...rest }, ref) => (
  <Tag ref={ref} className={cx(strong ? 'glass-panel-strong' : 'glass-panel', className)} {...rest}>
    {children}
  </Tag>
));
GlassPanel.displayName = 'GlassPanel';

/** Standard content card. */
export const GlassCard = forwardRef(({ as: Tag = 'div', selected = false, className, children, ...rest }, ref) => (
  <Tag ref={ref} className={cx('glass-card', selected && 'glass-card-selected', className)} {...rest}>
    {children}
  </Tag>
));
GlassCard.displayName = 'GlassCard';

/** Interactive card with elevation on hover; animates in. */
export const GlassCardHover = forwardRef(({ selected = false, delay = 0, className, children, ...rest }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
    className={cx('glass-card glass-card-hover', selected && 'glass-card-selected', className)}
    {...rest}
  >
    {children}
  </motion.div>
));
GlassCardHover.displayName = 'GlassCardHover';

/** Titled section container (glass, padded). */
export const GlassSection = ({ title, description, actions, className, bodyClassName, children, ...rest }) => (
  <section className={cx('glass-section', className)} {...rest}>
    {(title || actions) && (
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title && <h2 className="text-base font-semibold text-fg tracking-tight">{title}</h2>}
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const GlassHeader = forwardRef(({ className, children, ...rest }, ref) => (
  <header ref={ref} className={cx('glass-header', className)} {...rest}>{children}</header>
));
GlassHeader.displayName = 'GlassHeader';

export const GlassSidebar = forwardRef(({ className, children, ...rest }, ref) => (
  <aside ref={ref} className={cx('glass-sidebar', className)} {...rest}>{children}</aside>
));
GlassSidebar.displayName = 'GlassSidebar';

/**
 * Metric card: icon container, large value, supporting text and a subtle accent glow.
 * accent: blue | violet | emerald | amber | rose | indigo | pink
 */
export const GlassStatCard = ({
  icon: Icon, label, value, hint, accent = 'blue', loading = false, error = false, delay = 0, children, className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
    className={cx('stat-card', `stat-accent-${accent}`, error && '!border-rose-500/40', className)}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-400">{label}</p>
        {loading ? (
          <div className="skeleton h-8 w-20 mt-2" aria-label="Loading" role="status" />
        ) : (
          <p className={cx('stat-number mt-1.5', error && 'text-rose-400')}>{error ? 'Error' : value}</p>
        )}
        {hint && !loading && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
      </div>
      {Icon && (
        <span className="stat-icon" aria-hidden="true"><Icon size={20} /></span>
      )}
    </div>
    {children}
  </motion.div>
);

export const PageHeader = ({ title, subtitle, icon: Icon, actions, className }) => (
  <div className={cx('flex flex-wrap items-center justify-between gap-4 mb-8', className)}>
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <span className="stat-icon stat-accent-indigo hidden sm:inline-flex" aria-hidden="true"><Icon size={20} /></span>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </div>
);

import React from 'react';

/** Shimmering placeholder block. Decorative: hidden from assistive tech. */
export const Skeleton = ({ className = '' }) => <div aria-hidden="true" className={`skeleton ${className}`} />;

/** Skeleton for table / list rows. */
export const SkeletonRows = ({ rows = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
      </div>
    ))}
    <span className="sr-only">Loading…</span>
  </div>
);

/** Skeleton for a card grid. */
export const SkeletonCards = ({ count = 6, className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' }) => (
  <div className={className} role="status" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="glass-card p-5 space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
    <span className="sr-only">Loading…</span>
  </div>
);

export default Skeleton;

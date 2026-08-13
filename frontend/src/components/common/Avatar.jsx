import React from 'react';

/**
 * Reusable Avatar component:
 * Displays image if valid, otherwise renders uppercase initials in a circular gradient badge.
 */
const GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-600 to-orange-600',
  'from-indigo-600 to-purple-600',
  'from-rose-600 to-red-600',
];

export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function Avatar({ src, name = 'User', size = 'md', className = '' }) {
  const [imgError, setImgError] = React.useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg font-bold',
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;

  // Determine a deterministic gradient index based on name
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradientClass = GRADIENTS[Math.abs(hash) % GRADIENTS.length];

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${selectedSizeClass} rounded-full object-cover ring-1 ring-slate-700/60 shadow-sm ${className}`}
      />
    );
  }

  const initials = getInitials(name);

  return (
    <div
      className={`${selectedSizeClass} rounded-full bg-gradient-to-br ${gradientClass} text-white font-semibold flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/10 ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
}

import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon = Inbox,
  title = 'No data available',
  description = 'There are no records to display at the moment.',
  actionLabel,
  onAction,
  action,
  className = '',
}) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon;
    return <IconComponent size={22} aria-hidden="true" />;
  };

  const finalActionLabel = action?.label || actionLabel;
  const finalOnAction = action?.onClick || onAction;

  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl border border-dashed border-line bg-inset/40 ${className}`}>
      <div className="relative mb-4">
        <span aria-hidden="true" className="absolute inset-0 -m-3 rounded-full bg-indigo-500/10 blur-xl" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          {renderIcon()}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">{description}</p>
      {finalActionLabel && finalOnAction && (
        <button
          type="button"
          onClick={finalOnAction}
          className="btn-primary btn-sm mt-5"
        >
          {finalActionLabel}
        </button>
      )}
    </div>
  );
}

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
    return <IconComponent size={22} />;
  };

  const finalActionLabel = action?.label || actionLabel;
  const finalOnAction = action?.onClick || onAction;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-slate-800/40 border border-slate-800 rounded-2xl ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3.5 shadow-inner">
        {renderIcon()}
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      {finalActionLabel && finalOnAction && (
        <button
          type="button"
          onClick={finalOnAction}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
        >
          {finalActionLabel}
        </button>
      )}
    </div>
  );
}


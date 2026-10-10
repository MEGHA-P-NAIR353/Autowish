import React from 'react';

const STATUS_CLASS = {
  scheduled: 'status-scheduled', upcoming: 'status-scheduled', pending: 'status-pending',
  processing: 'status-processing', queued: 'status-processing', sending: 'status-processing',
  sent: 'status-sent', delivered: 'status-sent', success: 'status-sent', completed: 'status-sent', active: 'status-sent', today: 'status-today', paid: 'status-sent',
  failed: 'status-failed', error: 'status-failed', bounced: 'status-failed', rejected: 'status-failed',
  cancelled: 'status-cancelled', canceled: 'status-cancelled', inactive: 'status-cancelled', draft: 'status-cancelled', expired: 'status-cancelled',
};

/** Semantic status chip: tinted colour + leading dot + text label (never colour alone). */
const StatusBadge = ({ status, label, className = '' }) => {
  const key = String(status ?? '').toLowerCase().trim();
  const cls = STATUS_CLASS[key] || 'status-cancelled';
  return <span className={`status ${cls} ${className}`}>{label ?? status}</span>;
};

export default StatusBadge;

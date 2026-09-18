import React from 'react';

export default function Badge({ children, status, variant, className = '' }) {
  const normalized = (status || variant || children || '').toString().toUpperCase();

  const styles = {
    // Job statuses
    OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-xs font-semibold ring-1 ring-emerald-500/15',
    CLOSED: 'bg-zinc-100 text-zinc-600 border-zinc-200 shadow-xs font-medium',

    // Candidate workflow statuses
    APPLIED: 'bg-zinc-100 text-zinc-700 border-zinc-200 shadow-xs font-medium',
    EVALUATED: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-xs font-semibold ring-1 ring-amber-500/15',
    SUBMITTED_TO_COMPANY: 'bg-blue-50 text-blue-700 border-blue-200/90 shadow-xs font-semibold ring-1 ring-blue-500/15',
    SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200/90 shadow-xs font-semibold ring-1 ring-blue-500/15',
    ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-xs font-bold ring-1 ring-emerald-500/15',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200/90 shadow-xs font-semibold ring-1 ring-rose-500/15',

    // Roles & general
    HR: 'bg-zinc-950 text-white border-zinc-800 shadow-xs font-medium',
    COMPANY: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs font-semibold',

    // Tech Lead statuses
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-xs font-semibold ring-1 ring-emerald-500/15',
    INACTIVE: 'bg-zinc-100 text-zinc-500 border-zinc-200 shadow-xs font-medium',

    // Interview Invitation statuses
    PENDING: 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs font-semibold ring-1 ring-amber-500/20',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-xs font-bold ring-1 ring-emerald-500/15',
    EXPIRED: 'bg-zinc-100 text-zinc-500 border-zinc-300 shadow-xs font-medium',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200/90 shadow-xs font-semibold',
    NOT_SENT: 'bg-zinc-100 text-zinc-500 border-zinc-200 shadow-xs font-normal',
  };

  const currentStyle =
    styles[normalized] || 'bg-zinc-100 text-zinc-700 border-zinc-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${currentStyle} ${className}`}
    >
      {children || status}
    </span>
  );
}

import React from 'react';

export default function Badge({ children, status, variant, className = '' }) {
  const normalized = (status || variant || children || '').toString().toUpperCase();

  const styles = {
    // Job statuses
    OPEN: 'bg-emerald-500/10 text-emerald-700 border-emerald-300/60 font-semibold',
    CLOSED: 'bg-zinc-100 text-zinc-600 border-zinc-200/80 font-medium',

    // Candidate workflow statuses
    APPLIED: 'bg-zinc-100/90 text-zinc-700 border-zinc-200/80 font-medium',
    EVALUATED: 'bg-amber-500/15 text-amber-800 border-amber-300/70 font-semibold',
    SUBMITTED_TO_COMPANY: 'bg-blue-500/10 text-blue-700 border-blue-300/60 font-semibold',
    SUBMITTED: 'bg-blue-500/10 text-blue-700 border-blue-300/60 font-semibold',
    ACCEPTED: 'bg-emerald-500/15 text-emerald-800 border-emerald-300/70 font-bold',
    REJECTED: 'bg-rose-500/10 text-rose-700 border-rose-300/60 font-semibold',

    // Roles & general
    HR: 'bg-zinc-900 text-white border-zinc-800 font-medium',
    COMPANY: 'bg-blue-600 text-white border-blue-500 font-semibold',

    // Tech Lead statuses
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-300/60 font-semibold',
    INACTIVE: 'bg-zinc-100 text-zinc-500 border-zinc-200 font-medium',

    // Interview Invitation statuses
    PENDING: 'bg-amber-500/15 text-amber-800 border-amber-300/80 font-semibold',
    COMPLETED: 'bg-emerald-500/15 text-emerald-700 border-emerald-300/70 font-bold',
    EXPIRED: 'bg-zinc-100 text-zinc-500 border-zinc-300 font-medium',
    CANCELLED: 'bg-rose-500/10 text-rose-700 border-rose-300/60 font-semibold',
    NOT_SENT: 'bg-zinc-100 text-zinc-500 border-zinc-200 font-normal',
  };

  const currentStyle =
    styles[normalized] || 'bg-zinc-100/80 text-zinc-700 border-zinc-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm transition-all ${currentStyle} ${className}`}
    >
      {children || status}
    </span>
  );
}

import React from 'react';

export default function Badge({ children, status, variant, className = '' }) {
  const normalized = (status || variant || children || '').toString().toUpperCase();

  const styles = {
    OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
    APPLIED: 'bg-slate-100 text-slate-700 border-slate-200',
    EVALUATED: 'bg-sky-50 text-sky-700 border-sky-200',
    SUBMITTED_TO_COMPANY: 'bg-brand-50 text-brand-700 border-brand-200',
    SUBMITTED: 'bg-brand-50 text-brand-700 border-brand-200',
    ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    HR: 'bg-brand-50 text-brand-700 border-brand-200',
    COMPANY: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const currentStyle =
    styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle} ${className}`}
    >
      {children || status}
    </span>
  );
}

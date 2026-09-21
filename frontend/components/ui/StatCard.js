import React from 'react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  description,
  trend,
  color = 'blue',
  onClick,
}) {
  const iconColorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200/80 group-hover:bg-blue-600 group-hover:text-white',
    zinc: 'bg-slate-100 text-slate-700 border-slate-200/80 group-hover:bg-slate-900 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 group-hover:bg-emerald-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/80 group-hover:bg-amber-500 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-600 border-rose-200/80 group-hover:bg-rose-600 group-hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200/80 group-hover:bg-indigo-600 group-hover:text-white',
  };

  const topAccentStyles = {
    blue: 'hover:border-blue-400/80 before:bg-blue-500',
    zinc: 'hover:border-slate-400/80 before:bg-slate-700',
    emerald: 'hover:border-emerald-400/80 before:bg-emerald-500',
    amber: 'hover:border-amber-400/80 before:bg-amber-500',
    rose: 'hover:border-rose-400/80 before:bg-rose-500',
    indigo: 'hover:border-indigo-400/80 before:bg-indigo-500',
  };

  const selectedColor = iconColorStyles[color] || iconColorStyles.blue;
  const selectedAccent = topAccentStyles[color] || topAccentStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:opacity-0 group-hover:before:opacity-100 before:transition-opacity ${selectedAccent} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 shadow-xs ${selectedColor}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-slate-500 font-medium">
          {description}
        </p>
      )}
    </div>
  );
}

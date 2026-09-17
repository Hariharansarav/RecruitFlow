import React from 'react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  description,
  trend,
  color = 'zinc',
  onClick,
}) {
  const iconColorStyles = {
    zinc: 'bg-zinc-100 text-zinc-900 border-zinc-200/80 group-hover:bg-zinc-950 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 group-hover:bg-emerald-600 group-hover:text-white',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80 group-hover:bg-blue-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80 group-hover:bg-amber-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80 group-hover:bg-rose-600 group-hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 group-hover:bg-indigo-600 group-hover:text-white',
  };

  const selectedColor = iconColorStyles[color] || iconColorStyles.zinc;

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors duration-200 ${selectedColor}`}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-zinc-950 tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1.5 text-xs text-zinc-500 font-normal">
          {description}
        </p>
      )}
    </div>
  );
}

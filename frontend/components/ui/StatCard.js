import React from 'react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  description,
  trend,
  color = 'brand',
}) {
  const iconColorStyles = {
    brand: 'bg-brand-50 text-brand-600',
    violet: 'bg-accent-50 text-accent-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  };

  const selectedColor = iconColorStyles[color] || iconColorStyles.brand;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            {trend}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-slate-500 font-normal">
          {description}
        </p>
      )}
    </div>
  );
}

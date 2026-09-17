import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium whitespace-nowrap flex-nowrap transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const variants = {
    primary:
      'bg-zinc-950 hover:bg-zinc-900 active:bg-black text-white font-medium tracking-tight shadow-xs hover:shadow-sm border border-zinc-800/80 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 active:scale-[0.98]',
    secondary:
      'bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-900 font-medium tracking-tight border border-zinc-200/90 hover:border-zinc-300 shadow-xs focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 active:scale-[0.98]',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium tracking-tight shadow-xs border border-rose-700/80 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 active:scale-[0.98]',
    success:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium tracking-tight shadow-xs border border-emerald-700/80 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98]',
    outline:
      'bg-white hover:bg-zinc-50/90 active:bg-zinc-100 text-zinc-800 hover:text-zinc-950 font-medium tracking-tight border border-zinc-300/90 hover:border-zinc-400 shadow-xs focus-visible:ring-2 focus-visible:ring-zinc-950 active:scale-[0.98]',
    ghost:
      'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80 active:bg-zinc-200/70 font-medium active:scale-[0.98]',
    dark:
      'bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-medium tracking-tight border border-zinc-800 shadow-xs active:scale-[0.98]',
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1 gap-1.5 rounded-lg',
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg font-medium',
    md: 'text-sm px-3.5 py-2 gap-2 rounded-xl font-medium',
    lg: 'text-sm font-semibold px-5 py-2.5 gap-2 rounded-xl',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.md
      } ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 text-current flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      {children}
    </button>
  );
}

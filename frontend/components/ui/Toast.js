'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeConfig = {
    success: {
      bg: 'bg-zinc-950 border-zinc-800 text-white shadow-2xl',
      icon: <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />,
    },
    error: {
      bg: 'bg-zinc-950 border-red-900/60 text-white shadow-2xl',
      icon: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-zinc-950 border-zinc-800 text-white shadow-2xl',
      icon: <Info className="w-5 h-5 text-zinc-300 flex-shrink-0" />,
    },
  };

  const current = typeConfig[type] || typeConfig.info;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slide-up">
      <div
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${current.bg}`}
        role="alert"
      >
        {current.icon}
        <span className="text-sm font-medium flex-1 tracking-tight">{message}</span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

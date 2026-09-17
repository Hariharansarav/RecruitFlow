'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import Button from './Button';

export default function Modal({
  isOpen,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  iconType = 'info',
  isLoading = false,
  onConfirm,
  onClose,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDestructive = confirmVariant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-6 text-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              isDestructive
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-zinc-100 text-zinc-900 border-zinc-200'
            }`}
          >
            {isDestructive ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="modal-title"
              className="text-lg font-bold text-zinc-950 tracking-tight"
            >
              {title}
            </h3>
            {message && (
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                {message}
              </p>
            )}
            {children}
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-zinc-400 hover:text-zinc-900 p-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
            className={isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

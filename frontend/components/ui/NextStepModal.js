'use client';

import React, { useEffect } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  X,
  Briefcase,
  UserCheck,
  Calendar,
  Send,
} from 'lucide-react';
import Button from './Button';

/**
 * NextStepModal - Interactive Guided Post-Step Popup
 *
 * Appears after completing a major workflow stage (e.g. Create Job, Add Candidate,
 * AI Resume Screening, Interview Scheduling) to guide the HR admin to the next stage.
 */
export default function NextStepModal({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText = 'Stage Completed',
  badgeColor = 'bg-slate-100 text-slate-700 border-slate-200',
  icon: Icon = CheckCircle2,
  iconColor = 'bg-slate-900 text-white',
  itemSummary, // { label, value, subtext }
  nextStageTitle = 'Recommended Next Stage',
  nextStageDescription,
  primaryAction, // { label, onClick, icon }
  secondaryAction, // { label, onClick }
  tertiaryAction, // { label, onClick }
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden text-slate-900 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="relative p-6 sm:p-7 pb-5 bg-white border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0 shadow-sm`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 pr-6">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badgeColor} mb-2`}
              >
                {badgeText}
              </span>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Summary Card */}
          {itemSummary && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {itemSummary.label}
              </span>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-base font-bold text-slate-900">
                  {itemSummary.value}
                </span>
                {itemSummary.tag && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {itemSummary.tag}
                  </span>
                )}
              </div>
              {itemSummary.subtext && (
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {itemSummary.subtext}
                </p>
              )}
            </div>
          )}

          {/* Next Recommended Stage Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span>{nextStageTitle}</span>
            </div>
            {nextStageDescription && (
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {nextStageDescription}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-6 sm:p-7 pt-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          {secondaryAction && (
            <Button
              variant="outline"
              size="md"
              onClick={secondaryAction.onClick}
              className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
            >
              {secondaryAction.label}
            </Button>
          )}

          {tertiaryAction && (
            <Button
              variant="ghost"
              size="md"
              onClick={tertiaryAction.onClick}
              className="text-slate-500 hover:text-slate-900 text-xs font-semibold"
            >
              {tertiaryAction.label}
            </Button>
          )}

          {primaryAction && (
            <Button
              variant="primary"
              size="md"
              onClick={primaryAction.onClick}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm"
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
              <span>{primaryAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

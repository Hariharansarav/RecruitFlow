'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  Maximize2,
  Minimize2,
  Download,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  User,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function ResumePreviewModal({
  isOpen,
  onClose,
  resumeUrl,
  candidate,
  job,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset loading states when URL changes
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
      setIframeError(false);
    }
  }, [isOpen, resumeUrl]);

  if (!isOpen) return null;

  const candidateName = candidate?.name || 'Candidate';
  const roleTitle = job?.title || candidate?.job?.title || 'General';
  const hasResume = Boolean(resumeUrl && resumeUrl.trim().length > 0);

  // Determine if it's a PDF
  const isPdf = hasResume && resumeUrl.toLowerCase().includes('.pdf');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
    >
      <div
        className={`bg-white rounded-3xl border border-zinc-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'w-full max-w-5xl h-[90vh] max-h-[860px]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between gap-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="resume-modal-title"
                  className="text-base sm:text-lg font-bold text-white truncate"
                >
                  {candidateName}&apos;s Resume
                </h2>
                {hasResume && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {isPdf ? 'PDF Document' : 'Document Preview'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                <span>Applied for:</span>
                <span className="text-zinc-200 font-semibold">{roleTitle}</span>
                {candidate?.email && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">{candidate.email}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {hasResume && (
              <>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex"
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors border border-zinc-700 cursor-pointer"
                    title="Open document in a new browser tab for dual-screen viewing"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in New Tab</span>
                  </button>
                </a>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close viewer (Esc)"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Candidate Context Quick Strip */}
        <div className="px-5 py-2.5 bg-zinc-50 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap text-zinc-600">
            {candidate?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono">{candidate.phone}</span>
              </span>
            )}
            {candidate?.skills && (
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-500">Candidate Skills:</span>
                <span className="text-zinc-800 font-medium truncate max-w-md">
                  {candidate.skills}
                </span>
              </span>
            )}
          </div>

          {hasResume && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 hidden md:inline">
                Interviewer tip: Use this resume preview to cross-examine technical achievements.
              </span>
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 sm:hidden"
              >
                <span>New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Main Document Viewer Body */}
        <div className="flex-1 bg-zinc-100 relative overflow-hidden flex flex-col">
          {!hasResume ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-zinc-900">
                  No Resume Document Uploaded
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  No resume link or document was provided for candidate{' '}
                  <span className="font-semibold text-zinc-800">{candidateName}</span>.
                  You can proceed with the interview assessment based on the requisition skills.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close Viewer
              </Button>
            </div>
          ) : (
            /* Document Preview with Iframe */
            <div className="relative flex-1 w-full h-full flex flex-col">
              {/* Iframe Loading Overlay */}
              {iframeLoading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-2xs flex flex-col items-center justify-center z-10 space-y-3">
                  <div className="w-8 h-8 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-zinc-600">
                    Loading Candidate Resume...
                  </p>
                </div>
              )}

              {/* Embedded Document Frame */}
              <iframe
                src={resumeUrl}
                title={`${candidateName} Resume Preview`}
                className="w-full h-full border-0 bg-white flex-1"
                onLoad={() => setIframeLoading(false)}
                onError={() => {
                  setIframeLoading(false);
                  setIframeError(true);
                }}
              />

              {/* Bottom Fallback Banner */}
              <div className="px-4 py-2.5 bg-white border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 shrink-0">
                <div className="flex items-center gap-2 text-center sm:text-left">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>
                    Having trouble viewing the embedded document or receiving a browser preview block?
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Full Browser Tab</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

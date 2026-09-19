'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  UserCheck,
  Briefcase,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import interviewInvitationService from '@/services/interviewInvitationService';
import emailService from '@/services/emailService';

export default function SendMailModal({
  isOpen,
  candidate,
  onClose,
  onOpenEditCandidate,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Check for existing invitation when modal opens
  useEffect(() => {
    if (!isOpen || !candidate) return;

    setServerError(null);
    setSuccessInfo(null);
    setCopied(false);
    setInvitation(null);

    let isMounted = true;
    if (candidate.tech_lead_id || candidate.tech_lead) {
      setLoadingExisting(true);
      interviewInvitationService
        .getInvitationByCandidateId(candidate.id)
        .then((data) => {
          if (isMounted && data) {
            setInvitation(data);
          }
        })
        .catch(() => {
          // No prior invitation exists, which is normal
        })
        .finally(() => {
          if (isMounted) setLoadingExisting(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, candidate]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !candidate) return null;

  const techLead = candidate.tech_lead;
  const hasTechLead = Boolean(techLead?.name && techLead?.email);
  const isTechLeadActive = techLead?.status !== 'INACTIVE';

  const handleSendEmail = async () => {
    if (!hasTechLead) {
      setServerError('Please assign a Tech Lead before sending an interview invitation.');
      return;
    }

    if (!isTechLeadActive) {
      setServerError('Assigned Tech Lead is currently inactive. Please assign an active Tech Lead.');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      // Dispatches invitation via backend Google OAuth2 + Gmail API
      const result = await interviewInvitationService.sendInvitation(candidate.id);
      const invData = result?.invitation || (await interviewInvitationService.getInvitationByCandidateId(candidate.id));
      setInvitation(invData);

      setSuccessInfo('Interview invitation email sent successfully to Tech Lead via Gmail!');
      onSuccess?.('Interview invitation email sent to Tech Lead!');
    } catch (err) {
      console.error('Failed to send interview invitation:', err);
      const msg =
        err.response?.data?.message || err.message || 'Failed to dispatch invitation email.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = invitation?.evaluation_url;
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-mail-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 text-slate-900 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="send-mail-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
              >
                Send Interview Invitation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch technical evaluation link to the assigned interviewer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Success Alert */}
        {successInfo && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span className="font-medium">{successInfo}</span>
          </div>
        )}

        {/* Candidate & Job Summary Card */}
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Candidate
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-200/70 text-zinc-700 font-semibold">
              ID #{candidate.id}
            </span>
          </div>
          <div className="text-sm font-bold text-zinc-950 flex items-center justify-between">
            <span>{candidate.name}</span>
            <span className="text-xs font-normal text-zinc-500 truncate max-w-[200px]">
              {candidate.email}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 pt-1 border-t border-zinc-200/60">
            <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
            <span>Role:</span>
            <span className="font-semibold text-zinc-800">
              {candidate.job?.title || 'General Requisition'}
            </span>
          </div>
        </div>

        {/* Tech Lead Recipient Details */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Interviewer (Tech Lead)
          </label>

          {hasTechLead ? (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {techLead.name?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-950 leading-tight">
                      {techLead.name}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono">
                      {techLead.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isTechLeadActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {techLead.status || 'ACTIVE'}
                </span>
              </div>

              {!isTechLeadActive && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                  <span>Tech Lead is inactive. Reassign before sending.</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenEditCandidate?.(candidate);
                    }}
                    className="font-semibold underline hover:text-rose-900 text-xs"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    No Tech Lead Assigned
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    An interview invitation email can only be dispatched to an assigned Tech Lead.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose?.();
                  onOpenEditCandidate?.(candidate);
                }}
                className="w-full text-xs"
              >
                Assign Tech Lead Now
              </Button>
            </div>
          )}
        </div>

        {/* Evaluation Link Preview (if exists or generated) */}
        {invitation?.evaluation_url && (
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                Secure Evaluation Link
              </span>
              <span className="text-[11px] text-indigo-600 font-medium">
                Valid for 7 days
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                readOnly
                value={invitation.evaluation_url}
                className="flex-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-mono text-zinc-800 truncate select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 flex items-center gap-1.5 transition-colors"
                title="Copy Link"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {successInfo ? 'Done' : 'Cancel'}
          </Button>

          {hasTechLead && isTechLeadActive && (
            <Button
              type="button"
              variant="primary"
              loading={loading}
              disabled={loading}
              onClick={handleSendEmail}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {loading
                  ? 'Dispatching...'
                  : invitation
                  ? 'Resend Invitation'
                  : 'Send Invitation Email'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

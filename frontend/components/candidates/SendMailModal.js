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
  User,
  Briefcase,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Clock,
  Video,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import interviewInvitationService from '@/services/interviewInvitationService';
import candidateService from '@/services/candidateService';

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
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');

  // Synchronize initial form state whenever candidate changes
  useEffect(() => {
    if (candidate) {
      setInterviewerEmail(candidate.interviewer_email || '');
      setInterviewerName(candidate.interviewer_name || '');
    } else {
      setInterviewerEmail('');
      setInterviewerName('');
    }
  }, [candidate]);

  // Check for existing invitation when modal opens
  useEffect(() => {
    if (!isOpen || !candidate) return;

    setServerError(null);
    setSuccessInfo(null);
    setCopied(false);
    setInvitation(null);

    let isMounted = true;
    if (candidate.interviewer_email) {
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

  // Safe early return AFTER all hooks have executed
  if (!isOpen || !candidate) return null;

  // RULE: Candidate moves to Stage 2 ONLY when resume matches 80% to JD
  const matchScore = Number(candidate.ai_match_percentage ?? candidate.match_percentage ?? 0);
  const isResumeMatched =
    matchScore >= 80 &&
    candidate.ai_screening_details?.recommendation !== 'POOR_MATCH';

  const handleSendEmail = async (e) => {
    e?.preventDefault();

    if (!isResumeMatched) {
      setServerError(
        'Stage 2 Locked: Candidate resume does not match the JD (ATS match must be >= 80%). Invitation cannot be dispatched.',
      );
      return;
    }

    const emailTrimmed = interviewerEmail.trim();
    const nameTrimmed = interviewerName.trim();

    if (!emailTrimmed) {
      setServerError('Please enter the interviewer email address.');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setServerError('Please enter a valid email address (e.g. interviewer@company.com).');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      // 1. If candidate's interviewer_email is not saved yet, save it to the candidate record
      if (candidate.interviewer_email !== emailTrimmed) {
        await candidateService.updateCandidate(candidate.id, {
          interviewer_email: emailTrimmed,
        }).catch(() => null);
      }

      // 2. Dispatches invitation via backend Google OAuth2 + Gmail API
      const result = await interviewInvitationService.sendInvitation(candidate.id, {
        interviewer_email: emailTrimmed,
        interviewer_name: nameTrimmed || undefined,
      });

      const invData =
        result?.invitation ||
        (await interviewInvitationService.getInvitationByCandidateId(candidate.id).catch(() => null));
      setInvitation(invData);

      setSuccessInfo(
        `Interview invitation email successfully dispatched to ${nameTrimmed ? nameTrimmed + ' (' + emailTrimmed + ')' : emailTrimmed} via Gmail!`
      );
      onSuccess?.(`Invitation email sent to ${emailTrimmed}!`);
    } catch (err) {
      console.error('Failed to send interview invitation:', err);
      const msg =
        err.response?.data?.message || err.message || 'Failed to dispatch invitation email via Gmail.';
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="send-mail-modal-title"
                className="text-lg font-bold text-slate-900 tracking-tight"
              >
                Send Interview Invitation
              </h3>
              <p className="text-xs text-slate-500">
                Email the technical interviewer via Gmail with secure evaluation link & resume
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

        {/* Server Feedback */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span className="leading-relaxed">{serverError}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="leading-relaxed">{successInfo}</span>
          </div>
        )}

        {/* Candidate Target Overview */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Candidate
            </span>
            <span className="text-sm font-bold text-slate-900">{candidate.name}</span>
            <span className="text-xs text-slate-500 block">{candidate.job?.title || 'Position'}</span>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-slate-100 border border-slate-200 text-slate-800">
              {matchScore}% ATS Match
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Stage 2 Qualified</span>
          </div>
        </div>

        {/* Stage 2 Interview Schedule Overview (if scheduled) */}
        {(candidate.interview_date || candidate.gmeet_link) && (
          <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
            <span className="font-bold block uppercase tracking-wider text-[10px] text-blue-700">
              Scheduled Interview Details
            </span>
            <div className="flex items-center gap-4 flex-wrap text-blue-800">
              {candidate.interview_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {candidate.interview_date} {candidate.interview_time && `at ${candidate.interview_time}`}
                </span>
              )}
              {candidate.gmeet_link && (
                <a
                  href={candidate.gmeet_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                >
                  <Video className="w-3.5 h-3.5" />
                  Meet Link
                </a>
              )}
            </div>
          </div>
        )}

        {/* Interviewer Inputs Form */}
        <form onSubmit={handleSendEmail} className="space-y-3">
          {isResumeMatched ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
              {/* Interviewer Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Interviewer Full Name</span>
                </label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Tech Lead)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 bg-white hover:border-slate-400 text-slate-900 text-sm focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Interviewer Email Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Interviewer Email Address <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="email"
                  required
                  value={interviewerEmail}
                  onChange={(e) => setInterviewerEmail(e.target.value)}
                  placeholder="e.g. sarah.jenkins@company.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 bg-white hover:border-slate-400 text-slate-900 text-sm focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                The evaluation link, candidate resume, and JD overview will be sent directly to this interviewer via the Gmail API.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Stage 2 Locked: Resume Does Not Meet 80% Threshold
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    This candidate scored {matchScore}% on AI resume screening. Candidate profiles must match at least 80% to advance to Stage 2 and have an interviewer invited.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Evaluation Link Preview (if exists or generated) */}
          {invitation?.evaluation_url && (
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  Secure Evaluation Link
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Valid for 7 days
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={invitation.evaluation_url}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 truncate select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
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
              className="border-slate-300"
            >
              {successInfo ? 'Done' : 'Cancel'}
            </Button>

            {isResumeMatched && (
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading || !interviewerEmail.trim()}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm"
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
        </form>
      </div>
    </div>
  );
}


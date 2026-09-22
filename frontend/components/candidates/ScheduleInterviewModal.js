'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  Clock,
  Video,
  User,
  AlertCircle,
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  candidate,
  job,
  aiMatchPercentage,
  onScheduled,
}) {
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [gmeetLink, setGmeetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && candidate) {
      // Pre-fill existing data if candidate already had an interview record
      setInterviewerEmail(
        candidate.interviewer_email ||
          candidate.job?.contact_email ||
          ''
      );
      setInterviewerName(
        candidate.interviewer_name || 'Technical Evaluator'
      );
      setInterviewDate(candidate.interview_date || getDefaultDate());
      setInterviewTime(candidate.interview_time || '10:30 AM');
      setGmeetLink(candidate.gmeet_link || generateRandomMeetLink());
      setError(null);
    }
  }, [isOpen, candidate]);

  // Default to tomorrow's date
  function getDefaultDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Generate Google Meet style link: https://meet.google.com/abc-defg-hij
  function generateRandomMeetLink() {
    const seg = (len) =>
      Math.random()
        .toString(36)
        .substring(2, 2 + len);
    return `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;
  }

  const handleGenerateMeet = () => {
    setGmeetLink(generateRandomMeetLink());
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = interviewerEmail.trim();
    if (!emailTrimmed) {
      setError('Interviewer Email ID is required.');
      return;
    }
    if (!validateEmail(emailTrimmed)) {
      setError('Please enter a valid interviewer email address.');
      return;
    }
    if (!interviewDate) {
      setError('Please select an interview date.');
      return;
    }
    if (!interviewTime) {
      setError('Please select an interview time.');
      return;
    }

    setLoading(true);

    try {
      await onScheduled?.({
        interviewer_email: emailTrimmed,
        interviewer_name: interviewerName.trim() || 'Technical Interviewer',
        interview_date: interviewDate,
        interview_time: interviewTime,
        gmeet_link: gmeetLink.trim() || generateRandomMeetLink(),
      });
      onClose?.();
    } catch (err) {
      console.error('Failed to schedule interview:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to dispatch interview invitation email. Please check your credentials or try again.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const matchScore =
    aiMatchPercentage != null
      ? Math.round(Number(aiMatchPercentage))
      : candidate?.match_percentage != null
      ? Math.round(Number(candidate.match_percentage))
      : 85;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative p-6 sm:p-7 pb-5 bg-white border-b border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
              Stage 2: Technical Interview
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              AI Match: {matchScore}%
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Schedule Technical Interview
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Assign the technical interviewer and dispatch meeting & evaluation links for{' '}
            <strong className="text-slate-900 font-semibold">{candidate?.name}</strong>{' '}
            ({job?.title || candidate?.job?.title || 'Requisition'}).
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 sm:p-7 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Interviewer Email ID */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-600" />
                  Interviewer Email ID <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Primary Contact
                </span>
              </div>
              <input
                type="email"
                required
                placeholder="e.g. interviewer@company.com"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 transition-all"
              />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                This email ID will be attached to both the candidate and job requisition. The technical evaluation portal link and Google Meet link will be dispatched here.
              </p>
            </div>

            {/* Interviewer Name (Optional) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Interviewer Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Henderson (Lead Architect)"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 transition-all"
              />
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Interview Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Interview Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10:30 AM or 14:00"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Google Meet Link */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-slate-600" />
                  Google Meet Link
                </label>
                <button
                  type="button"
                  onClick={handleGenerateMeet}
                  className="text-[11px] font-bold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Generate Link
                </button>
              </div>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={gmeetLink}
                  onChange={(e) => setGmeetLink(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 transition-all"
                />
                {gmeetLink && (
                  <a
                    href={gmeetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    title="Open Meet link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 sm:p-7 pt-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={loading}
              onClick={onClose}
              className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Dispatch Invitation & Move to Next Stage</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

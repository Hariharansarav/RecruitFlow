'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  UserCheck,
  Mail,
  Phone,
  FileText,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import ScheduleInterviewModal from '@/components/candidates/ScheduleInterviewModal';
import candidateService from '@/services/candidateService';
import interviewEvaluationService from '@/services/interviewEvaluationService';
import interviewInvitationService from '@/services/interviewInvitationService';
import emailService from '@/services/emailService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function CandidateDetailsPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const candidateId = unwrappedParams.id;

  const [user, setUser] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Invitation & Stage 2 action states
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(null);

  // Manual interviewer email states
  const [manualInterviewerEmail, setManualInterviewerEmail] = useState('');
  const [isEditingInterviewer, setIsEditingInterviewer] = useState(false);
  const [savingInterviewer, setSavingInterviewer] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Modal & Toast state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCandidateData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [candData, matchRes, evalRes, invRes] = await Promise.all([
        candidateService.getCandidateById(candidateId),
        candidateService.getCandidateMatch(candidateId).catch(() => null),
        interviewEvaluationService.getEvaluationByCandidate(candidateId).catch(() => null),
        interviewInvitationService.getInvitationByCandidateId(candidateId).catch(() => null),
      ]);
      setCandidate(candData);
      if (candData) {
        setManualInterviewerEmail(candData.interviewer_email || '');
      }
      setMatchData(matchRes);
      setEvaluation(evalRes);
      setInvitation(invRes && invRes.id ? invRes : null);
    } catch (err) {
      console.error('Failed to load candidate details:', err);
      if (err.response?.status === 404) {
        setError('Candidate not found.');
      } else {
        setError('Unable to load candidate details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    fetchCandidateData();
  }, [fetchCandidateData]);

  const isResumeMatched =
    candidate?.ai_match_percentage != null &&
    Number(candidate.ai_match_percentage) >= 80 &&
    candidate?.ai_screening_details?.recommendation !== 'POOR_MATCH';

  // Save manually entered interviewer email
  const handleSaveInterviewerEmail = async () => {
    if (!isResumeMatched) {
      setToast({
        message: 'Stage 2 Locked: Resume does not match JD (minimum 80% match required).',
        type: 'error',
      });
      return;
    }
    const email = manualInterviewerEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setToast({
        message: 'Please enter a valid interviewer email address.',
        type: 'error',
      });
      return;
    }

    setSavingInterviewer(true);
    try {
      await candidateService.updateCandidate(
        candidate.id,
        { interviewer_email: email },
        user?.id,
      );
      setCandidate((prev) => ({ ...prev, interviewer_email: email }));
      setIsEditingInterviewer(false);
      setToast({
        message: 'Interviewer email assigned successfully.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to update interviewer email:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to save interviewer email.',
        type: 'error',
      });
    } finally {
      setSavingInterviewer(false);
    }
  };

  // Handle Send / Resend Interview Invitation via backend Gmail API
  const handleSendInvitation = async () => {
    if (!isResumeMatched) {
      setToast({
        message: 'Stage 2 Locked: Candidate resume does not match the JD.',
        type: 'error',
      });
      return;
    }
    if (!candidate?.interviewer_email) {
      setToast({
        message: 'Please assign an interviewer email ID before sending the invitation.',
        type: 'error',
      });
      return;
    }

    if (gmailStatus && !gmailStatus.authenticated) {
      setToast({
        message: 'Gmail is not connected. Please connect Gmail in Settings before sending interview invitations.',
        type: 'error',
      });
      return;
    }

    setInvitationLoading(true);
    setInvitationError(null);

    try {
      // Dispatches invitation via backend Google OAuth2 + Gmail API
      const result = await interviewInvitationService.sendInvitation(candidate.id, {
        interviewer_email: candidate.interviewer_email,
      });
      if (result?.invitation) {
        setInvitation(result.invitation);
      } else {
        const updatedInv = await interviewInvitationService.getInvitationByCandidateId(candidate.id);
        setInvitation(updatedInv);
      }

      setToast({
        message: 'Interview invitation sent successfully to interviewer via Gmail!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to send interview invitation:', err);
      const message =
        err.response?.data?.message || err.message || 'Failed to dispatch interview invitation email.';
      setInvitationError(message);
      setToast({
        message,
        type: 'error',
      });
    } finally {
      setInvitationLoading(false);
    }
  };

  const handleInterviewScheduled = async (schedulingData) => {
    try {
      const result = await interviewInvitationService.sendInvitation(candidate.id, schedulingData);
      if (result?.invitation) {
        setInvitation(result.invitation);
      }
      await fetchCandidateData();
      setToast({
        message: 'Interview scheduled and invitation dispatched via Gmail!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to schedule interview:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to schedule interview.',
        type: 'error',
      });
    }
  };

  // Copy evaluation link to clipboard
  const handleCopyLink = () => {
    if (!invitation?.evaluation_url) return;
    navigator.clipboard.writeText(invitation.evaluation_url);
    setCopiedLink(true);
    setToast({
      message: 'Evaluation link copied to clipboard!',
      type: 'success',
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Delete Candidate
  const handleDelete = async () => {
    if (!candidate) return;
    setDeleteLoading(true);

    try {
      await candidateService.deleteCandidate(candidate.id, user?.id);
      setToast({
        message: 'Candidate deleted successfully.',
        type: 'success',
      });
      setIsDeleteModalOpen(false);
      setTimeout(() => {
        router.push('/hr/candidates');
      }, 1000);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to delete candidate.',
        type: 'error',
      });
      setIsDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const candidateSkills = candidate?.skills
    ? candidate.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const requiredSkills = candidate?.job?.required_skills
    ? candidate.job.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const matchPercentage =
    evaluation?.jd_match_percentage != null
      ? Math.round(Number(evaluation.jd_match_percentage))
      : evaluation?.score != null && Number(evaluation.score) > 0
      ? Math.round((Number(evaluation.score) / 5) * 100)
      : matchData?.match_percentage ?? 0;

  const getMatchScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-300 font-bold ring-1 ring-emerald-500/20';
    if (score >= 70) return 'text-blue-700 bg-blue-50 border-blue-300 font-bold ring-1 ring-blue-500/20';
    if (score >= 50) return 'text-amber-800 bg-amber-50 border-amber-300 font-bold ring-1 ring-amber-500/20';
    return 'text-rose-700 bg-rose-50 border-rose-300 font-semibold';
  };

  const getProgressBarColor = (score) => {
    if (score >= 85) return 'bg-emerald-600';
    if (score >= 70) return 'bg-blue-600';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={true}
          title="Delete this candidate?"
          message={`Are you sure you want to delete '${candidate?.name}'? This action cannot be undone.`}
          confirmText="Delete Candidate"
          confirmVariant="danger"
          isLoading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <Link
          href="/hr/candidates"
          className="hover:text-black transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Candidates
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-semibold truncate max-w-xs">
          {candidate ? candidate.name : 'Candidate Details'}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-950 mb-1">{error}</h2>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/hr/candidates">
              <Button variant="secondary">Back to Candidates</Button>
            </Link>
            <Button variant="primary" onClick={fetchCandidateData}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Simple Loading State */}
      {loading && !error && (
        <div className="py-20 text-center">
          <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading candidate dossier...</p>
        </div>
      )}

      {/* Main Candidate Details */}
      {!loading && !error && candidate && (
        <div className="space-y-6">
          {/* Header Card with Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {candidate.name}
                  </h1>
                  <Badge status={candidate.status}>{candidate.status}</Badge>
                </div>
                <p className="text-sm text-slate-500">
                  Applied for{' '}
                  <span className="font-semibold text-slate-800">
                    {candidate.job?.title || 'General Position'}
                  </span>{' '}
                  • Added on {formatDate(candidate.created_at)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-2.5">
                <Link href={`/hr/candidates/${candidate.id}/screening`}>
                  <Button variant="primary" className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                    <FileText className="w-4 h-4" />
                    <span>Screen Candidate</span>
                  </Button>
                </Link>
                <Link href={`/hr/candidates/${candidate.id}/edit`}>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          </div>

          {/* 3-Column Info Grid: Candidate Information, Job Information, Tech Lead */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Candidate Information Card */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                  Candidate Information
                </h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-zinc-400" /> Email:
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {candidate.email}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-zinc-400" /> Phone:
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {candidate.phone}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-zinc-400" /> Resume:
                  </span>
                  {candidate.resume_url ? (
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-900 hover:text-black font-semibold underline underline-offset-4 inline-flex items-center gap-1 transition-colors"
                    >
                      View Resume <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-zinc-400 italic">
                      Resume not provided
                    </span>
                  )}
                </div>


              </div>
            </div>

            {/* Job Information Card */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                  Assigned Position
                </h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Position Title:</span>
                  <Link
                    href={`/hr/jobs/${candidate.job?.id || candidate.job_id}`}
                    className="font-bold text-zinc-950 hover:underline transition-all"
                  >
                    {candidate.job?.title || 'General'}
                  </Link>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-zinc-400" /> Department:
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {candidate.job?.department || 'General'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-zinc-400" /> Location:
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {candidate.job?.location || 'Remote'}
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                    Job Required Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-semibold border border-zinc-200 shadow-2xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Technical Interviewer Card */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                    Technical Interviewer
                  </h2>
                </div>
                {isResumeMatched ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Stage 2 Unlocked
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Stage 2 Locked
                  </span>
                )}
              </div>

              {!isResumeMatched ? (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Resume Match Required</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    An interviewer can only be assigned if the resume matches the JD (&ge; 80%). Current ATS score: {candidate.ai_match_percentage != null ? `${candidate.ai_match_percentage}%` : 'Below 80%'}.
                  </p>
                </div>
              ) : candidate.interviewer_email && !isEditingInterviewer ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1.5 text-xs">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" /> Email:
                    </span>
                    <span className="font-semibold text-zinc-900 truncate max-w-[170px]" title={candidate.interviewer_email}>
                      {candidate.interviewer_email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-zinc-500">Status:</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Assigned
                    </span>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <p className="text-[11px] text-zinc-400">
                      Receives evaluation link & scoring portal.
                    </p>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setManualInterviewerEmail(candidate.interviewer_email || '');
                        setIsEditingInterviewer(true);
                      }}
                      className="text-xs ml-2"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Manual Interviewer Email ID:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={manualInterviewerEmail}
                      onChange={(e) => setManualInterviewerEmail(e.target.value)}
                      placeholder="interviewer@company.com"
                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-zinc-900"
                    />
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={handleSaveInterviewerEmail}
                      isLoading={savingInterviewer}
                      disabled={!manualInterviewerEmail.trim()}
                      className="shrink-0"
                    >
                      Save
                    </Button>
                  </div>
                  {isEditingInterviewer && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualInterviewerEmail(candidate.interviewer_email || '');
                        setIsEditingInterviewer(false);
                      }}
                      className="text-[11px] text-zinc-500 underline hover:text-zinc-800"
                    >
                      Cancel
                    </button>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    Enter the interviewer&apos;s email address to unlock scheduling and evaluation.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stage 2 Technical Interview & Evaluation Portal Card */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-zinc-950">
                      Stage 2: Technical Interview & Evaluation Portal
                    </h2>
                    {!isResumeMatched ? (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Locked
                      </span>
                    ) : invitation?.status === 'COMPLETED' ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Evaluation Completed
                      </span>
                    ) : invitation?.status === 'PENDING' ? (
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        Pending Evaluation
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
                        Ready for Interview
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Schedule interview call and dispatch secure evaluation link to interviewer via Google Gmail API
                  </p>
                </div>
              </div>

              {/* Action Buttons on Header */}
              {isResumeMatched && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule Interview</span>
                  </Button>

                  {candidate.interviewer_email && (
                    <>
                      {!invitation || invitation.status === 'CANCELLED' || invitation.status === 'EXPIRED' ? (
                        <Button
                          variant="primary"
                          onClick={handleSendInvitation}
                          isLoading={invitationLoading}
                          disabled={gmailStatus && !gmailStatus.authenticated}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Send className="w-4 h-4" />
                          <span>Send Invitation Email</span>
                        </Button>
                      ) : invitation.status === 'PENDING' ? (
                        <Button
                          variant="secondary"
                          onClick={handleSendInvitation}
                          isLoading={invitationLoading}
                          disabled={gmailStatus && !gmailStatus.authenticated}
                          className="flex items-center gap-2 text-xs"
                        >
                          <RefreshCw className={`w-4 h-4 ${invitationLoading ? 'animate-spin' : ''}`} />
                          <span>Resend Invitation</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Evaluation Completed</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Content Area */}
            {!isResumeMatched ? (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      Stage 2 (Technical Interview) is Locked
                    </h3>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Candidate ATS match is {candidate?.ai_match_percentage ?? 0}%. Candidates can only advance to Stage 2 and have an interviewer manually assigned if their resume matches the Job Description (&ge; 80%).
                    </p>
                  </div>
                </div>
                <Link href={`/hr/candidates/${candidate.id}/screening`}>
                  <Button variant="outline" size="sm" className="bg-white hover:bg-amber-50 shrink-0 text-xs font-semibold">
                    View AI Screening Details →
                  </Button>
                </Link>
              </div>
            ) : !candidate.interviewer_email ? (
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">
                      Resume Matched! Assign Interviewer Email
                    </h3>
                    <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                      This profile has cleared Stage 1 AI Screening ({candidate.ai_match_percentage}% match). Please manually enter the interviewer&apos;s email address to schedule the interview.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="shrink-0 text-xs font-bold"
                >
                  Schedule Interview Now →
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Error Banner with Retry */}
                {invitationError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Email Dispatch Failed: </span>
                        {invitationError}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={handleSendInvitation}
                      isLoading={invitationLoading}
                      className="shrink-0"
                    >
                      Retry Invitation
                    </Button>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400 block">
                      Assigned Interviewer
                    </span>
                    <div className="font-bold text-zinc-900 text-sm truncate" title={candidate.interviewer_email}>
                      {candidate.interviewer_email}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {candidate.interview_date ? `Scheduled: ${candidate.interview_date} ${candidate.interview_time || ''}` : 'Schedule pending'}
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400 block">
                      Invitation Delivery
                    </span>
                    <div className="font-bold text-zinc-900 text-sm">
                      {invitation?.created_at ? formatDate(invitation.created_at) : 'Not yet dispatched'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {invitation ? 'Via Gmail API Delivery' : 'Ready to dispatch'}
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400 block">
                      Invitation Expiration
                    </span>
                    <div className="font-bold text-zinc-900 text-sm">
                      {invitation?.expires_at ? formatDate(invitation.expires_at) : '7 days from dispatch'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {invitation
                        ? new Date(invitation.expires_at) < new Date()
                          ? 'Token has expired'
                          : 'Valid for evaluation'
                        : 'Calculated upon creation'}
                    </div>
                  </div>
                </div>

                {/* Secure Evaluation Link Area (when invitation exists) */}
                {invitation?.evaluation_url && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                          Secure Evaluation URL (Token Access)
                        </span>
                      </div>
                      <span className="text-2xs text-zinc-400 font-medium">
                        Passwordless • External Interviewer Access
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={invitation.evaluation_url}
                        className="w-full text-xs font-mono bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-700 select-all focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCopyLink}
                        className="shrink-0 flex items-center gap-1.5 min-w-[100px] justify-center"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-2xs text-zinc-400 leading-relaxed">
                      This unique link gives the interviewer direct access to evaluate candidate technical competencies without needing a login account.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Screening Summary Preview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Job Description Match Summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Automated skills overlap calculation against{' '}
                    {candidate.job?.title}
                  </p>
                </div>
              </div>

              <Link href={`/hr/candidates/${candidate.id}/screening`}>
                <Button variant="outline" size="sm">
                  Full Screening View →
                </Button>
              </Link>
            </div>

            {/* Score and Visual Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Overall JD Match Score
                </span>
                <span
                  className={`px-3 py-1 rounded-xl text-sm font-bold border ${getMatchScoreColor(
                    matchPercentage,
                  )}`}
                >
                  {matchPercentage}% Match
                </span>
              </div>
              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getProgressBarColor(
                    matchPercentage,
                  )}`}
                  style={{ width: `${Math.min(100, Math.max(0, matchPercentage))}%` }}
                />
              </div>
            </div>

            {/* Matched vs Missing Skills Breakdown */}
            {matchData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Matched Skills ({matchData.matched_skills?.length || 0})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchData.matched_skills?.length > 0 ? (
                      matchData.matched_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">
                        No required skills matched
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>
                      Missing Skills ({matchData.missing_skills?.length || 0})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchData.missing_skills?.length > 0 ? (
                      matchData.missing_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 line-through capitalize"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold">
                        ✓ All required skills matched!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interview Evaluation Summary Card */}
          {evaluation && (
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950">
                      HR Interview Evaluation
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Evaluated by {evaluation.hr?.name || 'HR Recruiter'}
                    </p>
                  </div>
                </div>

                <Link href={`/hr/candidates/${candidate.id}/screening`}>
                  <Button variant="outline" size="sm">
                    Manage Evaluation →
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                    Overall Score
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      {evaluation.score}
                    </span>
                    <span className="text-zinc-400 font-semibold">/ 5</span>
                    <div className="flex items-center gap-0.5 ml-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            Number(evaluation.score) >= s
                              ? 'text-zinc-900 fill-zinc-900'
                              : 'text-zinc-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {evaluation && (
                    <div className="pt-1 text-xs text-blue-600 font-semibold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {Math.round(
                          evaluation.jd_match_percentage != null
                            ? Number(evaluation.jd_match_percentage)
                            : (Number(evaluation.score || 0) / 5) * 100
                        )}% JD Match
                      </span>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Notes
                  </span>
                  <p className="text-sm text-zinc-700 italic line-clamp-2 leading-relaxed">
                    &ldquo;{evaluation.notes}&rdquo;
                  </p>
                  {evaluation.skills && evaluation.skills.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200/60 flex flex-wrap gap-2">
                      {evaluation.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white border border-zinc-200 font-medium text-zinc-800"
                        >
                          <span>{s.skill}:</span>
                          <span className="font-bold text-zinc-950">{s.score}/5</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Interview Modal */}
      {candidate && (
        <ScheduleInterviewModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          candidate={candidate}
          job={candidate.job}
          aiMatchPercentage={candidate.ai_match_percentage}
          onScheduled={handleInterviewScheduled}
        />
      )}
    </div>
  );
}

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
  Sparkles,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Star,
  Award,
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

  // Invitation action states
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Handle Send / Resend Interview Invitation via EmailJS
  const handleSendInvitation = async () => {
    if (!candidate?.tech_lead_id) {
      setToast({
        message: 'Please assign an active Tech Lead before sending an invitation.',
        type: 'error',
      });
      return;
    }
    if (candidate.tech_lead?.status === 'INACTIVE') {
      setToast({
        message: 'Assigned Tech Lead is currently inactive. Please assign an active Tech Lead first.',
        type: 'error',
      });
      return;
    }

    setInvitationLoading(true);
    setInvitationError(null);

    try {
      // 1. Generate or retrieve active invitation token from backend
      const invData = await interviewInvitationService.createOrGetInvitation(candidate.id);
      setInvitation(invData);

      // 2. Dispatch email to Tech Lead via EmailJS
      const emailResult = await emailService.sendTechLeadInvitationEmail({
        techLeadName: invData.tech_lead?.name || candidate.tech_lead?.name,
        techLeadEmail: invData.tech_lead?.email || candidate.tech_lead?.email,
        candidateName: invData.candidate?.name || candidate.name,
        jobTitle: invData.job?.title || candidate.job?.title || 'Position',
        evaluationLink: invData.evaluation_url,
        expiresAt: invData.expires_at,
      });

      setToast({
        message: emailResult.simulated
          ? 'Secure invitation link generated! (Simulated email delivery mode)'
          : 'Interview invitation sent successfully to Tech Lead!',
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

  const matchPercentage = matchData?.match_percentage ?? 0;

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

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs space-y-4">
            <div className="h-8 bg-zinc-200 rounded w-48" />
            <div className="h-4 bg-zinc-100 rounded w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs h-48" />
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs h-48" />
          </div>
        </div>
      )}

      {/* Main Candidate Details */}
      {!loading && !error && candidate && (
        <div className="space-y-6">
          {/* Header Card with Actions */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                    {candidate.name}
                  </h1>
                  <Badge status={candidate.status}>{candidate.status}</Badge>
                </div>
                <p className="text-sm text-zinc-500">
                  Applied for{' '}
                  <span className="font-semibold text-zinc-800">
                    {candidate.job?.title || 'General Position'}
                  </span>{' '}
                  • Added on {formatDate(candidate.created_at)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-2.5">
                <Link href={`/hr/candidates/${candidate.id}/screening`}>
                  <Button variant="primary" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
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

            {/* Assigned Tech Lead Card */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                  Assigned Tech Lead
                </h2>
              </div>

              {candidate.tech_lead ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Name:</span>
                    <span className="font-semibold text-zinc-900">
                      {candidate.tech_lead.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-zinc-400" /> Email:
                    </span>
                    <span className="font-semibold text-zinc-900 truncate max-w-[150px]" title={candidate.tech_lead.email}>
                      {candidate.tech_lead.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status:</span>
                    <Badge status={candidate.tech_lead.status}>
                      {candidate.tech_lead.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-zinc-100">
                    <p className="text-xs text-zinc-400">
                      External technical interviewer assigned to evaluate this candidate.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-zinc-400 italic">No Tech Lead assigned</p>
                  <Link href={`/hr/candidates/${candidate.id}/edit`}>
                    <Button variant="outline" size="xs">
                      Assign Tech Lead
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Tech Lead Interview Invitation Card */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-zinc-950">
                      Tech Lead Interview Invitation
                    </h2>
                    {invitation ? (
                      <Badge status={invitation.status}>
                        {invitation.status === 'PENDING'
                          ? 'Pending Evaluation'
                          : invitation.status === 'COMPLETED'
                          ? 'Evaluation Completed'
                          : invitation.status === 'EXPIRED'
                          ? 'Expired'
                          : 'Cancelled'}
                      </Badge>
                    ) : (
                      <Badge status="NOT_SENT">Not Sent</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Dispatch a secure, passwordless evaluation link to the assigned Tech Lead via EmailJS
                  </p>
                </div>
              </div>

              {/* Action Button on Header */}
              {candidate.tech_lead && (
                <div>
                  {!invitation || invitation.status === 'CANCELLED' || invitation.status === 'EXPIRED' ? (
                    <Button
                      variant="primary"
                      onClick={handleSendInvitation}
                      isLoading={invitationLoading}
                      disabled={candidate.tech_lead?.status === 'INACTIVE'}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Evaluation Access</span>
                    </Button>
                  ) : invitation.status === 'PENDING' ? (
                    <Button
                      variant="secondary"
                      onClick={handleSendInvitation}
                      isLoading={invitationLoading}
                      disabled={candidate.tech_lead?.status === 'INACTIVE'}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${invitationLoading ? 'animate-spin' : ''}`} />
                      <span>Resend Evaluation Access</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Evaluation Completed</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content Area */}
            {!candidate.tech_lead ? (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      No Tech Lead Assigned
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Assign an active Tech Lead to this candidate before sending an interview invitation.
                    </p>
                  </div>
                </div>
                <Link href={`/hr/candidates/${candidate.id}/edit`}>
                  <Button variant="outline" size="sm" className="bg-white hover:bg-amber-50 shrink-0">
                    Assign Tech Lead →
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Inactive Tech Lead Warning */}
                {candidate.tech_lead.status === 'INACTIVE' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div className="text-xs text-rose-800">
                      <span className="font-bold">Tech Lead is Inactive: </span>
                      {candidate.tech_lead.name} ({candidate.tech_lead.email}) is currently marked inactive. Please assign an active Tech Lead to send invitations.
                    </div>
                  </div>
                )}

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
                      Assigned Tech Lead
                    </span>
                    <div className="font-bold text-zinc-900 text-sm truncate" title={candidate.tech_lead.name}>
                      {candidate.tech_lead.name}
                    </div>
                    <div className="text-xs text-zinc-500 truncate" title={candidate.tech_lead.email}>
                      {candidate.tech_lead.email}
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400 block">
                      Invitation Sent
                    </span>
                    <div className="font-bold text-zinc-900 text-sm">
                      {invitation?.created_at ? formatDate(invitation.created_at) : 'Not yet dispatched'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {invitation ? 'Via EmailJS Dispatch' : 'Awaiting first dispatch'}
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
                          Secure Evaluation URL (64-character token)
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
                      This unique link gives the assigned Tech Lead direct access to evaluate candidate technical skills against the job&apos;s required skills.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Screening Summary Preview Card */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-950">
                    Job Description Match Summary
                  </h2>
                  <p className="text-xs text-zinc-500">
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
                  {evaluation.jd_match_percentage !== null && evaluation.jd_match_percentage !== undefined && (
                    <div className="pt-1 text-xs text-blue-600 font-semibold">
                      {Math.round(evaluation.jd_match_percentage)}% JD Match
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
    </div>
  );
}

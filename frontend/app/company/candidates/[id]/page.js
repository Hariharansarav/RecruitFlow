'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Briefcase,
  User,
  AlertCircle,
  Star,
  FileText,
  ExternalLink,
  Building2,
  MapPin,
  Clock,
  Calendar,
  Check,
  Award,
  MessageSquare,
  Send,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import companyService from '@/services/companyService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function CompanyCandidateDetailsPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const candidateId = unwrappedParams.id;

  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Decision Modals State (Phase 22)
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionAction, setDecisionAction] = useState(null); // 'ACCEPT' | 'REJECT' | null

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchCandidateDetails = useCallback(
    async (companyId, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await companyService.getCompanyCandidateById(
          candidateId,
          companyId,
        );
        setData(res);
      } catch (err) {
        console.error('Failed to load company candidate details:', err);
        const status = err.response?.status;
        if (status === 404) {
          setError('Candidate dossier not found or not submitted for review.');
        } else if (status === 403) {
          setError('You do not have permission to review this candidate.');
        } else {
          setError('Unable to load candidate details. Please try again.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [candidateId],
  );

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'COMPANY') {
      router.replace('/hr/dashboard');
      return;
    }
    setCurrentUser(user);
    fetchCandidateDetails(user.id);
  }, [router, fetchCandidateDetails]);

  const candidate = data?.candidate;
  const job = data?.job;
  const match = data?.match;
  const evaluation = data?.interview_evaluation;
  const matchPercentage = match?.match_percentage ?? 0;

  // Monochrome color for JD match bar
  const getMatchTheme = (percentage) => {
    if (percentage >= 85) {
      return {
        text: 'text-emerald-800',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300 ring-1 ring-emerald-500/20',
        bar: 'bg-emerald-600',
      };
    }
    if (percentage >= 70) {
      return {
        text: 'text-blue-800',
        bg: 'bg-blue-50',
        border: 'border-blue-300 ring-1 ring-blue-500/20',
        bar: 'bg-blue-600',
      };
    }
    if (percentage >= 50) {
      return {
        text: 'text-amber-800',
        bg: 'bg-amber-50',
        border: 'border-amber-300 ring-1 ring-amber-500/20',
        bar: 'bg-amber-500',
      };
    }
    return {
      text: 'text-rose-800',
      bg: 'bg-rose-50',
      border: 'border-rose-300 ring-1 ring-rose-500/20',
      bar: 'bg-rose-500',
    };
  };

  const theme = getMatchTheme(matchPercentage);

  const parseSkillsList = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills.filter(Boolean);
    if (typeof skills === 'string') {
      return skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const candidateSkills = parseSkillsList(candidate?.skills);
  const requiredSkills = parseSkillsList(match?.required_skills || job?.required_skills);
  const matchedSkills = parseSkillsList(match?.matched_skills);
  const missingSkills = parseSkillsList(match?.missing_skills);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'SUBMITTED_TO_COMPANY':
        return 'Pending Review';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  // ==========================================
  // PHASE 22: Candidate Decisioning
  // ==========================================
  const handleDecision = async (decision) => {
    if (!currentUser?.id) return;
    setIsDeciding(true);
    setDecisionAction(decision);

    try {
      const response = await companyService.decideCandidate(
        candidateId,
        currentUser.id,
        decision,
      );

      // Update status immediately in UI
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          candidate: {
            ...prev.candidate,
            status: response.candidate?.status || decision,
          },
        };
      });

      setIsAcceptModalOpen(false);
      setIsRejectModalOpen(false);

      setToast({
        message:
          response.message ||
          (decision === 'ACCEPT'
            ? 'Candidate accepted successfully.'
            : 'Candidate rejected successfully.'),
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to submit candidate decision:', err);
      const msg = err.response?.data?.message;
      setToast({
        message:
          Array.isArray(msg)
            ? msg.join(', ')
            : msg || 'Failed to submit decision.',
        type: 'error',
      });
    } finally {
      setIsDeciding(false);
      setDecisionAction(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* PHASE 22: Accept Confirmation Modal */}
      {isAcceptModalOpen && (
        <Modal
          isOpen={true}
          title="Accept Candidate?"
          confirmText={
            isDeciding && decisionAction === 'ACCEPT'
              ? 'Accepting...'
              : 'Accept Candidate'
          }
          cancelText="Cancel"
          confirmVariant="primary"
          isLoading={isDeciding}
          onConfirm={() => handleDecision('ACCEPT')}
          onClose={() => !isDeciding && setIsAcceptModalOpen(false)}
        >
          <div className="space-y-4 my-3 text-sm">
            <p className="text-zinc-600 leading-relaxed">
              Are you sure you want to accept this candidate for the selected position?
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Candidate:</span>
                <span className="font-bold text-zinc-950">{candidate?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Position:</span>
                <span className="font-semibold text-zinc-900">{job?.title}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">JD Match:</span>
                <span className="font-bold text-white bg-black px-2.5 py-0.5 rounded-lg border border-black shadow-xs">
                  {matchPercentage}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 font-medium">Interview Score:</span>
                <span className="font-bold text-zinc-950 bg-white px-2.5 py-0.5 rounded-lg border border-zinc-200">
                  {evaluation?.score !== undefined ? `${evaluation.score} / 5` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* PHASE 22: Reject Confirmation Modal */}
      {isRejectModalOpen && (
        <Modal
          isOpen={true}
          title="Reject Candidate?"
          confirmText={
            isDeciding && decisionAction === 'REJECT'
              ? 'Rejecting...'
              : 'Reject Candidate'
          }
          cancelText="Cancel"
          confirmVariant="danger"
          isLoading={isDeciding}
          onConfirm={() => handleDecision('REJECT')}
          onClose={() => !isDeciding && setIsRejectModalOpen(false)}
        >
          <div className="space-y-4 my-3 text-sm">
            <p className="text-zinc-600 leading-relaxed">
              Are you sure you want to reject this candidate? A standard notification email will be sent to the candidate.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Candidate:</span>
                <span className="font-bold text-zinc-950">{candidate?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 font-medium">Position:</span>
                <span className="font-semibold text-zinc-900">{job?.title}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <Link
          href="/company/candidates"
          className="hover:text-black transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Pipeline
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-semibold truncate max-w-xs">
          {candidate?.name || 'Candidate Review'}
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              {candidate?.name}
            </h1>
            <Badge status={candidate?.status}>
              {getStatusLabel(candidate?.status)}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {job?.title} • {job?.department || 'General'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/company/candidates">
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Pipeline</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 text-center max-w-md mx-auto shadow-xs">
          <AlertCircle className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-950 mb-1">{error}</h2>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/company/candidates">
              <Button variant="secondary">Back to Candidates</Button>
            </Link>
            <Button
              variant="primary"
              onClick={() => currentUser && fetchCandidateDetails(currentUser.id)}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs h-28" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs h-64" />
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs h-64" />
          </div>
        </div>
      )}

      {/* Main Review Content (Read-Only) */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* ========================================== */}
          {/* 1. TOP REVIEW SUMMARY CARD                 */}
          {/* ========================================== */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-7 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Candidate Dossier Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Candidate</span>
                <span className="font-bold text-zinc-950 block mt-1 text-base">{candidate?.name}</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Position</span>
                <span className="font-bold text-zinc-950 block mt-1">{job?.title}</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">JD Match</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border ${
                      matchPercentage >= 85
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/20'
                        : matchPercentage >= 70
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500/20'
                        : matchPercentage >= 50
                        ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {matchPercentage}% Match
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Interview Score</span>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {evaluation?.score !== undefined ? `${Number(evaluation.score).toFixed(1)} / 5` : 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">Current Status</span>
                <Badge status={candidate?.status}>
                  {getStatusLabel(candidate?.status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 2. CANDIDATE & JOB INFORMATION (READ-ONLY) */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Candidate Information */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                  Candidate Information
                </h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Email:</span>
                  <span className="font-semibold text-zinc-900">{candidate?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Phone:</span>
                  <span className="font-semibold text-zinc-900">
                    {candidate?.phone || 'Not provided'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Resume:</span>
                  {candidate?.resume_url ? (
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-900 hover:text-black font-semibold underline underline-offset-4 inline-flex items-center gap-1 transition-colors text-xs"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Resume{' '}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-zinc-400 italic text-xs">
                      No resume provided
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                  Job Information
                </h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Job Title:</span>
                  <span className="font-semibold text-zinc-900">{job?.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Department:</span>
                  <span className="font-semibold text-zinc-900">
                    {job?.department || 'General'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Location:</span>
                  <span className="font-semibold text-zinc-900">
                    {job?.location || 'Remote'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">Experience:</span>
                  <span className="font-semibold text-zinc-900">
                    {job?.experience_required || 'Not specified'}
                  </span>
                </div>

                {job?.description && (
                  <div className="pt-2 border-t border-zinc-100 space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                      Description
                    </span>
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                    Required Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job?.required_skills ? (
                      parseSkillsList(job.required_skills).map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-black text-white border border-black shadow-xs"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">None listed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 3. JD MATCH & SCORE OVERVIEW (READ-ONLY)   */}
          {/* ========================================== */}
          <div className={`border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 ${
            matchPercentage >= 85
              ? 'bg-emerald-50/20 border-emerald-200/90'
              : matchPercentage >= 70
              ? 'bg-blue-50/20 border-blue-200/90'
              : matchPercentage >= 50
              ? 'bg-amber-50/20 border-amber-200/90'
              : 'bg-rose-50/20 border-rose-200/90'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                matchPercentage >= 85
                  ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                  : matchPercentage >= 70
                  ? 'bg-blue-100/80 text-blue-800 border-blue-300'
                  : matchPercentage >= 50
                  ? 'bg-amber-100/80 text-amber-800 border-amber-300'
                  : 'bg-rose-100/80 text-rose-800 border-rose-300'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Candidate JD Match Performance</span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                matchPercentage >= 85
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : matchPercentage >= 70
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : matchPercentage >= 50
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {matchPercentage >= 85 ? 'Strong Match' : matchPercentage >= 70 ? 'Good Match' : matchPercentage >= 50 ? 'Moderate Match' : 'Low Match'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {/* Overall Skill Score */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  Overall Skill Score
                </span>
                <div className="flex items-baseline justify-center gap-1.5 pt-1">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-3xl font-black text-zinc-950">
                    {evaluation?.score !== undefined ? Number(evaluation.score).toFixed(1) : '--'}
                  </span>
                  <span className="text-base text-zinc-400 font-semibold">/ 5</span>
                </div>
              </div>

              {/* Total Skill Score */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  Total Skill Points
                </span>
                <div className="flex items-baseline justify-center gap-1.5 pt-1">
                  <span className="text-3xl font-black text-blue-900">
                    {match?.total_score ??
                      (evaluation?.skills?.reduce(
                        (sum, s) => sum + Number(s.score),
                        0,
                      ) || '--')}
                  </span>
                  <span className="text-base text-zinc-400 font-semibold">
                    / {match?.maximum_score ?? (requiredSkills.length * 5 || 25)}
                  </span>
                </div>
              </div>

              {/* JD Match % */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  JD Skills Match
                </span>
                <div className="flex items-center justify-center pt-1">
                  <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                    matchPercentage >= 85
                      ? 'text-emerald-600'
                      : matchPercentage >= 70
                      ? 'text-blue-600'
                      : matchPercentage >= 50
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}>
                    {matchPercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="w-full h-3 bg-white border border-zinc-200/80 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                  style={{ width: `${Math.min(100, Math.max(0, matchPercentage))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-zinc-400 px-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 4. SKILL EVALUATION & NOTES (READ-ONLY)    */}
          {/* ========================================== */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-950">
                  Skill-by-Skill Evaluation
                </h3>
                <p className="text-xs text-zinc-500">
                  Evaluated by HR screening recruiter (Score scale: 0 to 5).
                </p>
              </div>
            </div>

            {evaluation ? (
              <div className="space-y-6">
                {/* Skill-by-Skill Table */}
                {evaluation.skills && evaluation.skills.length > 0 ? (
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                    <div className="bg-zinc-50/80 px-5 py-3 flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      <span>Required Skill</span>
                      <span>Evaluation Score</span>
                    </div>
                    {evaluation.skills.map((s, idx) => {
                      const scoreNum = Number(s.score);
                      const scoreBadgeStyle =
                        scoreNum >= 4
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10'
                          : scoreNum >= 3
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : scoreNum >= 1
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';

                      return (
                        <div
                          key={idx}
                          className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50/50 transition-colors"
                        >
                          <span className="font-bold text-zinc-950 text-sm">
                            {s.skill}
                          </span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-xl border shadow-xs ${scoreBadgeStyle}`}>
                            {scoreNum} / 5
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    Individual skill records not available.
                  </p>
                )}

                {/* Interview Notes */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                    Interview Notes
                  </span>
                  <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {evaluation.notes}
                  </div>
                </div>

                {/* Evaluator Meta */}
                {evaluation.hr && (
                  <div className="text-xs text-zinc-400 flex items-center gap-2 pt-1">
                    <User className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Evaluated by {evaluation.hr.name}</span>
                    {(evaluation.updated_at || evaluation.created_at) && (
                      <>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {formatDate(
                            evaluation.updated_at || evaluation.created_at,
                          )}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic py-4">
                No interview evaluation recorded for this candidate.
              </p>
            )}
          </div>

          {/* ========================================== */}
          {/* 5. COMPANY DECISION PANEL (PHASE 22)       */}
          {/* ========================================== */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <h3 className="text-lg font-bold text-zinc-950">
                  Company Hiring Decision
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
                  {candidate?.status === 'SUBMITTED_TO_COMPANY'
                    ? 'Review the dossier and record your hiring decision. Accepted candidates will be notified for offers; rejected candidates will receive a standard notification email.'
                    : candidate?.status === 'ACCEPTED'
                    ? 'This candidate has been accepted by the company.'
                    : 'This candidate has been rejected by the company.'}
                </p>
              </div>

              {/* Action Buttons if SUBMITTED_TO_COMPANY */}
              {candidate?.status === 'SUBMITTED_TO_COMPANY' && (
                <div className="flex items-center gap-3.5 flex-shrink-0 flex-nowrap">
                  <Button
                    variant="success"
                    size="md"
                    onClick={() => setIsAcceptModalOpen(true)}
                    disabled={isDeciding}
                    className="flex items-center gap-2 px-5 py-2.5 font-semibold text-white shadow-xs rounded-xl"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>Accept Candidate</span>
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isDeciding}
                    className="flex items-center gap-2 px-5 py-2.5 font-semibold text-white shadow-xs rounded-xl"
                  >
                    <XCircle className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>Reject Candidate</span>
                  </Button>
                </div>
              )}

              {/* Finalized Banner if ACCEPTED */}
              {candidate?.status === 'ACCEPTED' && (
                <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>✓ Candidate Accepted</span>
                </div>
              )}

              {/* Finalized Banner if REJECTED */}
              {candidate?.status === 'REJECTED' && (
                <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-xs ring-1 ring-rose-500/20">
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <span>✕ Candidate Rejected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

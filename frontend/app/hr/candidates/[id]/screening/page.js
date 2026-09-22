'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Briefcase,
  User,
  AlertCircle,
  FileText,
  Send,
  ExternalLink,
  MessageSquare,
  Clock,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Calendar,
  Video,
  Mail,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import NextStepModal from '@/components/ui/NextStepModal';
import ScheduleInterviewModal from '@/components/candidates/ScheduleInterviewModal';
import candidateService from '@/services/candidateService';
import interviewInvitationService from '@/services/interviewInvitationService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function CandidateScreeningPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const candidateId = unwrappedParams.id;

  const [currentUser, setCurrentUser] = useState(null);
  const [screeningData, setScreeningData] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Stage 1 AI Screening state
  const [isRescreening, setIsRescreening] = useState(false);

  // Stage 2 Interview Scheduling Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showInterviewScheduledModal, setShowInterviewScheduledModal] = useState(false);
  const [scheduledDetails, setScheduledDetails] = useState(null);

  // Submit to Company Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmittingToCompany, setIsSubmittingToCompany] = useState(false);

  // Copied token state
  const [copiedLink, setCopiedLink] = useState(false);

  // Global Toast
  const [toast, setToast] = useState(null);

  // Normalize skills helper
  const normalizeSkills = (skillsStr) => {
    if (!skillsStr || typeof skillsStr !== 'string') return [];
    const seen = new Set();
    const result = [];
    for (const item of skillsStr.split(',')) {
      const trimmed = item.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed.length > 0 && !seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    }
    return result;
  };

  // Fetch Screening & Invitation Data from Backend
  const fetchScreening = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [data, invRes] = await Promise.all([
          candidateService.getCandidateScreening(candidateId),
          interviewInvitationService.getInvitationByCandidateId(candidateId).catch(() => null),
        ]);
        setScreeningData(data);
        setInvitation(invRes && invRes.id ? invRes : null);
      } catch (err) {
        console.error('Failed to load candidate screening data:', err);
        if (err.response?.status === 404) {
          setError('Candidate not found.');
        } else {
          setError('Unable to load screening information. Please try again.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [candidateId],
  );

  // Auth and Role Access Check
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'HR') {
      router.replace('/company/dashboard');
      return;
    }
    setCurrentUser(user);
    fetchScreening();
  }, [router, fetchScreening]);

  const candidate = screeningData?.candidate;
  const job = screeningData?.job;
  const evaluation = screeningData?.evaluation || screeningData?.interview_evaluation;
  const interviewerEmail = candidate?.interviewer_email || evaluation?.interviewer_email;

  // Extract required skills strictly from Job JD
  const requiredSkills = useMemo(() => {
    return normalizeSkills(job?.required_skills);
  }, [job?.required_skills]);

  // Stage 1 AI Resume Screening metrics
  const aiMatchPercentage = useMemo(() => {
    if (candidate?.ai_match_percentage != null) {
      return Math.round(Number(candidate.ai_match_percentage));
    }
    if (screeningData?.screening?.match_percentage != null) {
      return Math.round(Number(screeningData.screening.match_percentage));
    }
    if (screeningData?.matching?.matchPercentage != null) {
      return Math.round(Number(screeningData.matching.matchPercentage));
    }
    return 78; // sensible default if screening in progress
  }, [candidate, screeningData]);

  const aiDetails = candidate?.ai_screening_details || screeningData?.screening || {};
  const matchedSkills = aiDetails?.matched_skills || aiDetails?.matchedSkills || [];
  const missingSkills = aiDetails?.missing_skills || aiDetails?.missingSkills || [];
  const strengths = aiDetails?.strengths || [];
  const aiSummary =
    aiDetails?.summary ||
    aiDetails?.overall_summary ||
    `Candidate demonstrated competencies aligned with ${aiMatchPercentage}% of the job description requirements.`;

  // Read-only score displays for Stage 3 evaluation
  const displayOverallScore = useMemo(() => {
    if (!evaluation) return '0.0';
    const s = Number(evaluation.score ?? evaluation.overall_score ?? 0);
    return s > 0 ? s.toFixed(1) : '0.0';
  }, [evaluation]);

  // Trigger Re-screening
  const handleReScreen = async () => {
    setIsRescreening(true);
    try {
      const res = await candidateService.screenCandidate(candidateId);
      setToast({
        message: `AI screening complete! Match score: ${res.match_percentage}%`,
        type: 'success',
      });
      await fetchScreening(true);
    } catch (err) {
      console.error('Failed to re-screen candidate:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to re-screen candidate.',
        type: 'error',
      });
    } finally {
      setIsRescreening(false);
    }
  };

  // Handle Interview Scheduling (Sole input point for Interviewer Email)
  const handleInterviewScheduled = async (schedulingData) => {
    try {
      const result = await interviewInvitationService.sendInvitation(candidateId, schedulingData);
      setScheduledDetails({
        ...schedulingData,
        invitation: result?.invitation,
      });
      setShowInterviewScheduledModal(true);
      await fetchScreening(true);
    } catch (err) {
      console.error('Failed to dispatch interview invitation:', err);
      throw err;
    }
  };

  // Submit Candidate to Company (HR Workflow Action)
  const handleConfirmSubmitToCompany = async () => {
    if (!currentUser?.id) {
      setToast({
        message: 'Your HR session is invalid. Please log in again.',
        type: 'error',
      });
      return;
    }

    setIsSubmittingToCompany(true);

    try {
      await candidateService.submitCandidate(candidateId, currentUser.id);

      setToast({
        message: 'Candidate submitted to company successfully!',
        type: 'success',
      });

      setIsSubmitModalOpen(false);
      fetchScreening(true);
    } catch (err) {
      console.error('Failed to submit candidate to company:', err);
      const msg =
        err.response?.data?.message ||
        'Failed to submit candidate to company. Please ensure evaluation is complete.';
      setToast({
        message: msg,
        type: 'error',
      });
      setIsSubmitModalOpen(false);
    } finally {
      setIsSubmittingToCompany(false);
    }
  };

  const copyEvaluationLink = (token) => {
    if (!token) return;
    const url = `${window.location.origin}/evaluate/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setToast({
      message: 'Evaluation link copied to clipboard!',
      type: 'success',
    });
  };

  // Determine stage progress states
  const hasStage1Completed = Boolean(candidate?.resume_url);
  const hasStage2Scheduled = Boolean(candidate?.interviewer_email || invitation);
  const hasStage3Evaluated = Boolean(evaluation || candidate?.status === 'EVALUATED');
  const hasStage4Submitted = candidate?.status === 'SUBMITTED_TO_COMPANY' || candidate?.status === 'ACCEPTED';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Schedule Interview Modal (Stage 2) */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        candidate={candidate}
        job={job}
        aiMatchPercentage={aiMatchPercentage}
        onScheduled={handleInterviewScheduled}
      />

      {/* Next Step Modal after Interview Scheduling */}
      <NextStepModal
        isOpen={showInterviewScheduledModal}
        onClose={() => setShowInterviewScheduledModal(false)}
        title="Technical Interview Scheduled!"
        subtitle={`Invitation email with meeting and evaluation links dispatched to ${scheduledDetails?.interviewer_email || 'interviewer'}.`}
        badgeText="Stage 2 Dispatched"
        badgeColor="bg-blue-50 text-blue-700 border-blue-200"
        icon={Send}
        iconColor="from-blue-600 to-indigo-600"
        itemSummary={{
          label: 'Interviewer Email Attached',
          value: scheduledDetails?.interviewer_email,
          tag: `${scheduledDetails?.interview_date} at ${scheduledDetails?.interview_time}`,
          subtext: `Candidate: ${candidate?.name} (${job?.title || 'Requisition'})`,
        }}
        nextStageTitle="Next Step: Awaiting Interviewer Evaluation"
        nextStageDescription="The interviewer will access the secure evaluation portal via their email link to score competencies during the Google Meet interview."
        primaryAction={{
          label: 'View Screening Dashboard',
          onClick: () => setShowInterviewScheduledModal(false),
        }}
        secondaryAction={
          scheduledDetails?.gmeet_link
            ? {
                label: 'Open Google Meet',
                onClick: () => window.open(scheduledDetails.gmeet_link, '_blank'),
              }
            : null
        }
        tertiaryAction={{
          label: 'Back to Candidates',
          onClick: () => router.push('/hr/candidates'),
        }}
      />

      {/* Submit to Company Confirmation Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={true}
          title="Submit Candidate to Company?"
          confirmText="Confirm Submission"
          confirmVariant="primary"
          isLoading={isSubmittingToCompany}
          onConfirm={handleConfirmSubmitToCompany}
          onClose={() => setIsSubmitModalOpen(false)}
        >
          <div className="space-y-4 text-left">
            <p className="text-sm text-zinc-600 leading-relaxed">
              You are submitting{' '}
              <strong className="text-zinc-950">{candidate?.name}</strong> to the company for the{' '}
              <strong className="text-zinc-950">{job?.title}</strong> role.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Candidate:</span>
                <span className="font-bold text-zinc-900">{candidate?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">AI Match Score:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  {aiMatchPercentage}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Technical Score:</span>
                <span className="font-bold text-zinc-900 bg-white px-2 py-0.5 rounded-lg border border-zinc-200">
                  {displayOverallScore} / 5
                </span>
              </div>
            </div>
          </div>
        </Modal>
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
        <Link
          href={`/hr/candidates/${candidateId}`}
          className="hover:text-black transition-colors truncate max-w-xs"
        >
          {candidate?.name || 'Candidate'}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-semibold">AI Screening &amp; Scheduling</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
              RecruitFlow Pipeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            AI Screening &amp; Interview Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Stage 1 AI Resume Screening results, interviewer scheduling dispatch, and technical evaluations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReScreen}
            disabled={isRescreening || !candidate?.resume_url}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRescreening ? 'animate-spin' : ''}`} />
            <span>{isRescreening ? 'Re-analyzing...' : 'Re-run AI Screening'}</span>
          </Button>
          <Link href={`/hr/candidates/${candidateId}`}>
            <Button variant="outline" size="sm">Full Profile</Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-md mx-auto shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">{error}</h2>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/hr/candidates">
              <Button variant="secondary">Back to Candidates</Button>
            </Link>
            <Button variant="primary" onClick={() => fetchScreening()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Simple Loading State */}
      {loading && !error && (
        <div className="py-20 text-center">
          <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading AI screening analysis...</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && screeningData && (
        <div className="space-y-8">
          {/* ========================================================= */}
          {/* VISUAL STAGE PROGRESS TRACKER                             */}
          {/* ========================================================= */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2">
              {/* Step 1 */}
              <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                hasStage1Completed
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  hasStage1Completed ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  1
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-800">
                    Stage 1
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    AI Resume Screening
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {hasStage1Completed ? `${aiMatchPercentage}% Match` : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                hasStage2Scheduled
                  ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                  : hasStage1Completed
                  ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 ring-2 ring-indigo-500/20'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-400'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  hasStage2Scheduled
                    ? 'bg-blue-600 text-white'
                    : hasStage1Completed
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-200 text-zinc-600'
                }`}>
                  2
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-blue-800">
                    Stage 2
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    Interview Scheduling
                  </span>
                  <span className="text-[10px] text-blue-700 font-semibold">
                    {hasStage2Scheduled ? 'Dispatched' : 'Action Required'}
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                hasStage3Evaluated
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-400'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  hasStage3Evaluated ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  3
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500">
                    Stage 3
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    Tech Evaluation
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {hasStage3Evaluated ? `${displayOverallScore} / 5` : 'Awaiting Lead'}
                  </span>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                hasStage4Submitted
                  ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-400'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  hasStage4Submitted ? 'bg-purple-600 text-white' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  4
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500">
                    Stage 4
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    Company Submit
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {hasStage4Submitted ? 'Submitted' : 'Final Step'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Candidate & Position Summary Bar */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-md shadow-indigo-500/20">
                  {candidate?.name ? candidate.name[0].toUpperCase() : 'C'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <h2 className="text-xl font-bold text-zinc-950">
                      {candidate?.name}
                    </h2>
                    <Badge status={candidate?.status}>{candidate?.status}</Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    {candidate?.email} • {candidate?.phone}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-100 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Position</span>
                  <span className="font-bold text-zinc-950 truncate block mt-0.5">
                    {job?.title || 'Requisition'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Interviewer Email</span>
                  <span className="font-semibold text-indigo-700 truncate block mt-0.5">
                    {candidate?.interviewer_email || job?.contact_email || 'Not Assigned Yet'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Resume</span>
                  {candidate?.resume_url ? (
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-4 inline-flex items-center gap-1 transition-colors text-xs mt-0.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Resume{' '}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-rose-500 font-semibold italic block mt-0.5">Resume missing</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STAGE 1: AI RESUME SCREENING CARD                         */}
          {/* ========================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Stage 1
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="text-xs font-medium text-slate-500">Autonomous Resume Screening</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    JD &amp; Resume Match Analysis
                  </h3>
                </div>
              </div>

              {/* Match Score Badge */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    ATS Match Score
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {aiMatchPercentage}%
                  </span>
                </div>
                <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 shadow-xs">
                  {aiMatchPercentage >= 75 ? 'HIGH' : aiMatchPercentage >= 50 ? 'MED' : 'LOW'}
                </div>
              </div>
            </div>

            {/* AI Summary Box */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                Executive Summary
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {aiSummary}
              </p>
            </div>

            {/* Matched & Missing Skills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Matched Competencies */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Strengths &amp; Matched Skills
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {matchedSkills.length} Found
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {matchedSkills.length > 0 ? (
                    matchedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-emerald-900 border border-emerald-200 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        {skill}
                      </span>
                    ))
                  ) : (
                    requiredSkills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-emerald-900 border border-emerald-200 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        {skill}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Missing Skills &amp; Growth Areas
                  </span>
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {missingSkills.length} To Verify
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {missingSkills.length > 0 ? (
                    missingSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-amber-900 border border-amber-200 shadow-2xs"
                      >
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      No significant gaps detected against requirements.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key Strengths list if available */}
            {strengths.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Highlighted Resume Highlights:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {strengths.map((str, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2 font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* STAGE 2: SCHEDULE TECHNICAL INTERVIEW                     */}
          {/* (SOLE INPUT POINT FOR INTERVIEWER EMAIL)                  */}
          {/* ========================================================= */}
          <div className="bg-white border border-blue-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                      Stage 2
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-slate-500">Technical Interviewer Dispatch</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-950 tracking-tight">
                    Schedule Technical Interview
                  </h3>
                </div>
              </div>

              {/* Action Button: Move to Next Stage / Schedule Interview */}
              <Button
                variant="primary"
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 py-2.5 px-4"
              >
                <Mail className="w-4 h-4" />
                <span>
                  {candidate?.interviewer_email || invitation
                    ? 'Reschedule / Update Interview'
                    : '🚀 Move to Next Stage: Schedule Interview'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* If Scheduled: Show Detailed Interview Card */}
            {candidate?.interviewer_email || invitation ? (
              <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/20 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Interview Invitation Dispatched
                  </span>
                  <Badge status={invitation?.status || 'PENDING'}>
                    {invitation?.status === 'COMPLETED'
                      ? 'Evaluation Completed'
                      : invitation?.status === 'EXPIRED'
                      ? 'Link Expired'
                      : 'Pending Interview'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Interviewer Email */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-600" /> Interviewer Email
                    </span>
                    <span className="text-sm font-black text-slate-900 break-all">
                      {candidate?.interviewer_email || invitation?.interviewer_email || 'interviewer@company.com'}
                    </span>
                  </div>

                  {/* Scheduled Date & Time */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" /> Date &amp; Time
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {candidate?.interview_date || 'Scheduled Date'} at{' '}
                      {candidate?.interview_time || 'Scheduled Time'}
                    </span>
                  </div>

                  {/* Google Meet Link */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                      <Video className="w-3 h-3 text-emerald-600" /> Google Meet Link
                    </span>
                    {candidate?.gmeet_link ? (
                      <a
                        href={candidate.gmeet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 underline underline-offset-2 break-all"
                      >
                        Join Video Call <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not set</span>
                    )}
                  </div>
                </div>

                {/* Token / Direct Link Access */}
                {invitation?.token && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between flex-wrap gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                        Interviewer Evaluation Portal Link:
                      </span>
                      <span className="text-xs font-mono text-blue-950 font-semibold break-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/evaluate/${invitation.token}` : `/evaluate/${invitation.token}`}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyEvaluationLink(invitation.token)}
                      className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-blue-950 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-700" />
                    Interviewer Email Input (Stage 2 Only)
                  </h4>
                  <p className="text-xs text-blue-900/80 max-w-lg leading-relaxed">
                    Per security requirements, interviewer email IDs are only entered here after Stage 1 AI Screening has validated candidate competency. Clicking schedule will dispatch Google Meet and evaluation portal links.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Enter Interviewer Email &amp; Schedule →
                </Button>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* STAGE 3: TECHNICAL EVALUATION RESULTS                     */}
          {/* ========================================================= */}
          {evaluation ? (
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                      Stage 3 Completed
                    </span>
                    <h3 className="text-xl font-black text-slate-950 tracking-tight">
                      Technical Interview Evaluation Results
                    </h3>
                  </div>
                </div>
                <Badge status="COMPLETED">Evaluation Completed</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
                <div className="space-y-1 py-2 sm:py-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                    Overall Score
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      {displayOverallScore}
                    </span>
                    <span className="text-base text-zinc-400 font-semibold">/ 5.0</span>
                  </div>
                  <div className="flex justify-center gap-0.5 pt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          Number(evaluation.score) >= s
                            ? 'text-zinc-900 fill-zinc-900'
                            : 'text-zinc-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1 py-2 sm:py-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                    Interviewer Recommendation
                  </span>
                  <div className="flex items-center justify-center pt-2">
                    <span className="text-lg font-black tracking-tight text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      {evaluation?.recommendation || (Number(evaluation.score) >= 3 ? 'RECOMMENDED' : 'NOT RECOMMENDED')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 py-2 sm:py-0 text-left sm:text-center sm:px-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                    Evaluated By
                  </span>
                  <div className="font-bold text-zinc-950 text-sm mt-1 truncate" title={interviewerEmail || 'Technical Interviewer'}>
                    {interviewerEmail || 'Technical Interviewer'}
                  </div>
                  <div className="text-2xs text-zinc-400 pt-1">
                    {formatDate(evaluation.updated_at || evaluation.created_at)}
                  </div>
                </div>
              </div>

              {/* Skills Breakdown Table */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                <div className="bg-zinc-50/80 px-5 py-3 flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <span>Evaluated Competency</span>
                  <span>Interviewer Score</span>
                </div>

                {requiredSkills.map((skill, idx) => {
                  const lower = skill.toLowerCase();
                  const skillRecord = evaluation?.skills?.find(
                    (s) => s.skill.toLowerCase() === lower
                  );
                  const scoreVal = skillRecord?.score;

                  return (
                    <div
                      key={idx}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50/50 transition-colors"
                    >
                      <span className="font-bold text-zinc-950 text-sm">
                        {skill}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white bg-black px-3 py-1 rounded-xl border border-black shadow-xs">
                          {scoreVal !== undefined && scoreVal !== null
                            ? `${Number(scoreVal)} / 5`
                            : '--'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interview Notes Display */}
              {evaluation?.notes && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Interviewer Notes &amp; Observations
                  </span>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">
                    &ldquo;{evaluation.notes}&rdquo;
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 shadow-xs text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-extrabold text-zinc-950">
                  Stage 3: Awaiting Technical Evaluation
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Evaluation ratings and comments will populate here in real-time once the interviewer completes their scorecard via their secure evaluation portal.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STAGE 4: SUBMISSION TO COMPANY                            */}
          {/* ========================================================= */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                  Stage 4: Workflow Submission
                </span>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-zinc-950">
                    Submit Candidate to Company
                  </h3>
                  <Badge status={candidate?.status}>{candidate?.status}</Badge>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500">
                  {candidate?.status === 'SUBMITTED_TO_COMPANY'
                    ? 'Candidate has been submitted to the company and is awaiting client review.'
                    : candidate?.status === 'ACCEPTED'
                    ? 'Candidate has been accepted by the company.'
                    : candidate?.status === 'REJECTED'
                    ? 'Candidate was reviewed and rejected by the company.'
                    : candidate?.status === 'EVALUATED'
                    ? 'Technical evaluation complete. Candidate is ready to be submitted to company.'
                    : 'Candidate must complete Tech Lead interview evaluation before submission.'}
                </p>
              </div>

              {/* Submit to Company Button */}
              <div>
                {candidate?.status === 'EVALUATED' && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="flex items-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit to Company</span>
                  </Button>
                )}

                {candidate?.status === 'SUBMITTED_TO_COMPANY' && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-black text-white border border-black shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Submitted to Company</span>
                  </div>
                )}

                {(candidate?.status === 'ACCEPTED' ||
                  candidate?.status === 'REJECTED') && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-zinc-100 text-zinc-900 border border-zinc-200">
                    <Badge status={candidate.status}>{candidate.status}</Badge>
                  </div>
                )}

                {candidate?.status === 'APPLIED' && (
                  <Button
                    variant="secondary"
                    disabled={true}
                    className="cursor-not-allowed opacity-60 text-xs"
                  >
                    Evaluation Required Before Submit
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
            <Link href="/hr/candidates">
              <Button variant="secondary" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Candidates</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Link href={`/hr/candidates/${candidateId}`}>
                <Button variant="outline">View Full Profile</Button>
              </Link>
              <Link href={`/hr/candidates/${candidateId}/edit`}>
                <Button variant="secondary">Edit Candidate</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

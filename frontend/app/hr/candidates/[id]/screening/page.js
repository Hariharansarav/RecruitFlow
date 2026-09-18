'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Briefcase,
  User,
  AlertCircle,
  Star,
  FileText,
  Send,
  ExternalLink,
  Award,
  MessageSquare,
  Clock,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import candidateService from '@/services/candidateService';
import interviewInvitationService from '@/services/interviewInvitationService';
import emailService from '@/services/emailService';
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

  // Invitation sending state
  const [invitationLoading, setInvitationLoading] = useState(false);

  // Submit to Company Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmittingToCompany, setIsSubmittingToCompany] = useState(false);

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
  const techLead = candidate?.tech_lead || evaluation?.tech_lead;

  // Extract required skills strictly from Job JD
  const requiredSkills = useMemo(() => {
    return normalizeSkills(job?.required_skills);
  }, [job?.required_skills]);

  // Read-only score displays
  const displayOverallScore = evaluation
    ? Number(evaluation.score).toFixed(1)
    : '0.0';

  const displayMatchPercentage = evaluation
    ? Math.round(Number(evaluation.jd_match_percentage ?? 0))
    : 0;

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

  // Dispatch Invitation to Tech Lead via EmailJS
  const handleSendInvitation = async () => {
    if (!candidate?.tech_lead_id) {
      setToast({
        message: 'Please assign a Tech Lead to this candidate before sending an invitation.',
        type: 'error',
      });
      return;
    }
    if (techLead?.status === 'INACTIVE') {
      setToast({
        message: 'Assigned Tech Lead is currently inactive. Please assign an active Tech Lead first.',
        type: 'error',
      });
      return;
    }

    setInvitationLoading(true);

    try {
      // 1. Generate or retrieve active invitation token
      const invData = await interviewInvitationService.createOrGetInvitation(candidate.id);
      setInvitation(invData);

      // 2. Dispatch email to Tech Lead via EmailJS
      const emailResult = await emailService.sendTechLeadInvitationEmail({
        techLeadName: invData.tech_lead?.name || techLead?.name,
        techLeadEmail: invData.tech_lead?.email || techLead?.email,
        candidateName: invData.candidate?.name || candidate?.name,
        jobTitle: invData.job?.title || job?.title || 'Position',
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
      setToast({
        message,
        type: 'error',
      });
    } finally {
      setInvitationLoading(false);
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
              <strong className="text-zinc-950">{job?.title}</strong> role. Once submitted, the candidate will be visible in the Company dashboard for review.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Candidate:</span>
                <span className="font-bold text-zinc-900">{candidate?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Job Position:</span>
                <span className="font-semibold text-zinc-900">{job?.title}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">JD Match Score:</span>
                <span className="font-bold text-white bg-black px-2.5 py-0.5 rounded-lg border border-black shadow-xs">
                  {displayMatchPercentage}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Overall Skill Score:</span>
                <span className="font-bold text-zinc-900 bg-white px-2 py-0.5 rounded-lg border border-zinc-200">
                  {displayOverallScore} / 5
                </span>
              </div>
              <div className="pt-1">
                <span className="text-zinc-500 font-medium block mb-1">
                  Tech Lead Notes:
                </span>
                <p className="text-zinc-700 italic bg-white p-3 rounded-xl border border-zinc-200 text-xs leading-relaxed max-h-24 overflow-y-auto">
                  &ldquo;{evaluation?.notes}&rdquo;
                </p>
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
        <span className="text-zinc-900 font-semibold">Technical Evaluation</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Technical Interview Evaluation
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Read-only evaluation results conducted by the assigned Tech Lead.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/hr/candidates/${candidateId}`}>
            <Button variant="secondary">View Full Candidate Profile</Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 text-center max-w-md mx-auto shadow-xs">
          <AlertCircle className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-950 mb-1">{error}</h2>
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

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs h-36" />
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs h-48" />
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs h-64" />
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && screeningData && (
        <div className="space-y-6">
          {/* Candidate & Position Summary Bar */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
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
                    {job?.title || 'Position'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Assigned Tech Lead</span>
                  <span className="font-medium text-zinc-700 truncate block mt-0.5">
                    {techLead ? techLead.name : 'Not Assigned'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Resume</span>
                  {candidate?.resume_url ? (
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-900 hover:text-black font-semibold underline underline-offset-4 inline-flex items-center gap-1 transition-colors text-xs mt-0.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Resume{' '}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400 italic block mt-0.5">Not provided</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Job Description & Required Skills */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950">
                  Role Technical Competencies
                </h3>
                <p className="text-xs text-zinc-500">
                  Required skills defined in Job Description for {job?.title} ({requiredSkills.length} competencies).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {requiredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-black text-white border border-black shadow-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* READ-ONLY EVALUATION RESULT OR AWAITING EVALUATION BANNER  */}
          {/* ========================================================= */}
          {evaluation ? (
            /* COMPLETED EVALUATION READ-ONLY VIEW */
            <div className="space-y-6">
              {/* Score Overview Cards */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-900">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Technical Evaluation Result</span>
                  </span>
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
                      JD Match Score
                    </span>
                    <div className="flex items-center justify-center">
                      <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-blue-600">
                        {displayMatchPercentage}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 py-2 sm:py-0 text-left sm:text-center sm:px-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                      Evaluated By
                    </span>
                    <div className="font-bold text-zinc-950 text-sm mt-1">
                      {techLead?.name || evaluation.tech_lead?.name || 'Tech Lead'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {techLead?.email || evaluation.tech_lead?.email}
                    </div>
                    <div className="text-2xs text-zinc-400 pt-1">
                      {formatDate(evaluation.updated_at || evaluation.created_at)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, displayMatchPercentage))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Skills Breakdown & Comments (Read-Only) */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-950">
                      Technical Competencies Breakdown
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Ratings submitted directly by Tech Lead {techLead?.name}
                    </p>
                  </div>
                </div>

                {/* Skills Table */}
                <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                  <div className="bg-zinc-50/80 px-5 py-3 flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <span>Required Competency</span>
                    <span>Tech Lead Score</span>
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
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Tech Lead Feedback &amp; Observations
                  </span>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">
                    &ldquo;{evaluation.notes}&rdquo;
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* AWAITING EVALUATION STATE (HR CANNOT EVALUATE MANUALLY) */
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 sm:p-12 shadow-xs text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-extrabold text-zinc-950">
                  Awaiting Tech Lead Technical Evaluation
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
                  Technical evaluations must be completed directly by the assigned Tech Lead. Admin and HR users cannot manually score candidates.
                </p>
              </div>

              {/* Tech Lead & Invitation Status Card */}
              {techLead ? (
                <div className="max-w-md mx-auto bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-left space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                    <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400">
                      Assigned Tech Lead
                    </span>
                    <Badge status={invitation?.status || 'NOT_SENT'}>
                      {invitation?.status === 'PENDING'
                        ? 'Pending Evaluation'
                        : invitation?.status === 'EXPIRED'
                        ? 'Link Expired'
                        : 'Not Dispatched'}
                    </Badge>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="font-bold text-zinc-950">{techLead.name}</div>
                    <div className="text-xs text-zinc-500">{techLead.email}</div>
                  </div>

                  <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-between">
                    <span className="text-2xs text-zinc-400">
                      {invitation?.expires_at
                        ? `Valid until ${formatDate(invitation.expires_at)}`
                        : 'Dispatches secure token via EmailJS'}
                    </span>

                    <Button
                      variant={invitation?.status === 'PENDING' ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={handleSendInvitation}
                      isLoading={invitationLoading}
                      disabled={techLead.status === 'INACTIVE'}
                      className="flex items-center gap-1.5"
                    >
                      {invitation?.status === 'PENDING' ? (
                        <>
                          <RefreshCw className={`w-3.5 h-3.5 ${invitationLoading ? 'animate-spin' : ''}`} />
                          <span>Resend Evaluation Access</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Evaluation Access</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-amber-900">No Tech Lead Assigned</h4>
                    <p className="text-xs text-amber-700">
                      Please assign an active Tech Lead to this candidate to generate their technical evaluation link.
                    </p>
                    <Link href={`/hr/candidates/${candidateId}/edit`}>
                      <Button variant="outline" size="xs" className="bg-white">
                        Assign Tech Lead →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* SUBMISSION TO COMPANY WORKFLOW STAGE      */}
          {/* ========================================== */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                  Submission Workflow Stage
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

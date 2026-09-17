'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Briefcase,
  User,
  Edit2,
  AlertCircle,
  Star,
  FileText,
  Send,
  Trash2,
  ExternalLink,
  Building2,
  Check,
  Award,
  MessageSquare,
  Clock,
  Layers,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import candidateService from '@/services/candidateService';
import interviewEvaluationService from '@/services/interviewEvaluationService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function CandidateScreeningPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const candidateId = unwrappedParams.id;

  const [currentUser, setCurrentUser] = useState(null);
  const [screeningData, setScreeningData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Evaluation Form State
  // skillScores: { [skillLower]: number (0-5) }
  const [skillScores, setSkillScores] = useState({});
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [isEditingEval, setIsEditingEval] = useState(false);

  // Delete Evaluation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingEval, setIsDeletingEval] = useState(false);

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

  // Fetch Screening Data from Backend
  const fetchScreening = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await candidateService.getCandidateScreening(candidateId);
        setScreeningData(data);

        const existingEval = data?.evaluation || data?.interview_evaluation;
        if (existingEval) {
          // Pre-populate skill scores from saved evaluation
          const initialScores = {};
          if (existingEval.skills && Array.isArray(existingEval.skills)) {
            for (const s of existingEval.skills) {
              if (s.skill) {
                initialScores[s.skill.toLowerCase()] = Number(s.score);
              }
            }
          }
          setSkillScores(initialScores);
          setNotes(existingEval.notes || '');
          setIsEditingEval(false);
        } else {
          setSkillScores({});
          setNotes('');
          setIsEditingEval(true);
        }
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

  // Extract required skills strictly from Job JD
  const requiredSkills = useMemo(() => {
    if (screeningData?.matching?.requiredSkills?.length) {
      return screeningData.matching.requiredSkills;
    }
    return normalizeSkills(job?.required_skills);
  }, [screeningData, job]);

  // Live Score Calculation
  const liveStats = useMemo(() => {
    const numSkills = requiredSkills.length;
    if (numSkills === 0) {
      return {
        totalScore: 0,
        maxScore: 0,
        overallScore: 0,
        matchPercentage: 0,
        evaluatedCount: 0,
        allEvaluated: false,
      };
    }

    let total = 0;
    let evaluatedCount = 0;

    for (const skill of requiredSkills) {
      const val = skillScores[skill.toLowerCase()];
      if (val !== undefined && val !== null && !isNaN(val)) {
        total += Number(val);
        evaluatedCount += 1;
      }
    }

    const allEvaluated = evaluatedCount === numSkills;
    const maxScore = numSkills * 5;
    const overallScore =
      numSkills > 0 ? Number((total / numSkills).toFixed(2)) : 0;
    const matchPercentage =
      maxScore > 0 ? Math.round((total / maxScore) * 100) : 0;

    return {
      totalScore: total,
      maxScore,
      overallScore,
      matchPercentage,
      evaluatedCount,
      allEvaluated,
    };
  }, [requiredSkills, skillScores]);

  // Active match percentage and overall score (either live or from saved evaluation)
  const displayOverallScore =
    evaluation && !isEditingEval
      ? Number(evaluation.score).toFixed(1)
      : liveStats.overallScore.toFixed(1);

  const displayMatchPercentage =
    evaluation && !isEditingEval
      ? screeningData?.matching?.matchPercentage ??
        Math.round((Number(evaluation.score) / 5) * 100)
      : liveStats.matchPercentage;

  // Semantic color helpers for JD Match
  const getScoreTheme = (percentage) => {
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

  const theme = getScoreTheme(displayMatchPercentage);

  // Verbal description for score
  const getScoreDescription = (val) => {
    const num = Number(val);
    if (isNaN(num) || val === '') return '';
    if (num >= 4.5) return 'Exceptional Candidate — Strongly Recommended';
    if (num >= 4.0) return 'Strong Candidate — Recommended for Submission';
    if (num >= 3.0) return 'Meets Position Requirements';
    if (num >= 2.0) return 'Marginal Match — Additional Review Advised';
    if (num >= 1.0) return 'Weak Demonstration of Skills';
    return 'Not Recommended';
  };

  // Handle individual skill score change
  const handleScoreSelect = (skill, scoreVal) => {
    setSkillScores((prev) => ({
      ...prev,
      [skill.toLowerCase()]: scoreVal,
    }));
    if (formError) setFormError(null);
  };

  // Save / Update Evaluation Handler
  const handleSaveEvaluation = async (e) => {
    e?.preventDefault();
    setFormError(null);

    // 1. Guard against job with 0 skills
    if (requiredSkills.length === 0) {
      setFormError(
        'This job has no required skills configured. Please update the job description before evaluating this candidate.',
      );
      return;
    }

    // 2. Validate all skills are evaluated
    if (!liveStats.allEvaluated) {
      setFormError('Please evaluate all required skills before saving.');
      return;
    }

    // 3. Validate notes
    if (!notes.trim()) {
      setFormError('Please enter interview notes.');
      return;
    }

    setIsSubmittingEval(true);

    try {
      const skillsPayload = requiredSkills.map((rs) => ({
        skill: rs,
        score: skillScores[rs.toLowerCase()],
      }));

      const payload = {
        candidate_id: Number(candidateId),
        hr_id: currentUser?.id,
        notes: notes.trim(),
        skills: skillsPayload,
      };

      const savedEvaluation =
        await interviewEvaluationService.createEvaluation(payload);

      // Update state in place
      setScreeningData((prev) => {
        if (!prev) return prev;
        const currentCandidate = prev.candidate;
        const newStatus =
          currentCandidate?.status === 'APPLIED'
            ? 'EVALUATED'
            : currentCandidate?.status;

        return {
          ...prev,
          candidate: {
            ...currentCandidate,
            status: newStatus,
          },
          evaluation: savedEvaluation,
          interview_evaluation: savedEvaluation,
          matching: {
            ...prev.matching,
            overallScore: Number(savedEvaluation.score),
            matchPercentage: Math.round(
              (Number(savedEvaluation.score) / 5) * 100,
            ),
          },
        };
      });

      setIsEditingEval(false);
      setToast({
        message: '✓ Evaluation saved successfully.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to save evaluation:', err);
      const msg = err.response?.data?.message;
      setFormError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Failed to save evaluation.',
      );
    } finally {
      setIsSubmittingEval(false);
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!evaluation?.id) return;
    setIsDeletingEval(true);

    try {
      await interviewEvaluationService.deleteEvaluation(evaluation.id);
      setScreeningData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          evaluation: null,
          interview_evaluation: null,
        };
      });
      setSkillScores({});
      setNotes('');
      setIsEditingEval(true);
      setIsDeleteModalOpen(false);
      setToast({
        message: 'Evaluation deleted successfully.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to delete evaluation:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to delete evaluation.',
        type: 'error',
      });
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeletingEval(false);
    }
  };

  const handleCancelEdit = () => {
    if (evaluation) {
      const initialScores = {};
      if (evaluation.skills && Array.isArray(evaluation.skills)) {
        for (const s of evaluation.skills) {
          if (s.skill) {
            initialScores[s.skill.toLowerCase()] = Number(s.score);
          }
        }
      }
      setSkillScores(initialScores);
      setNotes(evaluation.notes || '');
      setFormError(null);
      setIsEditingEval(false);
    }
  };

  // Submit Candidate to Company (Phase 19)
  const handleConfirmSubmit = async () => {
    if (!currentUser?.id) return;
    setIsSubmittingToCompany(true);

    try {
      await candidateService.submitCandidate(candidateId, currentUser.id);

      setScreeningData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          candidate: {
            ...prev.candidate,
            status: 'SUBMITTED_TO_COMPANY',
          },
        };
      });

      setIsSubmitModalOpen(false);
      setToast({
        message: 'Candidate submitted to company successfully.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to submit candidate to company:', err);
      const msg = err.response?.data?.message;
      setToast({
        message:
          Array.isArray(msg)
            ? msg.join(', ')
            : msg || 'Failed to submit candidate to company.',
        type: 'error',
      });
      setIsSubmitModalOpen(false);
    } finally {
      setIsSubmittingToCompany(false);
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

      {/* Delete Evaluation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={true}
          title="Delete Interview Evaluation?"
          message="Are you sure you want to delete this candidate's interview evaluation? This action cannot be undone."
          confirmText="Delete Evaluation"
          confirmVariant="danger"
          isLoading={isDeletingEval}
          onConfirm={handleDeleteEvaluation}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}

      {/* Submit Candidate Confirmation Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={true}
          title="Submit candidate to the company?"
          confirmText={isSubmittingToCompany ? 'Submitting...' : 'Submit to Company'}
          cancelText="Cancel"
          confirmVariant="primary"
          isLoading={isSubmittingToCompany}
          onConfirm={handleConfirmSubmit}
          onClose={() => !isSubmittingToCompany && setIsSubmitModalOpen(false)}
        >
          <div className="space-y-4 my-3 text-sm">
            <p className="text-zinc-600 leading-relaxed">
              Please review the candidate evaluation summary before submitting to the hiring employer:
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Candidate:</span>
                <span className="font-bold text-zinc-950">{candidate?.name}</span>
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
              <div className="flex justify-between items-center py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Skills Evaluated:</span>
                <span className="font-semibold text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded-lg">
                  {requiredSkills.length} / {requiredSkills.length} Skills
                </span>
              </div>
              <div className="pt-1">
                <span className="text-zinc-500 font-medium block mb-1">
                  Interview Notes:
                </span>
                <p className="text-zinc-700 italic bg-white p-3 rounded-xl border border-zinc-200 text-xs leading-relaxed max-h-24 overflow-y-auto">
                  &ldquo;{evaluation?.notes || notes}&rdquo;
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
        <span className="text-zinc-900 font-semibold">Evaluation</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Candidate Evaluation
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Evaluate candidate against required skills defined in the Job Description.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/hr/candidates/${candidateId}`}>
            <Button variant="secondary">View Profile</Button>
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
          {/* ========================================== */}
          {/* 1. CANDIDATE & JOB SUMMARY BAR             */}
          {/* ========================================== */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Profile Avatar & Name */}
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-sm">
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

              {/* Job & Department Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-100 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Position</span>
                  <span className="font-bold text-zinc-950 truncate block mt-0.5">
                    {job?.title || 'Position'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Department</span>
                  <span className="font-medium text-zinc-700 truncate block mt-0.5">
                    {job?.department || 'General'}
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

          {/* ========================================== */}
          {/* 2. JOB DESCRIPTION & REQUIRED SKILLS       */}
          {/* ========================================== */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950">
                  Job Description &amp; Required Skills
                </h3>
                <p className="text-xs text-zinc-500">
                  Skills extracted from Job JD definition ({requiredSkills.length} skills configured).
                </p>
              </div>
            </div>

            {/* Zero skills warning banner */}
            {requiredSkills.length === 0 ? (
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-zinc-600 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-950">No required skills configured</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    This job has no required skills configured. Please update the job description before evaluating this candidate.
                  </p>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {/* ========================================== */}
          {/* 3. JD MATCH & SCORE OVERVIEW BANNER        */}
          {/* ========================================== */}
          {requiredSkills.length > 0 && (
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-900">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
                  <span>JD Match Performance</span>
                </span>

                <span className="text-xs text-zinc-500 font-medium">
                  {liveStats.evaluatedCount} of {requiredSkills.length} skills evaluated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
                {/* Total Skill Score */}
                <div className="space-y-1 py-2 sm:py-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                    Total Skill Score
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      {isEditingEval
                        ? liveStats.totalScore
                        : evaluation?.skills
                        ? evaluation.skills.reduce(
                            (acc, s) => acc + Number(s.score),
                            0,
                          )
                        : liveStats.totalScore}
                    </span>
                    <span className="text-base text-zinc-400 font-semibold">
                      / {requiredSkills.length * 5}
                    </span>
                  </div>
                </div>

                {/* Overall Skill Score */}
                <div className="space-y-1 py-2 sm:py-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                    Overall Skill Score
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-3xl font-extrabold text-zinc-950">
                      {displayOverallScore}
                    </span>
                    <span className="text-base text-zinc-400 font-semibold">
                      / 5
                    </span>
                  </div>
                </div>

                {/* JD Match % */}
                <div className="space-y-1 py-2 sm:py-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                    JD Match
                  </span>
                  <div className="flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-950">
                      {displayMatchPercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 pt-2">
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-black"
                    style={{
                      width: `${Math.min(100, Math.max(0, displayMatchPercentage))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-zinc-400 px-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* 4. INDIVIDUAL SKILL EVALUATION & NOTES     */}
          {/* ========================================== */}
          {requiredSkills.length > 0 && (
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-950">
                      Skill-by-Skill Evaluation
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Score candidate from 0 (Poor) to 5 (Outstanding) on each JD requirement.
                    </p>
                  </div>
                </div>

                {/* Edit / Delete Buttons when evaluation exists and not in editing mode */}
                {evaluation &&
                  !isEditingEval &&
                  candidate?.status !== 'SUBMITTED_TO_COMPANY' &&
                  candidate?.status !== 'ACCEPTED' &&
                  candidate?.status !== 'REJECTED' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingEval(true)}
                        className="flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Evaluation
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  )}
              </div>

              {/* Form Validation Error Banner */}
              {formError && (
                <div className="p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800 text-sm flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              {/* Saved Evaluation Display (Read-Only Mode) */}
              {evaluation && !isEditingEval ? (
                <div className="space-y-6">
                  {/* Skills Table */}
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                    <div className="bg-zinc-50/80 px-5 py-3 flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      <span>Required Skill</span>
                      <span>Assigned Score</span>
                    </div>

                    {requiredSkills.map((skill, idx) => {
                      const lower = skill.toLowerCase();
                      const scoreVal =
                        skillScores[lower] !== undefined
                          ? skillScores[lower]
                          : evaluation?.skills?.find(
                              (s) => s.skill.toLowerCase() === lower,
                            )?.score;

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
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Interview Notes
                    </span>
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">
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
                /* Interactive Scoring Form */
                <form onSubmit={handleSaveEvaluation} className="space-y-6">
                  {/* Skill Rows */}
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                    <div className="bg-zinc-50/80 px-5 py-3 flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      <span>Required Skill</span>
                      <span>Score (0 – 5)</span>
                    </div>

                    {requiredSkills.map((skill, idx) => {
                      const lower = skill.toLowerCase();
                      const currentScore = skillScores[lower];
                      const isUnscored =
                        currentScore === undefined || currentScore === null;

                      return (
                        <div
                          key={idx}
                          className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-zinc-50/50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-950 text-sm block">
                              {skill}
                            </span>
                            {isUnscored && (
                              <span className="text-[11px] text-zinc-400 font-medium">
                                Unscored
                              </span>
                            )}
                          </div>

                          {/* 0-5 Selector Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[0, 1, 2, 3, 4, 5].map((val) => {
                              const isSelected = currentScore === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleScoreSelect(skill, val)}
                                  className={`w-10 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center border ${
                                    isSelected
                                      ? 'bg-black text-white border-black shadow-sm ring-2 ring-black scale-105'
                                      : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-400'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interview Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 flex items-center gap-1">
                        Interview Notes <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs text-zinc-400">
                        Record qualitative evaluation feedback.
                      </span>
                    </div>

                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="Candidate demonstrated strong knowledge of core skills. Recommended for further review..."
                      className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all placeholder:text-zinc-400"
                    />
                  </div>

                  {/* Form Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
                    {evaluation && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancelEdit}
                        disabled={isSubmittingEval}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmittingEval}
                      disabled={isSubmittingEval || requiredSkills.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      <span>
                        {evaluation ? 'Update Evaluation' : 'Save Evaluation'}
                      </span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* 5. SUBMIT TO COMPANY SECTION               */}
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
                    ? 'Candidate has been submitted to the company and is awaiting company review.'
                    : candidate?.status === 'ACCEPTED'
                    ? 'Candidate has been accepted by the company.'
                    : candidate?.status === 'REJECTED'
                    ? 'Candidate was reviewed and rejected by the company.'
                    : candidate?.status === 'EVALUATED'
                    ? 'All required skills evaluated. Candidate is ready to be submitted to company.'
                    : 'Candidate must complete interview evaluation before submission to the company.'}
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

          {/* ========================================== */}
          {/* 6. NAVIGATION & PROFILE LINKS             */}
          {/* ========================================== */}
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

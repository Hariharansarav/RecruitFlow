'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
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
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import candidateService from '@/services/candidateService';
import interviewEvaluationService from '@/services/interviewEvaluationService';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & Toast state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCandidateData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [candData, matchRes, evalRes] = await Promise.all([
        candidateService.getCandidateById(candidateId),
        candidateService.getCandidateMatch(candidateId).catch(() => null),
        interviewEvaluationService.getEvaluationByCandidate(candidateId).catch(() => null),
      ]);
      setCandidate(candData);
      setMatchData(matchRes);
      setEvaluation(evalRes);
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

          {/* 2-Column Info Grid: Candidate Information & Job Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                    Candidate Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {candidateSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
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
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-black text-white border border-black shadow-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
                </div>

                <div className="sm:col-span-2 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Notes
                  </span>
                  <p className="text-sm text-zinc-700 italic line-clamp-3 leading-relaxed">
                    &ldquo;{evaluation.notes}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

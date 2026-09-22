'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  Check,
  Send,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import ResumePreviewModal from '@/components/candidates/ResumePreviewModal';
import interviewInvitationService from '@/services/interviewInvitationService';
import { formatDate } from '@/utils/dateUtils';

export default function TechnicalEvaluationPortalPage({ params }) {
  const unwrappedParams = use(params);
  const token = unwrappedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);

  // Form State
  const [skillScores, setSkillScores] = useState({});
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  // Resume Viewer State
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // UI helpers
  const [rubricOpen, setRubricOpen] = useState(false);

  // Skill Score Labels for guidance - Clean, dignified, desaturated color styling
  const scoreDescriptions = {
    0: { label: 'No Knowledge', desc: 'No demonstrated capability or conceptual understanding', color: 'text-slate-600 bg-slate-100 border-slate-200' },
    1: { label: 'Novice', desc: 'Rudimentary understanding; needs constant supervision', color: 'text-rose-800 bg-rose-50 border-rose-200' },
    2: { label: 'Elementary', desc: 'Can handle routine tasks with guidance', color: 'text-amber-800 bg-amber-50 border-amber-200' },
    3: { label: 'Competent', desc: 'Solid working proficiency; autonomous on standard requirements', color: 'text-slate-800 bg-slate-100 border-slate-200' },
    4: { label: 'Proficient', desc: 'Strong architectural thinking, optimization, and clean practices', color: 'text-blue-800 bg-blue-50 border-blue-200' },
    5: { label: 'Expert', desc: 'Mastery level; systems design acumen and mentoring capability', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  };

  // Helper to normalize skills from comma-separated string
  const normalizeSkills = useCallback((skillsStr) => {
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
  }, []);

  // Fetch invitation & verification details
  const fetchInvitation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interviewInvitationService.getInvitationByToken(token);
      setInvitationData(data);

      // If already completed, set submittedResult
      if (data.status === 'COMPLETED' || data.completed_at) {
        setSubmittedResult({
          alreadyCompleted: true,
          candidate: data.candidate,
          job: data.job,
          interviewer_email: data.interviewer_email,
          overall_score: data.evaluation?.overall_score ?? data.evaluation?.score,
          jd_match_percentage: data.evaluation?.jd_match_percentage,
          notes: data.evaluation?.notes,
          skills: data.evaluation?.skills,
          completed_at: data.completed_at || data.evaluation?.submitted_at,
        });
      }
    } catch (err) {
      console.error('Failed to load interview invitation:', err);
      if (err.response?.status === 404) {
        setError('The interview evaluation link is invalid or does not exist.');
      } else {
        setError(
          err.response?.data?.message ||
            'Unable to load the evaluation portal. Please check your link or contact HR.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const candidate = invitationData?.candidate;
  const job = invitationData?.job || candidate?.job;
  const interviewerEmail = invitationData?.interviewer_email || candidate?.interviewer_email;
  const interviewerName = invitationData?.interviewer_name || 'Technical Interviewer';
  const resumeUrl = candidate?.resume_url;

  // Derive required skills list
  const requiredSkills = useMemo(() => {
    return normalizeSkills(job?.required_skills);
  }, [job?.required_skills, normalizeSkills]);

  // Live Calculations
  const evaluatedCount = Object.keys(skillScores).length;
  const allSkillsEvaluated =
    requiredSkills.length > 0 && evaluatedCount === requiredSkills.length;

  const totalScore = useMemo(() => {
    return Object.values(skillScores).reduce((sum, score) => sum + Number(score), 0);
  }, [skillScores]);

  const maxScore = requiredSkills.length * 5;

  const overallScore = useMemo(() => {
    if (requiredSkills.length === 0) return 0;
    return Math.round((totalScore / requiredSkills.length) * 100) / 100;
  }, [totalScore, requiredSkills.length]);

  const jdMatchPercentage = useMemo(() => {
    if (maxScore === 0) return 0;
    return Math.round((totalScore / maxScore) * 100);
  }, [totalScore, maxScore]);

  // Handle Skill Rating Change
  const handleScoreChange = (skillName, score) => {
    setSkillScores((prev) => ({
      ...prev,
      [skillName]: Number(score),
    }));
    if (formError) setFormError(null);
  };

  // Get Initials for Candidate Avatar
  const candidateInitials = useMemo(() => {
    if (!candidate?.name) return 'CD';
    return candidate.name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [candidate?.name]);

  // Handle Submit Evaluation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate that all required skills are scored
    const missing = requiredSkills.filter(
      (skill) => skillScores[skill] === undefined || skillScores[skill] === null
    );

    if (missing.length > 0) {
      setFormError(`Please provide a rating for all competencies. Missing: ${missing.join(', ')}`);
      return;
    }

    if (!notes || notes.trim().length < 5) {
      setFormError('Please enter substantive interview feedback notes (minimum 5 characters).');
      return;
    }

    setSubmitting(true);

    try {
      const skillsPayload = requiredSkills.map((skill) => ({
        skill,
        score: Number(skillScores[skill]),
      }));

      // Combine recommendation tag with notes if selected
      let finalNotes = notes.trim();
      if (recommendation) {
        const recLabel = {
          STRONG_HIRE: 'STRONG HIRE',
          HIRE: 'HIRE',
          BORDERLINE: 'BORDERLINE / SECOND OPINION RECOMMENDED',
          DO_NOT_HIRE: 'DO NOT HIRE',
        }[recommendation] || recommendation;

        if (!finalNotes.includes('[Recommendation:')) {
          finalNotes = `[Recommendation: ${recLabel}]\n\n${finalNotes}`;
        }
      }

      const result = await interviewInvitationService.submitEvaluationByToken(token, {
        notes: finalNotes,
        skills: skillsPayload,
      });

      setSubmittedResult({
        alreadyCompleted: false,
        candidate: result.candidate || candidate,
        job: result.job || job,
        interviewer_email: result.interviewer_email || interviewerEmail,
        overall_score: result.overall_score ?? result.score,
        jd_match_percentage: result.jd_match_percentage,
        notes: finalNotes,
        skills: skillsPayload,
        recommendation: recommendation,
        completed_at: new Date().toISOString(),
      });

      setToast({
        message: 'Technical assessment submitted successfully.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to submit evaluation:', err);
      const msg =
        err.response?.data?.message || err.message || 'Failed to submit evaluation. Please try again.';
      setFormError(msg);
      setToast({
        message: msg,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Resume Preview Lightbox Modal */}
      <ResumePreviewModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        resumeUrl={resumeUrl}
        candidate={candidate}
        job={job}
      />

      {/* Floating Resume Quick Trigger */}
      {resumeUrl && !loading && !error && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setIsResumeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-lg shadow-slate-900/10 border border-slate-300 transition-colors cursor-pointer"
            title="Open Candidate Resume Preview"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Candidate Resume</span>
          </button>
        </div>
      )}

      {/* Corporate Technical Portal Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-tight shrink-0">
              RF
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 tracking-tight">
                  RecruitFlow
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  Technical Assessment
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                Confidential Candidate Evaluation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {(interviewerName || interviewerEmail) && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 hidden sm:inline">Interviewer:</span>
                <span className="font-semibold text-slate-900">{interviewerName || interviewerEmail}</span>
              </div>
            )}

            {resumeUrl && (
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 transition-colors border border-slate-200 cursor-pointer"
                title="Preview candidate resume"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Preview Resume</span>
                <span className="sm:hidden">Resume</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Simple Minimal Loading State (No flashy icons) */}
        {loading && (
          <div className="py-28 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-500 tracking-wide">
              Loading evaluation session...
            </p>
          </div>
        )}

        {/* Error / Expired State */}
        {!loading && error && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto border border-slate-200">
              <AlertCircle className="w-6 h-6 text-slate-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Evaluation Session Inactive</h1>
            <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
              <p>Security Notice: Evaluation links are strictly single-use and time-bound.</p>
              <p>Please contact the HR recruitment team to issue an updated link.</p>
            </div>
          </div>
        )}

        {/* Success / Already Completed Screen */}
        {!loading && !error && submittedResult && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-xs space-y-7 max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center mx-auto border border-slate-200">
              <Check className="w-6 h-6 text-slate-800" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>
                  {submittedResult.alreadyCompleted
                    ? 'Evaluation Completed & Locked'
                    : 'Assessment Recorded'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {submittedResult.alreadyCompleted
                  ? 'Technical Evaluation Already Submitted'
                  : 'Technical Assessment Confirmed'}
              </h1>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you, <span className="font-semibold text-slate-900">{interviewerName || interviewerEmail || 'Interviewer'}</span>. Your evaluation for{' '}
                <span className="font-semibold text-slate-900">{candidate?.name}</span> has been securely recorded and synced with the HR dashboard.
              </p>
            </div>

            {/* Assessment Summary Snapshot Card */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Assessment Record
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  Completed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Candidate</span>
                  <span className="font-bold text-slate-900 text-sm">{candidate?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Target Position</span>
                  <span className="font-semibold text-slate-900">{job?.title}</span>
                </div>
                {submittedResult.overall_score !== undefined && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Overall Score</span>
                    <span className="font-bold text-slate-900 text-lg">
                      {Number(submittedResult.overall_score).toFixed(2)}
                      <span className="text-xs text-slate-400 font-normal"> / 5.0</span>
                    </span>
                  </div>
                )}
                {submittedResult.jd_match_percentage !== undefined && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">JD Match</span>
                    <span className="font-bold text-slate-900 text-lg">
                      {Math.round(Number(submittedResult.jd_match_percentage))}%
                    </span>
                  </div>
                )}
              </div>

              {/* Competencies Rated */}
              {submittedResult.skills && submittedResult.skills.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Competencies Evaluated ({submittedResult.skills.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {submittedResult.skills.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-800">{s.skill}</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {s.score} / 5
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interviewer Notes */}
              {submittedResult.notes && (
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Evaluation Comments
                  </span>
                  <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {submittedResult.notes}
                  </div>
                </div>
              )}

              {/* Resume Access on Completed Screen */}
              {resumeUrl && (
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">Candidate Resume:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResumeModalOpen(true)}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                    >
                      Preview Resume
                    </button>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                      title="Open link in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              This session is officially recorded and locked. For adjustments, please contact the recruitment coordinator.
            </p>
          </div>
        )}

        {/* Active Evaluation Form Screen */}
        {!loading && !error && !submittedResult && candidate && (
          <div className="space-y-6">
            {/* Candidate Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                {/* Avatar + Candidate Info */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0">
                    {candidateInitials}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {candidate.name}
                      </h1>
                      <Badge status={candidate.status || 'ACTIVE'}>
                        {candidate.status || 'Candidate'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-900">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        {job?.title || 'Position'}
                      </span>
                      {job?.department && (
                        <span className="text-slate-400">
                          • {job.department}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Candidate Resume Action Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between sm:justify-start gap-3 shrink-0">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900 block text-xs">Resume</span>
                    <span className="text-[11px] text-slate-500">
                      {resumeUrl ? 'Available' : 'Not attached'}
                    </span>
                  </div>

                  {resumeUrl ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsResumeModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                        title="Preview resume directly"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                        title="Open resume link in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Secondary Details */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a
                    href={`mailto:${candidate.email}`}
                    className="hover:text-slate-900 transition-colors truncate"
                  >
                    {candidate.email}
                  </a>
                </div>

                {candidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{candidate.phone}</span>
                  </div>
                )}

                {invitationData?.expires_at && (
                  <div className="flex items-center gap-1.5 text-slate-500 sm:justify-end">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Valid until {formatDate(invitationData.expires_at)}</span>
                  </div>
                )}
              </div>

              {/* Candidate's Declared Skills */}
              {candidate.skills && (
                <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs">
                  <span className="font-semibold text-slate-500 shrink-0 mt-0.5 text-[11px]">
                    Candidate Skills:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.split(',').map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Evaluation Rubric Guide */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setRubricOpen(!rubricOpen)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-900">
                    Scoring Rubric Reference (0 – 5 Scale)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <span>{rubricOpen ? 'Hide' : 'Show Guide'}</span>
                  {rubricOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {rubricOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500 mb-3">
                    Benchmark candidate competency against standard engineering performance levels:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {Object.entries(scoreDescriptions).map(([scoreVal, { label, desc, color }]) => (
                      <div
                        key={scoreVal}
                        className="bg-white p-3 rounded-lg border border-slate-200 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">
                            Score {scoreVal}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${color}`}>
                            {label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Validation Error Alert */}
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Incomplete Assessment</span>
                    <span>{formError}</span>
                  </div>
                </div>
              )}

              {/* Technical Competencies Assessment Grid */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      Technical Competencies
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Rate the candidate across each required role competency (0 to 5).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        allSkillsEvaluated
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {evaluatedCount} of {requiredSkills.length} Rated
                    </span>
                  </div>
                </div>

                {/* List of Competency Cards */}
                <div className="space-y-3.5">
                  {requiredSkills.map((skill, index) => {
                    const currentScore = skillScores[skill];
                    const isScored = currentScore !== undefined;
                    const descriptor = isScored ? scoreDescriptions[currentScore] : null;

                    return (
                      <div
                        key={index}
                        className={`border rounded-xl p-4 transition-all duration-150 ${
                          isScored
                            ? 'border-slate-300 bg-white'
                            : 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center border border-slate-200 shrink-0">
                              {index + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-900">
                              {skill}
                            </span>
                          </div>

                          {/* Feedback Tag */}
                          <div>
                            {isScored ? (
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded border ${descriptor?.color}`}
                              >
                                <span>Score {currentScore}</span>
                                <span>•</span>
                                <span>{descriptor?.label}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                Unrated
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive 0 to 5 Rating Buttons */}
                        <div className="grid grid-cols-6 gap-2">
                          {[0, 1, 2, 3, 4, 5].map((score) => {
                            const isSelected = currentScore === score;
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handleScoreChange(skill, score)}
                                className={`py-2.5 text-center rounded-lg text-sm font-bold transition-all duration-150 cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-900 text-white border border-slate-900 shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                                title={`Rate ${score}: ${scoreDescriptions[score].label}`}
                              >
                                <span>{score}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Description helper on selection */}
                        {isScored && (
                          <p className="text-[11px] text-slate-500 mt-2 italic">
                            {scoreDescriptions[currentScore].desc}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall Recommendation Selector */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-3.5">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Hiring Recommendation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select your overall technical assessment recommendation.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'STRONG_HIRE', label: 'Strong Hire', color: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
                    { id: 'HIRE', label: 'Hire', color: 'border-blue-600 bg-blue-50 text-blue-800' },
                    { id: 'BORDERLINE', label: 'Borderline', color: 'border-amber-600 bg-amber-50 text-amber-800' },
                    { id: 'DO_NOT_HIRE', label: 'Do Not Hire', color: 'border-rose-600 bg-rose-50 text-rose-800' },
                  ].map((rec) => {
                    const isSelected = recommendation === rec.id;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setRecommendation(isSelected ? null : rec.id)}
                        className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? `${rec.color} font-bold shadow-xs`
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {rec.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interview Comments */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Technical Feedback &amp; Observations
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {notes.length} characters
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Summarize candidate technical competencies, code quality, architectural depth, and any concerns.
                </p>

                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Demonstrates strong core principles. Clean code design during the practical interview. Architected modular components, though query optimization knowledge could be deepened..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all placeholder:text-slate-400 leading-relaxed bg-white text-slate-900"
                  required
                />
              </div>

              {/* Assessment Summary Metric Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Assessment Calculation
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Computed from competency scores
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Overall Score */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Overall Score
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-white">
                        {allSkillsEvaluated ? overallScore.toFixed(2) : '--'}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Benchmark: &ge; 3.50
                    </p>
                  </div>

                  {/* JD Match Percentage */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Role Match
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-white">
                        {allSkillsEvaluated ? `${jdMatchPercentage}%` : '--%'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {allSkillsEvaluated
                        ? jdMatchPercentage >= 70
                          ? 'Satisfies role competencies'
                          : 'Partial competency match'
                        : 'Rate all competencies to calculate'}
                    </p>
                  </div>

                  {/* Rating Progress */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Progress
                    </span>
                    <div className="text-xs font-semibold text-slate-300">
                      {evaluatedCount} of {requiredSkills.length} Rated
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-300 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            requiredSkills.length > 0
                              ? (evaluatedCount / requiredSkills.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submission Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={submitting}
                  disabled={!allSkillsEvaluated}
                  className="w-full sm:w-auto min-w-[220px] bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-xl"
                >
                  <Send className="w-4 h-4 mr-2 inline" />
                  <span>Submit Evaluation</span>
                </Button>

                {!allSkillsEvaluated ? (
                  <p className="text-xs text-slate-500 font-medium text-center sm:text-right">
                    Please score all {requiredSkills.length} competencies above to complete the assessment.
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-700" />
                    All competencies scored. Ready for submission.
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Corporate Footer */}
      <footer className="border-t border-slate-200 py-5 text-center text-[11px] text-slate-400 bg-white">
        RecruitFlow • Confidential Technical Assessment Portal
      </footer>
    </div>
  );
}

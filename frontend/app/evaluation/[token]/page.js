'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  User,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  Building2,
  Star,
  Check,
  Send,
  Award,
  MessageSquare,
  ShieldCheck,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Calendar,
  Layers,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import ResumePreviewModal from '@/components/candidates/ResumePreviewModal';
import interviewInvitationService from '@/services/interviewInvitationService';
import { formatDate } from '@/utils/dateUtils';

export default function TechLeadEvaluationPortalPage({ params }) {
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
  const [rubricOpen, setRubricOpen] = useState(true);

  // Skill Score Labels for guidance
  const scoreDescriptions = {
    0: { label: 'No Knowledge', desc: 'No demonstrated capability or conceptual understanding', color: 'text-zinc-600 bg-zinc-100 border-zinc-200' },
    1: { label: 'Novice', desc: 'Rudimentary understanding; needs constant handholding', color: 'text-rose-700 bg-rose-50 border-rose-200' },
    2: { label: 'Elementary', desc: 'Can handle basic routine tasks with supervision', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    3: { label: 'Competent', desc: 'Solid working proficiency; autonomous on standard requirements', color: 'text-sky-700 bg-sky-50 border-sky-200' },
    4: { label: 'Proficient', desc: 'Strong architectural thinking, optimization, and clean practices', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    5: { label: 'Expert', desc: 'Mastery level; systems design acumen and mentoring capability', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
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
          tech_lead: data.tech_lead,
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
  const techLead = invitationData?.tech_lead;
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
      setFormError(`Please provide a score for all competencies. Missing: ${missing.join(', ')}`);
      return;
    }

    if (!notes || notes.trim().length < 5) {
      setFormError('Please provide detailed interview comments/notes (at least 5 characters).');
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
        tech_lead: result.tech_lead || techLead,
        overall_score: result.overall_score ?? result.score,
        jd_match_percentage: result.jd_match_percentage,
        notes: finalNotes,
        skills: skillsPayload,
        recommendation: recommendation,
        completed_at: new Date().toISOString(),
      });

      setToast({
        message: 'Technical evaluation submitted successfully! Thank you.',
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
    <div className="min-h-screen bg-slate-50/60 text-zinc-900 flex flex-col font-sans antialiased selection:bg-zinc-900 selection:text-white">
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

      {/* Floating Resume Quick Trigger (Visible when scrolling if candidate has resume) */}
      {resumeUrl && !loading && !error && (
        <div className="fixed bottom-6 right-6 z-40 animate-bounce-subtle">
          <button
            type="button"
            onClick={() => setIsResumeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xl shadow-zinc-900/20 hover:scale-105 transition-all cursor-pointer border border-zinc-700"
            title="Open Candidate Resume Preview"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>View Resume</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Standalone Tech Lead Portal Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-zinc-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-white/10 shrink-0">
              RF
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-zinc-950">
                  RecruitFlow
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold border border-zinc-200">
                  Technical Portal
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate hidden sm:block">
                Confidential Technical Interview &amp; Competency Assessment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {techLead && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-500 hidden sm:inline">Interviewer:</span>
                <span className="font-bold text-zinc-900">{techLead.name}</span>
              </div>
            )}

            {resumeUrl && (
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors border border-zinc-200 cursor-pointer"
                title="Preview candidate resume in modal"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-600" />
                <span className="hidden md:inline">Preview Resume</span>
                <span className="md:hidden">Resume</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 h-48" />
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 h-80" />
          </div>
        )}

        {/* Error / Expired State */}
        {!loading && error && (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-zinc-950">Evaluation Link Inactive</h1>
            <p className="text-sm text-zinc-600 leading-relaxed">{error}</p>
            <div className="pt-4 border-t border-zinc-100 text-xs text-zinc-400 space-y-1">
              <p>Security Notice: Evaluation links are strictly single-use and time-bound.</p>
              <p>Please contact your HR Talent Acquisition partner to issue an updated token.</p>
            </div>
          </div>
        )}

        {/* Success / Already Completed Screen */}
        {!loading && !error && submittedResult && (
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 max-w-2xl mx-auto text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 mb-1">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {submittedResult.alreadyCompleted
                    ? 'Evaluation Completed & Locked'
                    : 'Assessment Confirmed & Submitted'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                {submittedResult.alreadyCompleted
                  ? 'Technical Evaluation Already Submitted'
                  : 'Technical Assessment Recorded'}
              </h1>
              <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
                Thank you, <span className="font-semibold text-zinc-900">{techLead?.name || 'Tech Lead'}</span>. Your evaluation for{' '}
                <span className="font-semibold text-zinc-900">{candidate?.name}</span> has been securely saved and synchronized with the HR recruitment dashboard.
              </p>
            </div>

            {/* Assessment Summary Snapshot Card */}
            <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-6 text-left space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Official Assessment Record
                </span>
                <Badge status="COMPLETED">Completed</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">Candidate</span>
                  <span className="font-bold text-zinc-900 text-base">{candidate?.name}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">Target Position</span>
                  <span className="font-bold text-zinc-900">{job?.title}</span>
                </div>
                {submittedResult.overall_score !== undefined && (
                  <div className="bg-white p-3 rounded-xl border border-zinc-200">
                    <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">Overall Score</span>
                    <span className="font-extrabold text-zinc-950 text-xl">
                      {Number(submittedResult.overall_score).toFixed(2)}
                      <span className="text-xs text-zinc-400 font-normal"> / 5.0</span>
                    </span>
                  </div>
                )}
                {submittedResult.jd_match_percentage !== undefined && (
                  <div className="bg-white p-3 rounded-xl border border-zinc-200">
                    <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">JD Match</span>
                    <span className="font-extrabold text-emerald-600 text-xl">
                      {Math.round(Number(submittedResult.jd_match_percentage))}%
                    </span>
                  </div>
                )}
              </div>

              {/* Competencies Rated */}
              {submittedResult.skills && submittedResult.skills.length > 0 && (
                <div className="pt-3 border-t border-zinc-200/60 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Competencies Evaluated ({submittedResult.skills.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {submittedResult.skills.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-zinc-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-zinc-800">{s.skill}</span>
                        <span className="font-extrabold text-zinc-950 bg-zinc-100 px-2.5 py-0.5 rounded-lg border border-zinc-200">
                          {s.score} / 5
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interviewer Notes */}
              {submittedResult.notes && (
                <div className="pt-3 border-t border-zinc-200/60 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Evaluation Comments &amp; Notes
                  </span>
                  <div className="text-xs text-zinc-800 bg-white p-3.5 rounded-xl border border-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {submittedResult.notes}
                  </div>
                </div>
              )}

              {/* Persistent Resume Access on Completed Screen */}
              {resumeUrl && (
                <div className="pt-3 border-t border-zinc-200/60 flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-500">Candidate Resume Attachment:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResumeModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Preview Resume</span>
                    </button>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open File</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400">
              Session is locked. For modifications or reassessment requests, please contact the Talent Acquisition lead.
            </p>
          </div>
        )}

        {/* Active Evaluation Form Screen */}
        {!loading && !error && !submittedResult && candidate && (
          <div className="space-y-8 animate-fade-in">
            {/* Candidate Hero Card with Resume Feature */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 relative overflow-hidden">
              {/* Subtle top decorative accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-zinc-900 via-indigo-600 to-zinc-900" />

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Avatar + Candidate Info */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 text-white font-black text-xl flex items-center justify-center shadow-md ring-4 ring-zinc-100 shrink-0">
                    {candidateInitials}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                        {candidate.name}
                      </h1>
                      <Badge status={candidate.status || 'ACTIVE'}>
                        {candidate.status || 'Active Candidate'}
                      </Badge>
                    </div>

                    <p className="text-sm text-zinc-600 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-zinc-900">
                        <Briefcase className="w-4 h-4 text-zinc-500" />
                        {job?.title || 'General Requisition'}
                      </span>
                      {job?.department && (
                        <span className="text-zinc-400">
                          • {job.department}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Candidate Resume Action Box */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-zinc-600 pr-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <div>
                      <span className="font-bold text-zinc-900 block">Candidate Resume</span>
                      <span className="text-[11px] text-zinc-400">
                        {resumeUrl ? 'Available for review' : 'Not provided'}
                      </span>
                    </div>
                  </div>

                  {resumeUrl ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsResumeModalOpen(true)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white shadow-xs transition-all cursor-pointer"
                        title="Preview resume directly in modal viewer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-300" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors"
                        title="Open resume in a new tab"
                      >
                        <ExternalLink className="w-4 h-4 text-zinc-500" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400 italic px-2 py-1 bg-zinc-100 rounded-lg">
                      No resume URL on file
                    </span>
                  )}
                </div>
              </div>

              {/* Secondary Details & Candidate Profile Skills */}
              <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-600">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                  <a
                    href={`mailto:${candidate.email}`}
                    className="hover:text-zinc-900 transition-colors truncate"
                  >
                    {candidate.email}
                  </a>
                </div>

                {candidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="font-mono">{candidate.phone}</span>
                  </div>
                )}

                {invitationData?.expires_at && (
                  <div className="flex items-center gap-2 text-zinc-500 sm:justify-end">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Valid until {formatDate(invitationData.expires_at)}</span>
                  </div>
                )}
              </div>

              {/* Candidate's Declared Skills (if any exist) */}
              {candidate.skills && (
                <div className="pt-3 border-t border-zinc-100 flex items-start gap-2 text-xs">
                  <span className="font-bold text-zinc-500 shrink-0 mt-0.5">
                    Profile Skills:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.split(',').map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium text-[11px] border border-zinc-200/80"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Evaluation Rubric & Guidelines */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setRubricOpen(!rubricOpen)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-50/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-sm text-zinc-950">
                    Interviewer Scoring Rubric &amp; Evaluation Guide
                  </span>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    (Standard 0 - 5 Scale)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <span>{rubricOpen ? 'Hide Rubric' : 'Show Rubric'}</span>
                  {rubricOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {rubricOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-zinc-100 bg-zinc-50/40">
                  <p className="text-xs text-zinc-500 mb-4">
                    Score each required competency based on the candidate&apos;s live code performance, system design reasoning, and theoretical depth:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(scoreDescriptions).map(([scoreVal, { label, desc, color }]) => (
                      <div
                        key={scoreVal}
                        className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-zinc-950">
                            Level {scoreVal}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${color}`}>
                            {label}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-snug">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Form Validation Error Alert */}
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 text-sm animate-shake">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Evaluation Action Required</div>
                    <div className="text-xs text-rose-700 mt-0.5">{formError}</div>
                  </div>
                </div>
              )}

              {/* Technical Competencies Assessment Grid */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-100">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-zinc-700" />
                      Required Technical Competencies
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Extracted from the job requisition requirements. Every competency must be assigned a rating.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xl border transition-colors ${
                        allSkillsEvaluated
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {evaluatedCount} of {requiredSkills.length} Rated
                    </span>
                  </div>
                </div>

                {/* List of Competency Cards */}
                <div className="space-y-4">
                  {requiredSkills.map((skill, index) => {
                    const currentScore = skillScores[skill];
                    const isScored = currentScore !== undefined;
                    const descriptor = isScored ? scoreDescriptions[currentScore] : null;

                    return (
                      <div
                        key={index}
                        className={`border rounded-2xl p-5 transition-all duration-200 ${
                          isScored
                            ? 'border-zinc-300 bg-white shadow-2xs ring-1 ring-zinc-900/5'
                            : 'border-zinc-200/80 bg-zinc-50/40 hover:bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold flex items-center justify-center border border-zinc-200">
                              {index + 1}
                            </span>
                            <div>
                              <span className="font-extrabold text-base text-zinc-950">
                                {skill}
                              </span>
                            </div>
                          </div>

                          {/* Dynamic Feedback Tag */}
                          <div>
                            {isScored ? (
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl border ${descriptor?.color}`}
                              >
                                <span>Score {currentScore}</span>
                                <span>•</span>
                                <span>{descriptor?.label}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-lg">
                                Pending rating
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive 0 to 5 Rating Buttons */}
                        <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                          {[0, 1, 2, 3, 4, 5].map((score) => {
                            const isSelected = currentScore === score;
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handleScoreChange(skill, score)}
                                className={`py-3 px-1 text-center rounded-xl font-extrabold text-sm sm:text-base transition-all duration-150 cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-950 text-white shadow-md ring-2 ring-zinc-950 ring-offset-2 scale-[1.02]'
                                    : 'bg-white border border-zinc-200/90 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-950'
                                }`}
                                title={`Rate ${score} - ${scoreDescriptions[score].label}: ${scoreDescriptions[score].desc}`}
                              >
                                <span>{score}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Score helper on selection */}
                        {isScored && (
                          <p className="text-[11px] text-zinc-500 mt-2.5 italic">
                            {scoreDescriptions[currentScore].desc}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall Recommendation Selector */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                    <Award className="w-5 h-5 text-zinc-700" />
                    Overall Hiring Recommendation
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Select your bottom-line technical verdict for this candidate.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'STRONG_HIRE', label: 'Strong Hire', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                    { id: 'HIRE', label: 'Hire', color: 'border-blue-500 bg-blue-50 text-blue-800' },
                    { id: 'BORDERLINE', label: 'Borderline', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                    { id: 'DO_NOT_HIRE', label: 'Do Not Hire', color: 'border-rose-500 bg-rose-50 text-rose-800' },
                  ].map((rec) => {
                    const isSelected = recommendation === rec.id;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setRecommendation(isSelected ? null : rec.id)}
                        className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? `${rec.color} ring-2 ring-offset-2 ring-zinc-900 shadow-xs font-black`
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
                        }`}
                      >
                        {rec.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interview Comments & Qualitative Notes */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-zinc-700" />
                    <h3 className="text-base font-bold text-zinc-950">
                      Technical Feedback &amp; Observations
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {notes.length} characters
                  </span>
                </div>

                <p className="text-xs text-zinc-500">
                  Summarize key architectural strengths, live coding clarity, algorithmic problem-solving, and any red flags or areas of improvement.
                </p>

                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Demonstrates deep understanding of React concurrent features and Node.js microservices. Clean code during the live coding exercise. Architecture was modular, though database indexing knowledge could be strengthened..."
                  className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all placeholder:text-zinc-400 leading-relaxed bg-zinc-50/30 focus:bg-white"
                  required
                />
              </div>

              {/* Live Score Summary & Real-Time Analytics Gauge */}
              <div className="bg-zinc-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                      Live Assessment Calculation
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Calculated in real-time from competency scores
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Overall Score */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                      Overall Score
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {allSkillsEvaluated ? overallScore.toFixed(2) : '--'}
                      </span>
                      <span className="text-sm font-semibold text-zinc-500">/ 5.0</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Target benchmark: ≥ 3.50
                    </p>
                  </div>

                  {/* JD Match Percentage */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                      Requisition Match
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                        {allSkillsEvaluated ? `${jdMatchPercentage}%` : '--%'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {allSkillsEvaluated
                        ? jdMatchPercentage >= 70
                          ? 'Strong technical alignment'
                          : 'Moderate technical alignment'
                        : 'Rates all skills to unlock'}
                    </p>
                  </div>

                  {/* Rating Progress */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                      Evaluation Progress
                    </span>
                    <div className="text-sm font-extrabold text-zinc-200">
                      {evaluatedCount} / {requiredSkills.length} Competencies Rated
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="w-full sm:w-auto">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={submitting}
                    disabled={!allSkillsEvaluated}
                    className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Technical Assessment</span>
                  </Button>
                </div>

                {!allSkillsEvaluated ? (
                  <p className="text-xs text-amber-600 font-semibold text-center sm:text-right">
                    * Score all {requiredSkills.length} competencies above to submit evaluation.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    All competencies scored. Ready for submission.
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400 bg-white">
        RecruitFlow • Confidential Technical Interview Assessment Portal
      </footer>
    </div>
  );
}

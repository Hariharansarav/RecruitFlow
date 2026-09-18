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
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
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
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  // Skill Score Labels for guidance
  const scoreDescriptions = {
    0: '0 - No demonstrated knowledge',
    1: '1 - Beginner / Rudimentary',
    2: '2 - Elementary / Limited',
    3: '3 - Intermediate / Competent',
    4: '4 - Advanced / Proficient',
    5: '5 - Expert / Master',
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

  // Handle Submit Evaluation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate that all required skills are scored
    const missing = requiredSkills.filter(
      (skill) => skillScores[skill] === undefined || skillScores[skill] === null
    );

    if (missing.length > 0) {
      setFormError(`Please provide a score for all skills. Missing: ${missing.join(', ')}`);
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

      const result = await interviewInvitationService.submitEvaluationByToken(token, {
        notes: notes.trim(),
        skills: skillsPayload,
      });

      setSubmittedResult({
        alreadyCompleted: false,
        candidate: result.candidate || candidate,
        job: result.job || job,
        tech_lead: result.tech_lead || techLead,
        overall_score: result.overall_score ?? result.score,
        jd_match_percentage: result.jd_match_percentage,
        notes: notes.trim(),
        skills: skillsPayload,
        completed_at: new Date().toISOString(),
      });

      setToast({
        message: 'Evaluation submitted successfully! Thank you.',
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
    <div className="min-h-screen bg-zinc-50/80 text-zinc-900 flex flex-col font-sans antialiased">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Standalone Tech Lead Portal Header (Independent from Admin Dashboard) */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              RF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-zinc-950">
                  RecruitFlow
                </span>
                <span className="text-2xs uppercase tracking-widest px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-semibold border border-zinc-200">
                  Tech Lead Portal
                </span>
              </div>
              <p className="text-2xs text-zinc-400">
                External Technical Interview Assessment
              </p>
            </div>
          </div>

          {techLead && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-500 hidden sm:inline">Interviewer:</span>
              <span className="font-bold text-zinc-900">{techLead.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Loading State */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 h-48" />
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 h-80" />
          </div>
        )}

        {/* Error / Invalid Token State */}
        {!loading && error && (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-zinc-950">Link Invalid or Expired</h1>
            <p className="text-sm text-zinc-600 leading-relaxed">{error}</p>
            <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-100">
              Please contact the recruitment coordinator or HR team to request a newly generated evaluation link.
            </p>
          </div>
        )}

        {/* Success / Already Completed Screen */}
        {!loading && !error && submittedResult && (
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-8 sm:p-12 shadow-xs space-y-8 max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 mb-2">
                <Lock className="w-3 h-3" />
                <span>{submittedResult.alreadyCompleted ? 'Evaluation Completed & Locked' : 'Submission Confirmed'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                {submittedResult.alreadyCompleted
                  ? 'Technical Evaluation Already Submitted'
                  : 'Evaluation Submitted Successfully'}
              </h1>
              <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
                Thank you, <span className="font-semibold text-zinc-900">{techLead?.name || 'Tech Lead'}</span>. Your technical assessment for{' '}
                <span className="font-semibold text-zinc-900">{candidate?.name}</span> has been securely recorded and locked.
              </p>
            </div>

            {/* Assessment Summary Snapshot */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Assessment Summary
                </span>
                <Badge status="COMPLETED">Completed</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-zinc-400 block">Candidate</span>
                  <span className="font-bold text-zinc-900">{candidate?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block">Role</span>
                  <span className="font-bold text-zinc-900">{job?.title}</span>
                </div>
                {submittedResult.overall_score !== undefined && (
                  <div>
                    <span className="text-xs text-zinc-400 block">Overall Score</span>
                    <span className="font-extrabold text-zinc-950 text-lg">
                      {Number(submittedResult.overall_score).toFixed(2)} / 5
                    </span>
                  </div>
                )}
                {submittedResult.jd_match_percentage !== undefined && (
                  <div>
                    <span className="text-xs text-zinc-400 block">JD Match</span>
                    <span className="font-extrabold text-blue-600 text-lg">
                      {Math.round(Number(submittedResult.jd_match_percentage))}%
                    </span>
                  </div>
                )}
              </div>

              {/* Skills rated */}
              {submittedResult.skills && submittedResult.skills.length > 0 && (
                <div className="pt-3 border-t border-zinc-200/60 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Competencies Rated
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {submittedResult.skills.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-zinc-800">{s.skill}</span>
                        <span className="font-extrabold text-black bg-zinc-100 px-2 py-0.5 rounded-md">
                          {s.score} / 5
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {submittedResult.notes && (
                <div className="pt-3 border-t border-zinc-200/60">
                  <span className="text-xs text-zinc-400 block mb-1">Feedback & Observations</span>
                  <p className="text-xs text-zinc-700 italic bg-white p-3 rounded-xl border border-zinc-200">
                    &ldquo;{submittedResult.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400">
              This evaluation is final. Further modifications are locked unless requested by the HR administrator.
            </p>
          </div>
        )}

        {/* Active Evaluation Form Screen */}
        {!loading && !error && !submittedResult && candidate && (
          <div className="space-y-8">
            {/* Candidate & Role Overview Banner */}
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                      {candidate.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Technical Assessment
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-zinc-400" />
                    Role:{' '}
                    <span className="font-bold text-zinc-950">{job?.title || 'General'}</span>
                    {job?.department && (
                      <span className="text-zinc-400">
                        • {job.department}
                      </span>
                    )}
                  </p>
                </div>

                {candidate.resume_url && (
                  <a
                    href={candidate.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors border border-zinc-200 shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-zinc-600" />
                    <span>View Candidate Resume</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                )}
              </div>

              {/* Contact info strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <span className="truncate">{candidate.email}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
                {invitationData?.expires_at && (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Evaluation valid until {formatDate(invitationData.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Evaluation Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Form Error Banner */}
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Evaluation Incomplete</div>
                    <div className="text-xs text-rose-700 mt-0.5">{formError}</div>
                  </div>
                </div>
              )}

              {/* Skills Rating Section */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950">
                      Technical Competencies Evaluation
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Rate the candidate on each required skill extracted from the job description (0 to 5 scale).
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {evaluatedCount} of {requiredSkills.length} Rated
                  </span>
                </div>

                {/* Skill Rating Cards */}
                <div className="space-y-4">
                  {requiredSkills.map((skill, index) => {
                    const currentScore = skillScores[skill];
                    const isScored = currentScore !== undefined;

                    return (
                      <div
                        key={index}
                        className={`border rounded-2xl p-5 transition-all ${
                          isScored
                            ? 'border-zinc-300 bg-white shadow-xs'
                            : 'border-zinc-200/80 bg-zinc-50/50 hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="font-bold text-base text-zinc-950">
                              {skill}
                            </span>
                          </div>

                          {isScored && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                              {scoreDescriptions[currentScore]}
                            </span>
                          )}
                        </div>

                        {/* 0 to 5 Rating Button Group */}
                        <div className="grid grid-cols-6 gap-2">
                          {[0, 1, 2, 3, 4, 5].map((score) => {
                            const isSelected = currentScore === score;
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handleScoreChange(skill, score)}
                                className={`py-2.5 px-1 text-center rounded-xl font-bold text-sm sm:text-base transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-950 text-white shadow-sm ring-2 ring-zinc-950 ring-offset-2'
                                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                                }`}
                              >
                                {score}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Score Summary Card */}
              <div className="bg-zinc-950 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                      Live Score Calculation
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-400">
                    Auto-calculated from skill scores
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">
                      Overall Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white">
                        {allSkillsEvaluated ? overallScore.toFixed(2) : '--'}
                      </span>
                      <span className="text-sm font-semibold text-zinc-500">/ 5.0</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">
                      JD Match Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                        {allSkillsEvaluated ? `${jdMatchPercentage}%` : '--%'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">
                      Progress
                    </span>
                    <div className="text-sm font-bold text-zinc-300 mt-2">
                      {evaluatedCount} / {requiredSkills.length} Skills
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
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

              {/* Interview Feedback & Notes */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <MessageSquare className="w-5 h-5 text-zinc-700" />
                  <h3 className="text-base font-bold text-zinc-950">
                    Interviewer Comments &amp; Observations
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  Provide qualitative notes regarding the candidate&apos;s problem-solving, architectural thinking, strengths, and areas for improvement.
                </p>

                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Strong understanding of backend architecture and microservices. Clean code practices demonstrated during the live exercise..."
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all placeholder:text-zinc-400"
                  required
                />
              </div>

              {/* Submission Action */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={submitting}
                  disabled={!allSkillsEvaluated}
                  className="w-full sm:w-auto min-w-[220px] flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Technical Evaluation</span>
                </Button>
                {!allSkillsEvaluated && (
                  <p className="text-xs text-amber-600 mt-2">
                    * Please score all {requiredSkills.length} competencies above before submitting.
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

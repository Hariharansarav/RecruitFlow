'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Search,
  X,
  ArrowRight,
  User,
  AlertCircle,
  Calendar,
  FileText,
  ExternalLink,
  Briefcase,
  UserCheck,
  Filter,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  Star,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EvaluationDetailModal from '@/components/evaluations/EvaluationDetailModal';
import interviewEvaluationService from '@/services/interviewEvaluationService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function HrEvaluationsPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'TOP_PERFORMER' | 'HIGH_MATCH' | 'NEEDS_REVIEW' | 'HAS_RESUME'
  const [jobFilter, setJobFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'SCORE_DESC' | 'SCORE_ASC' | 'MATCH_DESC'

  // Modal inspection state
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  const fetchEvaluations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await interviewEvaluationService.getEvaluations();
      setEvaluations(data || []);
    } catch (err) {
      console.error('Failed to load interview evaluations:', err);
      setError('Unable to load evaluations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (currentUser.role !== 'HR') {
      router.replace('/company/dashboard');
      return;
    }
    fetchEvaluations();
  }, [router, fetchEvaluations]);

  // Derive unique job requisitions for dropdown filter
  const uniqueJobs = useMemo(() => {
    const jobsMap = new Map();
    evaluations.forEach((ev) => {
      if (ev.job?.id) {
        jobsMap.set(ev.job.id, ev.job.title);
      }
    });
    return Array.from(jobsMap.entries()).map(([id, title]) => ({ id, title }));
  }, [evaluations]);

  // Executive KPI summary calculations
  const stats = useMemo(() => {
    const total = evaluations.length;
    if (total === 0) {
      return { total: 0, avgScore: 0, highMatch: 0, topRated: 0, withResume: 0 };
    }

    const totalScore = evaluations.reduce(
      (sum, ev) => sum + (Number(ev.overall_score ?? ev.score) || 0),
      0
    );
    const avgScore = (totalScore / total).toFixed(2);
    const highMatch = evaluations.filter((ev) => {
      const s = Number(ev.overall_score ?? ev.score) || 0;
      const m =
        ev.jd_match_percentage != null
          ? Number(ev.jd_match_percentage)
          : s > 0
          ? (s / 5) * 100
          : 0;
      return m >= 75;
    }).length;
    const topRated = evaluations.filter(
      (ev) => (Number(ev.overall_score ?? ev.score) || 0) >= 4.0
    ).length;
    const withResume = evaluations.filter(
      (ev) => Boolean(ev.candidate?.resume_url)
    ).length;

    return { total, avgScore, highMatch, topRated, withResume };
  }, [evaluations]);

  // Filter & sort evaluations
  const processedEvaluations = useMemo(() => {
    let list = evaluations.filter((ev) => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const candName = ev.candidate?.name?.toLowerCase() || '';
        const candEmail = ev.candidate?.email?.toLowerCase() || '';
        const jobTitle = ev.job?.title?.toLowerCase() || '';
        const interviewerEmail = ev.interviewer_email?.toLowerCase() || '';
        const hrName = ev.hr?.name?.toLowerCase() || '';
        const notes = ev.notes?.toLowerCase() || '';
        const skillsStr = (ev.skills || []).map((s) => s.skill.toLowerCase()).join(' ');

        const match =
          candName.includes(q) ||
          candEmail.includes(q) ||
          jobTitle.includes(q) ||
          interviewerEmail.includes(q) ||
          hrName.includes(q) ||
          notes.includes(q) ||
          skillsStr.includes(q);

        if (!match) return false;
      }

      // 2. Job Requisition Filter
      if (jobFilter !== 'ALL') {
        if (String(ev.job?.id) !== String(jobFilter)) {
          return false;
        }
      }

      // 3. Quick Filter Tabs
      const score = Number(ev.overall_score ?? ev.score) || 0;
      const matchPct =
        ev.jd_match_percentage != null
          ? Number(ev.jd_match_percentage)
          : score > 0
          ? Math.round((score / 5) * 100)
          : 0;

      if (filterType === 'TOP_PERFORMER' && score < 4.0) return false;
      if (filterType === 'HIGH_MATCH' && matchPct < 75) return false;
      if (filterType === 'NEEDS_REVIEW' && score >= 3.0) return false;
      if (filterType === 'HAS_RESUME' && !ev.candidate?.resume_url) return false;

      return true;
    });

    // Sort order
    list.sort((a, b) => {
      const scoreA = Number(a.overall_score ?? a.score) || 0;
      const scoreB = Number(b.overall_score ?? b.score) || 0;
      const matchA =
        a.jd_match_percentage != null
          ? Number(a.jd_match_percentage)
          : scoreA > 0
          ? (scoreA / 5) * 100
          : 0;
      const matchB =
        b.jd_match_percentage != null
          ? Number(b.jd_match_percentage)
          : scoreB > 0
          ? (scoreB / 5) * 100
          : 0;

      switch (sortBy) {
        case 'SCORE_DESC':
          return scoreB - scoreA;
        case 'SCORE_ASC':
          return scoreA - scoreB;
        case 'MATCH_DESC':
          return matchB - matchA;
        case 'NEWEST':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

    return list;
  }, [evaluations, searchTerm, jobFilter, filterType, sortBy]);

  // Color helper for scores
  const getScoreBadgeStyle = (score) => {
    if (score >= 4.0) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (score >= 3.0) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getMatchScoreBadge = (pct) => {
    if (pct >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (pct >= 60) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Detail Scorecard Modal */}
      <EvaluationDetailModal
        isOpen={Boolean(selectedEvaluation)}
        evaluation={selectedEvaluation}
        onClose={() => setSelectedEvaluation(null)}
      />

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Interview Evaluations
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Review completed competency scores, JD match ratings, and candidate resumes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEvaluations(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5"
            title="Refresh evaluations"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/hr/candidates">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5">
              <span>View Candidates</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Evaluated */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Evaluations
            </p>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tracking-tight">
              {stats.total}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Completed interviews</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Avg Overall Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Avg Score
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                {stats.avgScore}
              </h3>
              <span className="text-xs font-bold text-slate-400">/ 5.0</span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">Candidate average</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* High JD Match */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              High Match (≥75%)
            </p>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tracking-tight">
              {stats.highMatch}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Strong skill alignment</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Top Rated (≥4.0)
            </p>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tracking-tight">
              {stats.topRated}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Prime hiring candidates</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Interactive Filtering Suite */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by candidate name, email, job, skills, or interviewer notes..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Requisition & Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
            >
              <option value="ALL">All Requisitions ({uniqueJobs.length})</option>
              {uniqueJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
            >
              <option value="NEWEST">Sort: Newest First</option>
              <option value="SCORE_DESC">Sort: Score (Highest)</option>
              <option value="SCORE_ASC">Sort: Score (Lowest)</option>
              <option value="MATCH_DESC">Sort: Match (Highest)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 border-t border-slate-100">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Evaluations ({evaluations.length})
          </button>
          <button
            onClick={() => setFilterType('TOP_PERFORMER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              filterType === 'TOP_PERFORMER'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Top Rated ({stats.topRated})
          </button>
          <button
            onClick={() => setFilterType('HIGH_MATCH')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              filterType === 'HIGH_MATCH'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            High Match ({stats.highMatch})
          </button>
          <button
            onClick={() => setFilterType('HAS_RESUME')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              filterType === 'HAS_RESUME'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Has Resume ({stats.withResume})
          </button>
        </div>
      </div>

      {/* 4. Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-lg mx-auto shadow-xs">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-900 mb-1">{error}</h2>
          <Button variant="primary" size="sm" onClick={() => fetchEvaluations(true)} className="mt-3">
            Retry
          </Button>
        </div>
      )}

      {/* 5. Simple Loading State */}
      {loading && !error && (
        <div className="py-20 text-center">
          <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading candidate evaluations...</p>
        </div>
      )}

      {/* 6. Evaluation Cards List */}
      {!loading && !error && (
        <>
          {processedEvaluations.length > 0 ? (
            <div className="space-y-4">
              {processedEvaluations.map((item) => {
                const scoreNum = Number(item.overall_score ?? item.score) || 0;
                const matchNum =
                  item.jd_match_percentage != null
                    ? Number(item.jd_match_percentage)
                    : scoreNum > 0
                    ? Math.round((scoreNum / 5) * 100)
                    : 0;
                const candidate = item.candidate;
                const job = item.job;
                const skills = item.skills || [];
                const resumeUrl = candidate?.resume_url;
                const evaluatorName =
                  item.interviewer_email || item.hr?.name || 'Technical Interviewer';
                const initials = candidate?.name
                  ? candidate.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'C';

                return (
                  <div
                    key={item.id}
                    className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.08)] hover:border-slate-300 transition-all duration-300 space-y-4"
                  >
                    {/* Top Row: Candidate details, Job requisition, and Score indicators */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Identity & Requisition */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2.5">
                            <Link
                              href={`/hr/candidates/${item.candidate_id}`}
                              className="font-bold text-lg text-slate-900 hover:text-blue-600 transition-colors truncate"
                              title={candidate?.name}
                            >
                              {candidate?.name || `Candidate #${item.candidate_id}`}
                            </Link>
                            <Badge status={candidate?.status || 'EVALUATED'}>
                              {candidate?.status || 'Evaluated'}
                            </Badge>
                          </div>

                          {/* Contact details */}
                          <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap font-medium">
                            <span className="truncate">{candidate?.email}</span>
                            {candidate?.phone && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-slate-500">{candidate?.phone}</span>
                              </>
                            )}
                          </div>

                          {/* Job Requisition & Evaluator Tags */}
                          <div className="flex items-center gap-3 text-xs pt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800 border border-slate-200/60">
                              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                              <span>{job?.title || 'General Requisition'}</span>
                              {job?.department && (
                                <span className="text-slate-500 font-normal">({job.department})</span>
                              )}
                            </span>

                            <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Interviewer: <strong className="text-slate-900">{evaluatorName}</strong></span>
                            </span>

                            {item.created_at && (
                              <span className="inline-flex items-center gap-1 text-slate-500 font-normal">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(item.created_at)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Score and Match Badges */}
                      <div className="flex items-center gap-2.5 flex-shrink-0 self-start">
                        {/* JD Match Badge */}
                        <div className={`px-3.5 py-2 rounded-xl border text-center shadow-xs ${getMatchScoreBadge(matchNum)}`}>
                          <span className="text-base font-black tracking-tight block">
                            {Math.round(matchNum)}%
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                            JD Match
                          </span>
                        </div>

                        {/* Overall Score Badge */}
                        <div className={`px-4 py-2 rounded-xl border text-center shadow-xs ${getScoreBadgeStyle(scoreNum)}`}>
                          <div className="flex items-center justify-center gap-1 text-base font-black">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{scoreNum.toFixed(2)}</span>
                            <span className="text-xs font-normal opacity-70">/5</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                            Score
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Competency Skills Matrix Preview */}
                    {skills.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Skills Rated ({skills.length})
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {skills.map((skillItem) => (
                            <span
                              key={skillItem.id || skillItem.skill}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 border border-slate-200/80 text-xs font-semibold text-slate-800"
                            >
                              <span>{skillItem.skill}</span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white text-slate-900 font-bold border border-slate-200 text-[11px] shadow-2xs">
                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                {skillItem.score}/5
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recruiter / Evaluator Notes Snippet */}
                    {item.notes && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 italic leading-relaxed">
                        &ldquo;{item.notes}&rdquo;
                      </div>
                    )}

                    {/* Action Bar with View Resume Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      {/* Left action: View Resume Button */}
                      <div>
                        {resumeUrl ? (
                          <a
                            href={resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 font-semibold rounded-xl"
                              title="Open candidate's resume in a new tab"
                            >
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <span>View Resume</span>
                              <ExternalLink className="w-3 h-3 text-indigo-400" />
                            </Button>
                          </a>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
                            title="No resume URL uploaded for this candidate"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-300" />
                            <span>No Resume</span>
                          </button>
                        )}
                      </div>

                      {/* Right actions: Scorecard, Screening, and Profile */}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedEvaluation(item)}
                          className="flex items-center gap-1.5 font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl"
                          title="Open full evaluation details scorecard"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Full Scorecard</span>
                        </Button>

                        <Link href={`/hr/candidates/${item.candidate_id}/screening`}>
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex items-center gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl"
                          >
                            <span>View Screening</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto mb-2">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950">
                {searchTerm || filterType !== 'ALL' || jobFilter !== 'ALL'
                  ? 'No matching evaluations'
                  : 'No evaluations recorded yet'}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {searchTerm || filterType !== 'ALL' || jobFilter !== 'ALL'
                  ? 'Try clearing your search query or selecting a different filter.'
                  : 'Screen candidates and provide interview evaluations to see them listed here.'}
              </p>
              {(searchTerm || filterType !== 'ALL' || jobFilter !== 'ALL') && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('ALL');
                      setJobFilter('ALL');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

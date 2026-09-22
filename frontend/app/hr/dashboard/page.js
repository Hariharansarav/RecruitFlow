'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Briefcase,
  UserCheck,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  Clock,
  Star,
  Info,
  Building2,
  Calendar,
  AlertCircle,
  Eye,
  Mail,
  Zap,
} from 'lucide-react';
import hrService from '@/services/hrService';
import authService from '@/services/authService';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import interviewEvaluationService from '@/services/interviewEvaluationService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate } from '@/utils/dateUtils';

export default function HrDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Real-time Database Data from RecruitFlow Backend
  const fetchDashboardData = useCallback(async (hrId) => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, candidatesData, jobsData, evaluationsData] =
        await Promise.all([
          hrService.getDashboardStats(hrId).catch(() => null),
          candidateService.getCandidatesWithScreening(true).catch(() => []),
          jobService.getJobs().catch(() => []),
          interviewEvaluationService.getEvaluations().catch(() => []),
        ]);

      setStats(statsData);
      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setEvaluations(Array.isArray(evaluationsData) ? evaluationsData : []);
    } catch (err) {
      console.error('Failed to load HR dashboard data:', err);
      if (err.response?.status === 401) {
        authService.logout();
        router.replace('/login');
      } else {
        setError('Unable to load live dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      fetchDashboardData(currentUser.id);
    } else {
      router.replace('/login');
    }
  }, [fetchDashboardData, router]);

  // Real Database Metrics Calculations
  const openJobsList = useMemo(() => {
    return jobs.filter((j) => j.status === 'OPEN');
  }, [jobs]);

  const openJobsCount = stats?.open_jobs ?? openJobsList.length;
  const totalCandidatesCount = stats?.total_candidates ?? candidates.length;

  // Candidates with >= 80% Match (Stage 2 Qualified)
  const qualifiedCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const score = Number(c.match_percentage ?? c.ai_match_percentage ?? 0);
      return score >= 80;
    });
  }, [candidates]);

  // Real ATS Pipeline Stages Breakdown
  const pipelineStages = useMemo(() => {
    const stage1Applied = candidates.filter(
      (c) => c.status === 'APPLIED' || !c.status
    ).length;
    const stage2Qualified = qualifiedCandidates.length;
    const stage3Evaluated = candidates.filter(
      (c) => c.status === 'EVALUATED'
    ).length;
    const stage4Company = candidates.filter(
      (c) => c.status === 'SUBMITTED_TO_COMPANY'
    ).length;
    const stage5Accepted = candidates.filter(
      (c) => c.status === 'ACCEPTED'
    ).length;

    return [
      {
        id: 'stage-1',
        label: 'Applied / Screening',
        count: stage1Applied,
        color: '#64748B', // slate-500
        bgClass: 'bg-slate-500',
      },
      {
        id: 'stage-2',
        label: 'Stage 2 Qualified (≥80%)',
        count: stage2Qualified,
        color: '#1570EF', // royal blue
        bgClass: 'bg-[#1570EF]',
      },
      {
        id: 'stage-3',
        label: 'Interview Evaluated',
        count: stage3Evaluated,
        color: '#8B5CF6', // purple-500
        bgClass: 'bg-purple-500',
      },
      {
        id: 'stage-4',
        label: 'Company Review',
        count: stage4Company,
        color: '#F59E0B', // amber-500
        bgClass: 'bg-amber-500',
      },
      {
        id: 'stage-5',
        label: 'Accepted / Hired',
        count: stage5Accepted,
        color: '#10B981', // emerald-500
        bgClass: 'bg-emerald-500',
      },
    ];
  }, [candidates, qualifiedCandidates]);

  // Dynamic SVG Donut Ring Segments based on real pipeline counts
  const donutSegments = useMemo(() => {
    const total = totalCandidatesCount || 1;
    const circumference = 238.76; // 2 * Math.PI * 38
    let accumulatedOffset = 0;

    return pipelineStages.map((stage) => {
      const stageLength = (stage.count / total) * circumference;
      const segment = {
        id: stage.id,
        color: stage.color,
        strokeDasharray: `${stageLength} ${circumference - stageLength}`,
        strokeDashoffset: -accumulatedOffset,
        count: stage.count,
      };
      accumulatedOffset += stageLength;
      return segment;
    });
  }, [pipelineStages, totalCandidatesCount]);

  // Stage 2 Qualification Rate Percentage
  const qualificationRate = useMemo(() => {
    if (candidates.length === 0) return 0;
    return Math.round((qualifiedCandidates.length / candidates.length) * 100);
  }, [candidates, qualifiedCandidates]);

  // Department Distribution Aggregation
  const departmentBreakdown = useMemo(() => {
    const map = new Map();
    jobs.forEach((job) => {
      const dept = job.department || 'General';
      if (!map.has(dept)) {
        map.set(dept, { name: dept, jobsCount: 0, applicantsCount: 0 });
      }
      const record = map.get(dept);
      record.jobsCount += 1;
    });

    candidates.forEach((cand) => {
      const dept = cand.job?.department || 'General';
      if (map.has(dept)) {
        map.get(dept).applicantsCount += 1;
      } else {
        map.set(dept, { name: dept, jobsCount: 0, applicantsCount: 1 });
      }
    });

    const list = Array.from(map.values());
    const maxApplicants = Math.max(...list.map((d) => d.applicantsCount), 1);
    return list.map((d) => ({
      ...d,
      fill: Math.round((d.applicantsCount / maxApplicants) * 100),
    }));
  }, [jobs, candidates]);

  // Active Requisitions table data joined with real applicant counts
  const activeRequisitionsData = useMemo(() => {
    const list = openJobsList.length > 0 ? openJobsList : jobs;
    return list.map((job) => {
      const jobCandidates = candidates.filter(
        (c) => String(c.job_id ?? c.job?.id) === String(job.id)
      );
      const applicantsCount = jobCandidates.length;

      // Calculate avg match score
      let avgMatch = 0;
      if (applicantsCount > 0) {
        const totalMatch = jobCandidates.reduce(
          (sum, c) => sum + (Number(c.match_percentage ?? 0) || 0),
          0
        );
        avgMatch = Math.round(totalMatch / applicantsCount);
      }

      // Count qualified for stage 2
      const stage2Count = jobCandidates.filter(
        (c) => Number(c.match_percentage ?? 0) >= 80
      ).length;

      return {
        id: job.id,
        title: job.title,
        department: job.department || 'General',
        applicantsCount,
        avgMatch,
        stage2Count,
        createdDate: formatDate(job.created_at || new Date()),
        candidatesList: jobCandidates.slice(0, 3),
      };
    });
  }, [openJobsList, jobs, candidates]);

  // Recent Candidates (latest 5)
  const recentCandidates = useMemo(() => {
    return [...candidates]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [candidates]);

  // Helper for match score badge styling
  const getMatchScoreBadge = (score) => {
    const val = Number(score) || 0;
    if (val >= 80) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    }
    if (val >= 60) {
      return 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
    }
    if (val >= 40) {
      return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
    }
    return 'bg-slate-50 text-slate-600 border-slate-200 font-normal';
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-900 pb-12">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE KPI METRICS STRIP                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Metric 1: Open Requisitions */}
        <div className="exec-card p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Open Positions
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {openJobsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Actively hiring
            </p>
          </div>
        </div>

        {/* Metric 2: Total Applicants */}
        <div className="exec-card p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Applicants
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalCandidatesCount}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Across all positions
            </p>
          </div>
        </div>

        {/* Metric 3: Stage 2 Qualified (>=80% Match) */}
        <div className="exec-card p-5 flex flex-col justify-between hover:border-blue-300 bg-gradient-to-br from-white to-blue-50/40 border-blue-200/80 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Stage 2 Qualified
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight">
              {qualifiedCandidates.length}
            </div>
            <p className="text-xs text-blue-700 font-semibold mt-1">
              ≥80% JD match ({qualificationRate}%)
            </p>
          </div>
        </div>

        {/* Metric 4: Interview Evaluated */}
        <div className="exec-card p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Evaluated
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats?.evaluated_candidates ?? evaluations.length}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Interviews completed
            </p>
          </div>
        </div>

        {/* Metric 5: Placed / Accepted */}
        <div className="exec-card p-5 flex flex-col justify-between hover:border-slate-300 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Offers / Placed
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats?.accepted_candidates ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Successful hires
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SECTION: Active Requisitions + Pipeline Status Overview           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CARD 1: Active Requisitions Table (7 Cols) */}
        <div className="lg:col-span-7 exec-card p-6 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Active Requisitions & Hiring Pipelines
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Open positions with real-time applicant volume and match scores.
                </p>
              </div>
              <Link
                href="/hr/jobs"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-colors"
              >
                <span>View All Jobs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Requisitions Table */}
            {activeRequisitionsData.length > 0 ? (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3 pr-4">Position</th>
                      <th className="py-3 px-3 text-center">Applicants</th>
                      <th className="py-3 px-3 text-center">Stage 2 Ready</th>
                      <th className="py-3 px-3 text-center">Avg Match</th>
                      <th className="py-3 pl-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeRequisitionsData.slice(0, 5).map((req) => (
                      <tr
                        key={req.id}
                        className="group hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Position & Department */}
                        <td className="py-3.5 pr-4">
                          <Link
                            href={`/hr/jobs/${req.id}`}
                            className="block group-hover:text-blue-600 transition-colors"
                          >
                            <p className="text-xs sm:text-sm font-bold text-slate-900">
                              {req.title}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {req.department}
                            </p>
                          </Link>
                        </td>

                        {/* Applicants Count */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                            {req.applicantsCount}
                          </span>
                        </td>

                        {/* Stage 2 Ready Count (>=80%) */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              req.stage2Count > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            {req.stage2Count} qualified
                          </span>
                        </td>

                        {/* Avg Match Score */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getMatchScoreBadge(
                              req.avgMatch
                            )}`}
                          >
                            {req.avgMatch}%
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 pl-3 text-right">
                          <Link
                            href={`/hr/jobs/${req.id}`}
                            className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
                          >
                            Manage
                            <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No active requisitions</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Create your first job posting to begin receiving applicants.
                </p>
                <Link href="/hr/jobs/create">
                  <Button variant="primary" size="sm">
                    Create Requisition
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing top active positions</span>
            <Link
              href="/hr/candidates/create"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              + Add Candidate to Position
            </Link>
          </div>
        </div>

        {/* CARD 2: Real Recruitment Pipeline Overview (5 Cols) */}
        <div className="lg:col-span-5 exec-card p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Pipeline Status Overview
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live breakdown of candidates across recruitment stages.
                </p>
              </div>
              <Link
                href="/hr/candidates"
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                title="View All Candidates"
              >
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Circular Gauge Ring & ATS Stage Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Ring Gauge Center */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="9"
                    />
                    {/* Multi-segmented dynamic colored donut arcs */}
                    {donutSegments.map((seg) => {
                      if (seg.count <= 0) return null;
                      return (
                        <circle
                          key={seg.id}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="9"
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      {totalCandidatesCount}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 mt-1">
                      Candidates
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage Breakdown Legend with Individual Progress Bars */}
              <div className="sm:col-span-7 space-y-2">
                {pipelineStages.map((stage) => {
                  const pct =
                    totalCandidatesCount > 0
                      ? Math.round((stage.count / totalCandidatesCount) * 100)
                      : 0;

                  return (
                    <div key={stage.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs pr-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-slate-700 font-medium truncate">
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900">{stage.count}</span>
                          <span className="text-[10px] text-slate-400 w-8 text-right font-medium">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pipeline Stage Distribution Multi-Segment Bar */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">Funnel Distribution</span>
                <span className="font-bold text-blue-600">
                  {qualificationRate}% Stage 2 Qualified
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                {pipelineStages.map((stage) => {
                  const pct =
                    totalCandidatesCount > 0
                      ? (stage.count / totalCandidatesCount) * 100
                      : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={stage.id}
                      style={{ width: `${pct}%`, backgroundColor: stage.color }}
                      className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                      title={`${stage.label}: ${stage.count} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Key Velocity Mini-Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500">Screening</p>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  {candidates.filter((c) => c.status === 'APPLIED' || !c.status).length}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Stage 1</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-center">
                <p className="text-[10px] uppercase font-bold text-blue-700">Qualified</p>
                <p className="text-base font-black text-blue-900 mt-0.5">
                  {qualifiedCandidates.length}
                </p>
                <p className="text-[10px] text-blue-700 font-semibold">≥80% Match</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-center">
                <p className="text-[10px] uppercase font-bold text-purple-700">Evaluated</p>
                <p className="text-base font-black text-purple-900 mt-0.5">
                  {stats?.evaluated_candidates ?? evaluations.length}
                </p>
                <p className="text-[10px] text-purple-700 font-semibold">Scorecards</p>
              </div>
            </div>
          </div>

          {/* Stage 2 Qualification Highlight Box with Direct Action */}
          <div className="pt-2 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-100 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-blue-950 truncate">Stage 2 AI Screening Gate</p>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-tight">
                    <span className="font-bold">{qualifiedCandidates.length} of {totalCandidatesCount}</span> candidates meet the 80% threshold.
                  </p>
                </div>
              </div>
              <Link
                href="/hr/candidates"
                className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
              >
                <span>Review</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LOWER SECTION: Recent Candidates & Department Distribution             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CARD 3: Recent Candidate Talent (7 Cols) */}
        <div className="lg:col-span-7 exec-card p-6 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Recent Candidate Applications
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest applicant submissions with automated JD match results.
                </p>
              </div>
              <Link
                href="/hr/candidates"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-colors"
              >
                <span>View Full Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Candidates List */}
            {recentCandidates.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-1">
                {recentCandidates.map((cand) => {
                  const match = Number(cand.match_percentage ?? 0);
                  const isStage2 = match >= 80;
                  const initials = cand.name
                    ? cand.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'C';

                  return (
                    <div
                      key={cand.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#0B132B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/hr/candidates/${cand.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors truncate block"
                          >
                            {cand.name}
                          </Link>
                          <p className="text-xs text-slate-500 truncate">
                            {cand.job?.title || 'General Position'}
                            {cand.job?.department && ` · ${cand.job.department}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {/* Match score badge */}
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold border ${getMatchScoreBadge(
                              match
                            )}`}
                          >
                            {match}% Match
                          </span>
                        </div>

                        {/* Status Badge */}
                        <Badge status={cand.status}>
                          {isStage2 && cand.status === 'APPLIED'
                            ? 'Stage 2 Ready'
                            : cand.status || 'Applied'}
                        </Badge>

                        {/* View Button */}
                        <Link href={`/hr/candidates/${cand.id}`}>
                          <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No applicants yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Candidates will appear here once submitted or uploaded.
                </p>
                <Link href="/hr/candidates/create">
                  <Button variant="primary" size="sm">
                    Add Candidate
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Automated AI resume screening active</span>
            <Link
              href="/hr/evaluations"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View Interview Scorecards →
            </Link>
          </div>
        </div>

        {/* CARD 4: Department Requisition Distribution (5 Cols) */}
        <div className="lg:col-span-5 exec-card p-6 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Department Hiring Volume
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requisition and applicant distribution by department.
                </p>
              </div>
              <Link
                href="/hr/jobs"
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                title="View Jobs"
              >
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Department Horizontal Progress Bars */}
            <div className="space-y-4 pt-5">
              {departmentBreakdown.length > 0 ? (
                departmentBreakdown.map((dept) => (
                  <div key={dept.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{dept.name}</span>
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <span>{dept.jobsCount} {dept.jobsCount === 1 ? 'job' : 'jobs'}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-900">
                          {dept.applicantsCount} {dept.applicantsCount === 1 ? 'applicant' : 'applicants'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${Math.max(dept.fill, 8)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No departments found. Open positions to see hiring distribution.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            Data updates in real-time as new job requisitions and candidate applications are submitted.
          </div>
        </div>
      </div>
    </div>
  );
}

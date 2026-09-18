'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  ClipboardCheck,
  Send,
  UserCheck,
  UserX,
  Plus,
  ArrowRight,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import hrService from '@/services/hrService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function HrDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load dashboard data
  const fetchDashboardData = useCallback(async (hrId, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [statsData, candidatesData, jobsData] = await Promise.all([
        hrService.getDashboardStats(hrId),
        hrService.getRecentCandidates(5),
        hrService.getRecentJobs(5),
      ]);

      setStats(statsData);
      setRecentCandidates(candidatesData);
      setRecentJobs(jobsData);
    } catch (err) {
      console.error('Failed to load HR dashboard data:', err);
      const status = err.response?.status;

      if (status === 401) {
        authService.logout();
        router.replace('/login');
        return;
      } else if (status === 403) {
        setError("You don't have permission to view this dashboard.");
      } else {
        setError('Unable to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      fetchDashboardData(currentUser.id);
    }
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    if (user) {
      fetchDashboardData(user.id, true);
    }
  };

  const getCandidateStatusDisplay = (status) => {
    switch (status) {
      case 'SUBMITTED_TO_COMPANY':
        return 'Submitted to Company';
      case 'EVALUATED':
        return 'Evaluated';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REJECTED':
        return 'Rejected';
      case 'APPLIED':
      default:
        return 'Applied';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Welcome back, <span className="text-zinc-900 font-medium">{user?.name || 'Recruiter'}</span>. Here is your candidate pipeline overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/hr/jobs?add=true">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Create Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error State with Retry */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 mb-1">
            Unable to load dashboard data
          </h2>
          <p className="text-sm text-zinc-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 3. Loading Skeleton State */}
      {loading && !error && (
        <div className="space-y-6 animate-pulse">
          {/* 4 Skeleton Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3.5 bg-zinc-200 rounded w-24" />
                  <div className="w-9 h-9 bg-zinc-200 rounded-xl" />
                </div>
                <div className="h-8 bg-zinc-200 rounded w-16" />
                <div className="h-3 bg-zinc-100 rounded w-32" />
              </div>
            ))}
          </div>

          <div className="h-16 bg-white border border-zinc-200/80 rounded-2xl" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-white border border-zinc-200/80 rounded-2xl" />
            <div className="h-64 bg-white border border-zinc-200/80 rounded-2xl" />
          </div>
        </div>
      )}

      {/* 4. Live Dashboard Content */}
      {!loading && !error && (
        <>
          {/* Focused 4 Executive Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              icon={Briefcase}
              label="Open Jobs"
              value={stats?.open_jobs ?? 0}
              description="Active requisitions"
              color="blue"
            />
            <StatCard
              icon={Users}
              label="Total Pipeline"
              value={stats?.total_candidates ?? 0}
              description="Total talent in review"
              color="zinc"
            />
            <StatCard
              icon={Send}
              label="Awaiting Review"
              value={stats?.submitted_candidates ?? 0}
              description="Submitted to company"
              color="indigo"
            />
            <StatCard
              icon={UserCheck}
              label="Hired Candidates"
              value={stats?.accepted_candidates ?? 0}
              description="Accepted placements"
              color="emerald"
            />
          </div>

          {/* Compact Pipeline Status Distribution Strip */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Pipeline Lifecycle Breakdown
              </h2>
              <span className="text-xs text-zinc-500 font-medium">
                Total candidates: {stats?.total_candidates ?? 0}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="bg-zinc-50 border border-zinc-200/70 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 font-medium block">Applied</span>
                  <span className="text-lg font-bold text-zinc-900">
                    {(stats?.total_candidates ?? 0) -
                      ((stats?.evaluated_candidates ?? 0) +
                        (stats?.submitted_candidates ?? 0) +
                        (stats?.accepted_candidates ?? 0) +
                        (stats?.rejected_candidates ?? 0)) > 0
                      ? (stats?.total_candidates ?? 0) -
                        ((stats?.evaluated_candidates ?? 0) +
                          (stats?.submitted_candidates ?? 0) +
                          (stats?.accepted_candidates ?? 0) +
                          (stats?.rejected_candidates ?? 0))
                      : 0}
                  </span>
                </div>
                <Badge status="APPLIED">Applied</Badge>
              </div>

              <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-900/80 font-medium block">Evaluated</span>
                  <span className="text-lg font-bold text-amber-950">
                    {stats?.evaluated_candidates ?? 0}
                  </span>
                </div>
                <Badge status="EVALUATED">Evaluated</Badge>
              </div>

              <div className="bg-blue-50/40 border border-blue-200/70 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-900/80 font-medium block">Submitted</span>
                  <span className="text-lg font-bold text-blue-950">
                    {stats?.submitted_candidates ?? 0}
                  </span>
                </div>
                <Badge status="SUBMITTED_TO_COMPANY">Submitted</Badge>
              </div>

              <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-900/80 font-medium block">Accepted</span>
                  <span className="text-lg font-bold text-emerald-950">
                    {stats?.accepted_candidates ?? 0}
                  </span>
                </div>
                <Badge status="ACCEPTED">Accepted</Badge>
              </div>

              <div className="bg-rose-50/40 border border-rose-200/70 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-900/80 font-medium block">Rejected</span>
                  <span className="text-lg font-bold text-rose-950">
                    {stats?.rejected_candidates ?? 0}
                  </span>
                </div>
                <Badge status="REJECTED">Rejected</Badge>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">Quick Navigation</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Jump directly to your active hiring workflows.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/hr/candidates">
                <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-700" />
                  <span>View All Candidates</span>
                </Button>
              </Link>
              <Link href="/hr/evaluations">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Screening Evaluations</span>
                </Button>
              </Link>
              <Link href="/hr/jobs">
                <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Job Requisitions</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Candidates & Recent Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Candidates */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 tracking-tight">
                      Recent Candidates
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Latest applicant entries in pipeline
                    </p>
                  </div>
                  <Link
                    href="/hr/candidates"
                    className="text-xs font-semibold text-zinc-900 hover:text-black flex items-center gap-1 transition-colors"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentCandidates.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-800">
                      No candidates yet.
                    </p>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 mb-4">
                      Add candidates to start screening and comparing against job requirements.
                    </p>
                    <Link href="/hr/candidates?add=true">
                      <Button variant="outline" size="sm">
                        + Add Candidate
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {recentCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="p-4 hover:bg-zinc-50/70 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/hr/candidates/${candidate.id}`}
                              className="text-sm font-semibold text-zinc-950 hover:text-zinc-700 truncate"
                            >
                              {candidate.name}
                            </Link>
                            <Badge status={candidate.status}>
                              {getCandidateStatusDisplay(candidate.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 truncate">
                            <span className="truncate">{candidate.email}</span>
                            <span>•</span>
                            <span className="truncate text-zinc-600 font-medium">
                              {candidate.job?.title || 'General'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 text-xs text-zinc-400 font-medium">
                          {formatDate(candidate.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Jobs */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 tracking-tight">
                      Recent Jobs
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Latest requisition postings
                    </p>
                  </div>
                  <Link
                    href="/hr/jobs"
                    className="text-xs font-semibold text-zinc-900 hover:text-black flex items-center gap-1 transition-colors"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentJobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-800">
                      No jobs created yet.
                    </p>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 mb-4">
                      Create job descriptions to screen candidates against required skills.
                    </p>
                    <Link href="/hr/jobs?add=true">
                      <Button variant="primary" size="sm" className="inline-flex items-center gap-1.5">
                        <Plus className="w-4 h-4" />
                        <span>Create Job</span>
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 hover:bg-zinc-50/70 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/hr/jobs/${job.id}`}
                              className="text-sm font-semibold text-zinc-950 hover:text-zinc-700 truncate"
                            >
                              {job.title}
                            </Link>
                            <Badge status={job.status}>
                              {job.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 truncate">
                            <span className="truncate">{job.department}</span>
                            <span>•</span>
                            <span className="truncate text-zinc-500">
                              {job.candidate_count ?? 0} applicants
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 text-xs text-zinc-400 font-medium">
                          {formatDate(job.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

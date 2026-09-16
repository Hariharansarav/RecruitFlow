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
  RefreshCw,
  Plus,
  ArrowRight,
  AlertCircle,
  MapPin,
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

  // Format candidate status text for display
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
    <div className="space-y-8">
      {/* 1. Header & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'Recruiter'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here&apos;s an overview of your recruitment activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`}
            />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Error State with Retry */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Dashboard Error
          </h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => user && fetchDashboardData(user.id)}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      )}

      {/* 3. Loading Skeleton State */}
      {loading && !error && (
        <div className="space-y-8">
          {/* Skeleton Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-slate-200 rounded w-28" />
                  <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                </div>
                <div className="h-8 bg-slate-200 rounded w-16" />
                <div className="h-3 bg-slate-200 rounded w-36" />
              </div>
            ))}
          </div>

          {/* Skeleton Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-24 mb-4" />
            <div className="flex flex-wrap gap-3">
              <div className="h-10 bg-slate-200 rounded-lg w-32" />
              <div className="h-10 bg-slate-200 rounded-lg w-36" />
              <div className="h-10 bg-slate-200 rounded-lg w-40" />
            </div>
          </div>

          {/* Skeleton Recent Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 rounded w-36 mb-4" />
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 rounded w-32 mb-4" />
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Dashboard Content */}
      {!loading && !error && (
        <>
          {/* Primary Statistics Grid (3 cols on desktop, 2 on tablet, 1 on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={Briefcase}
              label="Open Jobs"
              value={stats?.open_jobs ?? 0}
              description="Active open requisitions"
              color="brand"
            />
            <StatCard
              icon={Users}
              label="Total Candidates"
              value={stats?.total_candidates ?? 0}
              description="Applicants across all jobs"
              color="sky"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Evaluated"
              value={stats?.evaluated_candidates ?? 0}
              description="Completed interview screening"
              color="violet"
            />
            <StatCard
              icon={Send}
              label="Submitted to Company"
              value={stats?.submitted_candidates ?? 0}
              description="Awaiting company review"
              color="amber"
            />
            <StatCard
              icon={UserCheck}
              label="Accepted"
              value={stats?.accepted_candidates ?? 0}
              description="Hired by company"
              color="emerald"
            />
            <StatCard
              icon={UserX}
              label="Rejected"
              value={stats?.rejected_candidates ?? 0}
              description="Archived / rejected"
              color="rose"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/hr/jobs">
                <Button variant="primary" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Job
                </Button>
              </Link>
              <Link href="/hr/candidates">
                <Button variant="secondary" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  View Candidates
                </Button>
              </Link>
              <Link href="/hr/evaluations">
                <Button variant="outline" className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-slate-600" />
                  View Evaluations
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Candidates & Recent Jobs (2 cols on desktop, 1 col on mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Candidates */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Recent Candidates
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Latest applicant submissions
                    </p>
                  </div>
                  <Link
                    href="/hr/candidates"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentCandidates.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      No candidates yet.
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                      Once candidates are added, your recent candidates will appear here.
                    </p>
                    <Link href="/hr/candidates">
                      <Button variant="outline" size="sm">
                        View Candidates
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {candidate.name}
                            </span>
                            <Badge status={candidate.status}>
                              {getCandidateStatusDisplay(candidate.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="truncate">{candidate.email}</span>
                            <span>•</span>
                            <span className="truncate text-slate-600 font-medium">
                              {candidate.job?.title || 'General Applicant'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 text-xs text-slate-400 font-medium">
                          {formatDate(candidate.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Jobs */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Recent Jobs
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Latest requisition postings
                    </p>
                  </div>
                  <Link
                    href="/hr/jobs"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentJobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      No jobs created yet.
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                      Create your first job to start recruiting candidates.
                    </p>
                    <Link href="/hr/jobs">
                      <Button variant="primary" size="sm">
                        Create Job
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {job.title}
                            </span>
                            <Badge status={job.status}>{job.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {job.department || 'General'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {job.location || 'Remote'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
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

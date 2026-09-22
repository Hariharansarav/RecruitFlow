'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  ArrowRight,
  AlertCircle,
  Eye,
  Briefcase,
  Star,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import companyService from '@/services/companyService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async (companyId, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [statsData, candidatesData] = await Promise.all([
        companyService.getCompanyDashboard(companyId),
        companyService.getCompanyCandidates(companyId),
      ]);

      setStats(statsData);
      // Recent candidates: up to 5 newest
      setRecentCandidates(candidatesData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load company dashboard:', err);
      const status = err.response?.status;
      if (status === 401) {
        authService.logout();
        router.replace('/login');
        return;
      } else if (status === 403) {
        setError('You do not have permission to view the company workspace.');
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
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (currentUser.role !== 'COMPANY') {
      router.replace('/hr/dashboard');
      return;
    }
    setUser(currentUser);
    fetchDashboard(currentUser.id);
  }, [router, fetchDashboard]);

  const handleRefresh = () => {
    if (user?.id) {
      fetchDashboard(user.id, true);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'SUBMITTED_TO_COMPANY':
        return 'Pending Review';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getMatchScoreBadgeColor = (percentage) => {
    const val = Number(percentage) || 0;
    if (val >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-300 font-bold ring-1 ring-emerald-500/20';
    if (val >= 70) return 'text-blue-700 bg-blue-50 border-blue-300 font-bold ring-1 ring-blue-500/20';
    if (val >= 50) return 'text-amber-800 bg-amber-50 border-amber-300 font-bold ring-1 ring-amber-500/20';
    return 'text-rose-700 bg-rose-50 border-rose-200 font-medium';
  };

  return (
    <div className="space-y-8">
      {/* Header & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-white bg-zinc-950 px-2.5 py-0.5 rounded-full">
              Company Portal
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-500 font-medium">Candidate Review</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Welcome back, {user?.name || 'Company Reviewer'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Review pre-screened candidates submitted by HR and make final hiring decisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/company/candidates">
            <Button variant="primary" className="flex items-center gap-2">
              <span>View Candidate Pipeline</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-zinc-100 text-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 mb-1">Dashboard Error</h2>
          <p className="text-sm text-zinc-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => user && fetchDashboard(user.id)}
            className="inline-flex items-center gap-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading company portal...</p>
        </div>
      )}

      {/* Live Content */}
      {!loading && !error && (
        <>
          {/* 1. Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              icon={Users}
              label="Total Submitted"
              value={stats?.total_submitted ?? 0}
              description="Candidates in company pipeline"
              color="indigo"
            />
            <StatCard
              icon={Clock}
              label="Pending Review"
              value={stats?.pending_review ?? 0}
              description="Dossiers awaiting hiring decision"
              color="amber"
            />
            <StatCard
              icon={CheckCircle2}
              label="Accepted"
              value={stats?.accepted ?? 0}
              description="Candidates approved for offer"
              color="emerald"
            />
            <StatCard
              icon={XCircle}
              label="Rejected"
              value={stats?.rejected ?? 0}
              description="Declined candidate profiles"
              color="rose"
            />
          </div>

          {/* 2. Quick Actions Section */}
          <div className="exec-card p-6 space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/company/candidates">
                <Button variant="secondary" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-800" />
                  <span>View All Candidates</span>
                </Button>
              </Link>
              <Link href="/company/candidates?status=pending">
                <Button variant="outline" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Pending Reviews ({stats?.pending_review ?? 0})</span>
                </Button>
              </Link>
              <Link href="/company/candidates?status=accepted">
                <Button variant="outline" className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Accepted Candidates ({stats?.accepted ?? 0})</span>
                </Button>
              </Link>
              <Link href="/company/candidates?status=rejected">
                <Button variant="outline" className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Rejected Candidates ({stats?.rejected ?? 0})</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* 3. Recent Candidates Section */}
          <div className="exec-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recent Candidates
                </h2>
                <p className="text-xs text-slate-500">
                  Candidates recently submitted by HR for employer review.
                </p>
              </div>
              <Link href="/company/candidates">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                  <span>View Full Pipeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {recentCandidates.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentCandidates.map((c) => {
                  const initials = c.name
                    ? c.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'C';

                  return (
                    <div
                      key={c.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/75 px-4 rounded-2xl transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#0B132B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900 truncate">
                              {c.name}
                            </span>
                            <Badge status={c.status}>
                              {getStatusLabel(c.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              {c.job?.title || 'Position'}
                            </span>
                            {c.job?.department && (
                              <span>• {c.job.department}</span>
                            )}
                            {c.updated_at && (
                              <span>• Submitted {formatDate(c.updated_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0 justify-between md:justify-end">
                        {/* JD Match */}
                        <div className="text-center sm:text-right">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${getMatchScoreBadgeColor(
                              c.match_percentage,
                            )}`}
                          >
                            {c.match_percentage ?? 0}% Match
                          </span>
                        </div>

                        {/* Interview Score */}
                        {c.interview?.score !== undefined && (
                          <div className="text-center sm:text-right flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-extrabold text-slate-900">
                              {c.interview.score}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">/ 5</span>
                          </div>
                        )}

                        <Link href={`/company/candidates/${c.id}`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Candidate</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  No candidates have been submitted for review yet.
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Once HR evaluates applicants and submits them, their profiles will appear here.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

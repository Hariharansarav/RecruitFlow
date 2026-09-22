'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  X,
  Eye,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import companyService from '@/services/companyService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

function CompanyCandidatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get('status'); // 'pending' | 'accepted' | 'rejected' | null

  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    if (initialStatusParam === 'pending') return 'SUBMITTED_TO_COMPANY';
    if (initialStatusParam === 'accepted') return 'ACCEPTED';
    if (initialStatusParam === 'rejected') return 'REJECTED';
    return 'ALL';
  });

  const fetchCandidates = useCallback(async (companyId, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await companyService.getCompanyCandidates(companyId);
      setCandidates(data);
    } catch (err) {
      console.error('Failed to load company candidates:', err);
      const status = err.response?.status;
      if (status === 401) {
        authService.logout();
        router.replace('/login');
        return;
      } else if (status === 403) {
        setError('You do not have permission to view this pipeline.');
      } else {
        setError('Unable to load candidates. Please try again.');
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
    fetchCandidates(currentUser.id);
  }, [router, fetchCandidates]);

  // Derived counts for filter tabs
  const counts = useMemo(() => {
    const total = candidates.length;
    const pending = candidates.filter(
      (c) => c.status === 'SUBMITTED_TO_COMPANY',
    ).length;
    const accepted = candidates.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = candidates.filter((c) => c.status === 'REJECTED').length;
    return { total, pending, accepted, rejected };
  }, [candidates]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && candidate.status !== statusFilter) {
        return false;
      }

      // 2. Search Query (name, email, job title)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = candidate.name?.toLowerCase().includes(query);
        const emailMatch = candidate.email?.toLowerCase().includes(query);
        const jobMatch = candidate.job?.title?.toLowerCase().includes(query);
        return nameMatch || emailMatch || jobMatch;
      }

      return true;
    });
  }, [candidates, searchTerm, statusFilter]);

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

  const getMatchBadgeClass = (score) => {
    const val = Number(score) || 0;
    if (val >= 85) return 'text-emerald-800 bg-emerald-50 border border-emerald-200 font-semibold shadow-xs';
    if (val >= 70) return 'text-blue-800 bg-blue-50 border border-blue-200 font-semibold shadow-xs';
    if (val >= 50) return 'text-amber-800 bg-amber-50 border border-amber-200 font-semibold shadow-xs';
    return 'text-slate-700 bg-slate-100 border border-slate-200 font-medium';
  };

  const getEmptyStateMessage = () => {
    if (statusFilter === 'SUBMITTED_TO_COMPANY') {
      return 'No candidates are currently pending review.';
    }
    if (statusFilter === 'ACCEPTED') {
      return 'No candidates have been accepted yet.';
    }
    if (statusFilter === 'REJECTED') {
      return 'No candidates have been rejected.';
    }
    return 'No candidates are currently available for review.';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Candidate Pipeline
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Review submitted candidate dossiers, automated JD match scores, and HR interview notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/company/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 text-center max-w-lg mx-auto shadow-xs">
          <AlertCircle className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
          <h2 className="text-base font-bold text-zinc-950 mb-1">{error}</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => user && fetchCandidates(user.id)}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Search & Status Filter Controls */}
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate name, email, or job title..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/70 hover:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
          {[
            { label: 'All', value: 'ALL', count: counts.total },
            {
              label: 'Pending Review',
              value: 'SUBMITTED_TO_COMPANY',
              count: counts.pending,
            },
            {
              label: 'Accepted',
              value: 'ACCEPTED',
              count: counts.accepted,
            },
            {
              label: 'Rejected',
              value: 'REJECTED',
              count: counts.rejected,
            },
          ].map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'bg-slate-200 text-slate-600 font-medium'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simple Loading State */}
      {loading && !error && (
        <div className="py-20 text-center">
          <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading candidate dossiers...</p>
        </div>
      )}

      {/* Candidates List / Table */}
      {!loading && !error && (
        <>
          {filteredCandidates.length > 0 ? (
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider select-none">
                    <tr>
                      <th className="py-4 px-6 whitespace-nowrap min-w-[210px]">Candidate</th>
                      <th className="py-4 px-6 whitespace-nowrap min-w-[170px]">Position</th>
                      <th className="py-4 px-6 text-center whitespace-nowrap min-w-[110px]">JD Match</th>
                      <th className="py-4 px-6 text-center whitespace-nowrap min-w-[110px]">Interview</th>
                      <th className="py-4 px-6 text-center whitespace-nowrap min-w-[130px]">Status</th>
                      <th className="py-4 px-6 whitespace-nowrap min-w-[120px]">Submitted Date</th>
                      <th className="py-4 px-6 text-right whitespace-nowrap min-w-[160px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((c) => {
                      const initials = c.name
                        ? c.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'C';

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/75 transition-colors group"
                        >
                          {/* Candidate Name & Contact */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                {initials}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition-colors truncate">
                                  {c.name}
                                </span>
                                <span className="text-xs text-slate-500 block truncate">
                                  {c.email}
                                </span>
                                {c.phone && (
                                  <span className="text-xs text-slate-400 block font-mono">
                                    {c.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Job Position & Department */}
                          <td className="py-4 px-6">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-900 block">
                                {c.job?.title || 'Open Requisition'}
                              </span>
                              <span className="text-xs text-slate-500 block">
                                {c.job?.department || 'General'}
                              </span>
                            </div>
                          </td>

                          {/* JD Match */}
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${getMatchBadgeClass(
                                c.match_percentage,
                              )}`}
                            >
                              {c.match_percentage ?? 0}%
                            </span>
                          </td>

                          {/* Interview Score */}
                          <td className="py-4 px-6 text-center">
                            {c.interview?.score !== undefined ? (
                              <div className="inline-flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {c.interview.score}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  /5
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Not recorded
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-6 text-center">
                            <Badge status={c.status}>
                              {getStatusLabel(c.status)}
                            </Badge>
                          </td>

                          {/* Submitted Date */}
                          <td className="py-4 px-6 text-xs text-slate-500">
                            {c.updated_at || c.created_at ? (
                              <span className="flex items-center gap-1 text-slate-500 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatDate(c.updated_at || c.created_at)}
                              </span>
                            ) : (
                              'Recent'
                            )}
                          </td>

                          {/* Review Action */}
                          <td className="py-4 px-6 text-right">
                            <Link href={`/company/candidates/${c.id}`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="inline-flex items-center gap-1.5 shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Review</span>
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950">
                {searchTerm ? 'No matching candidates' : getEmptyStateMessage()}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {searchTerm
                  ? 'Try searching with a different candidate name, email, or position.'
                  : 'Candidates submitted by HR with completed evaluations will appear here for review.'}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CompanyCandidatesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading candidate pipeline...</p>
        </div>
      }
    >
      <CompanyCandidatesContent />
    </Suspense>
  );
}

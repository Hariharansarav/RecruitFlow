'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  X,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  Filter,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import AddCandidateModal from '@/components/candidates/AddCandidateModal';
import EditCandidateModal from '@/components/candidates/EditCandidateModal';
import SendMailModal from '@/components/candidates/SendMailModal';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function HrCandidatesPage() {
  const [user, setUser] = useState(null);
  
  // Instant render from cache if available (0ms load time!)
  const [candidates, setCandidates] = useState(() => {
    return candidateService.getCachedCandidatesWithScreening() || [];
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(() => {
    return !(candidateService.getCachedCandidatesWithScreening()?.length > 0);
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jobFilter, setJobFilter] = useState('ALL');

  // Add Candidate modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit Candidate modal state
  const [candidateToEdit, setCandidateToEdit] = useState(null);

  // Send Mail modal state
  const [candidateForMail, setCandidateForMail] = useState(null);

  // Deletion modal state
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  // Fetch candidates with screening and jobs list
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (candidates.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      const [candidatesData, jobsData] = await Promise.all([
        candidateService.getCandidatesWithScreening(isRefresh),
        jobService.getJobs(),
      ]);
      setCandidates(candidatesData);
      setJobs(jobsData);
    } catch (err) {
      console.error('Failed to load candidate management data:', err);
      if (candidates.length === 0) {
        setError('Unable to load candidates. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [candidates.length]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    fetchData();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('add') === 'true') {
        setIsAddModalOpen(true);
      }
    }
  }, [fetchData]);

  // Derived statistics from live database records
  const stats = useMemo(() => {
    const total = candidates.length;
    const applied = candidates.filter((c) => c.status === 'APPLIED').length;
    const evaluated = candidates.filter((c) => c.status === 'EVALUATED').length;
    const submitted = candidates.filter(
      (c) => c.status === 'SUBMITTED_TO_COMPANY',
    ).length;
    const accepted = candidates.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = candidates.filter((c) => c.status === 'REJECTED').length;
    return { total, applied, evaluated, submitted, accepted, rejected };
  }, [candidates]);

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && candidate.status !== statusFilter) {
        return false;
      }

      // 2. Job Filter
      if (jobFilter !== 'ALL' && String(candidate.job_id) !== String(jobFilter)) {
        return false;
      }

      // 3. Search query (name, email, phone, job title)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = candidate.name?.toLowerCase().includes(query);
        const emailMatch = candidate.email?.toLowerCase().includes(query);
        const phoneMatch = candidate.phone?.toLowerCase().includes(query);
        const jobMatch = candidate.job?.title?.toLowerCase().includes(query);
        const techLeadMatch = candidate.tech_lead?.name?.toLowerCase().includes(query) || candidate.tech_lead?.email?.toLowerCase().includes(query);
        return nameMatch || emailMatch || phoneMatch || jobMatch || techLeadMatch;
      }

      return true;
    });
  }, [candidates, searchTerm, statusFilter, jobFilter]);

  // Status display label
  const getStatusDisplay = (status) => {
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

  // Color-coded JD Match score styling
  const getMatchScoreBadge = (score) => {
    const val = Number(score) || 0;
    if (val >= 85) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold ring-1 ring-emerald-500/20 shadow-xs';
    } else if (val >= 70) {
      return 'bg-blue-50 text-blue-700 border-blue-300 font-bold ring-1 ring-blue-500/20 shadow-xs';
    } else if (val >= 50) {
      return 'bg-amber-50 text-amber-800 border-amber-300 font-bold ring-1 ring-amber-500/20 shadow-xs';
    }
    return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
  };

  // Handle Delete Candidate
  const handleDelete = async () => {
    if (!candidateToDelete) return;
    setDeleteLoading(true);

    try {
      await candidateService.deleteCandidate(candidateToDelete.id, user?.id);
      setToast({
        message: 'Candidate deleted successfully.',
        type: 'success',
      });
      setCandidateToDelete(null);
      await fetchData(true);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
      const msg =
        err.response?.data?.message || 'Failed to delete candidate.';
      setToast({
        message: msg,
        type: 'error',
      });
      setCandidateToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' || statusFilter !== 'ALL' || jobFilter !== 'ALL';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Candidate Confirmation Modal */}
      {candidateToDelete && (
        <Modal
          isOpen={true}
          title="Delete candidate?"
          message={`Are you sure you want to delete ${candidateToDelete.name}? This will permanently remove their application and interview evaluation records.`}
          confirmText="Delete Candidate"
          confirmVariant="danger"
          isLoading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setCandidateToDelete(null)}
        />
      )}

      {/* Add Candidate Modal */}
      <AddCandidateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setToast({
            message: 'Candidate added successfully.',
            type: 'success',
          });
          fetchData(true);
        }}
      />

      {/* Edit Candidate Modal Card */}
      <EditCandidateModal
        isOpen={Boolean(candidateToEdit)}
        candidate={candidateToEdit}
        onClose={() => setCandidateToEdit(null)}
        onSuccess={() => {
          setToast({
            message: 'Candidate updated successfully.',
            type: 'success',
          });
          setCandidateToEdit(null);
          fetchData(true);
        }}
      />

      {/* Send Mail Modal */}
      <SendMailModal
        isOpen={Boolean(candidateForMail)}
        candidate={candidateForMail}
        onClose={() => setCandidateForMail(null)}
        onOpenEditCandidate={(cand) => {
          setCandidateForMail(null);
          setCandidateToEdit(cand);
        }}
        onSuccess={(msg) => {
          setToast({
            message: msg || 'Interview invitation sent successfully.',
            type: 'success',
          });
          fetchData(true);
        }}
      />

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Candidates
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage applicant talent, review JD match scores, and conduct interview screening.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate</span>
          </Button>
        </div>
      </div>

      {/* 2. Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 mb-1">
            Unable to load candidates
          </h2>
          <p className="text-sm text-zinc-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => fetchData(true)}
            className="inline-flex items-center gap-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 3. Loading Skeletons */}
      {loading && !error && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs space-y-2"
              >
                <div className="h-3 bg-zinc-200 rounded w-16" />
                <div className="h-6 bg-zinc-200 rounded w-10" />
              </div>
            ))}
          </div>

          <div className="h-14 bg-white border border-zinc-200/80 rounded-2xl" />

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="h-12 bg-zinc-100 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* 4. Loaded Content */}
      {!loading && !error && (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                Total
              </span>
              <span className="text-2xl font-extrabold text-zinc-950">
                {stats.total}
              </span>
            </div>
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                Applied
              </span>
              <span className="text-2xl font-extrabold text-zinc-700">
                {stats.applied}
              </span>
            </div>
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 block mb-1">
                Evaluated
              </span>
              <span className="text-2xl font-extrabold text-amber-900">
                {stats.evaluated}
              </span>
            </div>
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 block mb-1">
                Submitted
              </span>
              <span className="text-2xl font-extrabold text-blue-900">
                {stats.submitted}
              </span>
            </div>
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 block mb-1">
                Accepted
              </span>
              <span className="text-2xl font-extrabold text-emerald-900">
                {stats.accepted}
              </span>
            </div>
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 block mb-1">
                Rejected
              </span>
              <span className="text-2xl font-extrabold text-rose-900">
                {stats.rejected}
              </span>
            </div>
          </div>

          {/* Search, Status & Job Filter Controls */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search candidates by name, email, phone, or job title..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 bg-white placeholder-zinc-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-950"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Job Filter Dropdown */}
              <div className="w-full md:w-64">
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 font-medium"
                >
                  <option value="ALL">All Jobs ({jobs.length})</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {[
                  { label: 'All', value: 'ALL', count: stats.total },
                  { label: 'Applied', value: 'APPLIED', count: stats.applied },
                  {
                    label: 'Evaluated',
                    value: 'EVALUATED',
                    count: stats.evaluated,
                  },
                  {
                    label: 'Submitted',
                    value: 'SUBMITTED_TO_COMPANY',
                    count: stats.submitted,
                  },
                  {
                    label: 'Accepted',
                    value: 'ACCEPTED',
                    count: stats.accepted,
                  },
                  {
                    label: 'Rejected',
                    value: 'REJECTED',
                    count: stats.rejected,
                  },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === tab.value
                        ? 'bg-zinc-950 text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setJobFilter('ALL');
                  }}
                  className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Empty State: No candidates in database */}
          {candidates.length === 0 ? (
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-16 h-16 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-200 shadow-xs">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-zinc-950 mb-1">
                No candidates yet.
              </h2>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
                Add your first candidate to start screening and comparing against job requirements.
              </p>
              <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </div>
          ) : filteredCandidates.length === 0 ? (
            /* Empty State: Filter/search has zero results */
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-10 text-center shadow-xs">
              <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">
                No candidates match your filters.
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                Try clearing your search query or selecting a different status/job.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setJobFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table with Clean, Non-Overlapping Layout */}
              <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
                <table className="w-full min-w-[900px] text-left text-sm divide-y divide-zinc-200">
                  <thead className="bg-zinc-50/90 text-xs font-semibold uppercase tracking-wider text-zinc-500 select-none">
                    <tr>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[220px]">Candidate</th>
                      <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Job Requisition</th>
                      <th className="px-4 py-3.5 whitespace-nowrap min-w-[160px]">Tech Lead</th>
                      <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Status & Match</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[270px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredCandidates.map((candidate) => {
                      return (
                        <tr
                          key={candidate.id}
                          className="hover:bg-zinc-50/70 transition-colors group"
                        >
                          <td className="px-5 py-4 min-w-[220px]">
                            <Link
                              href={`/hr/candidates/${candidate.id}`}
                              className="font-bold text-zinc-950 hover:text-indigo-600 transition-colors block truncate max-w-[220px]"
                              title={candidate.name}
                            >
                              {candidate.name}
                            </Link>
                            <div className="text-xs text-zinc-500 truncate max-w-[220px] mt-0.5" title={candidate.email}>
                              {candidate.email}
                            </div>
                            {candidate.phone && (
                              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                {candidate.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 min-w-[180px]">
                            <span className="font-semibold text-zinc-800 block truncate max-w-[180px]" title={candidate.job?.title || 'General'}>
                              {candidate.job?.title || 'General'}
                            </span>
                            {candidate.job?.department && (
                              <span className="text-xs text-zinc-400 block mt-0.5 truncate max-w-[180px]">
                                {candidate.job.department}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-xs min-w-[160px]">
                            {candidate.tech_lead ? (
                              <div>
                                <span className="font-semibold text-zinc-900 block truncate max-w-[160px]" title={candidate.tech_lead.name}>
                                  {candidate.tech_lead.name}
                                </span>
                                <span className="text-zinc-400 block truncate max-w-[160px] mt-0.5" title={candidate.tech_lead.email}>
                                  {candidate.tech_lead.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-4 min-w-[150px]">
                            <div>
                              <Badge status={candidate.status}>
                                {getStatusDisplay(candidate.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {candidate.match_percentage !== null &&
                              candidate.match_percentage !== undefined ? (
                                <span
                                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold border ${getMatchScoreBadge(
                                    candidate.match_percentage,
                                  )}`}
                                >
                                  {candidate.match_percentage}% Match
                                </span>
                              ) : null}
                              {candidate.interview_score !== null &&
                              candidate.interview_score !== undefined ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                  ★ {Number(candidate.interview_score).toFixed(1)}/5
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap min-w-[270px]">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <Link href={`/hr/candidates/${candidate.id}`}>
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  className="text-xs font-medium px-2 py-1"
                                >
                                  View
                                </Button>
                              </Link>
                              <Link
                                href={`/hr/candidates/${candidate.id}/screening`}
                              >
                                <Button
                                  variant="primary"
                                  size="xs"
                                  className="text-xs font-medium px-2 py-1"
                                >
                                  Evaluate
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setCandidateForMail(candidate)}
                                className="text-xs font-medium px-2 py-1 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center gap-1"
                                title="Send interview invitation email to Tech Lead"
                              >
                                <Mail className="w-3 h-3 text-indigo-500" />
                                <span>Send Mail</span>
                              </Button>
                              <button
                                onClick={() => setCandidateToEdit(candidate)}
                                className="p-1 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-colors"
                                title="Edit Candidate"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setCandidateToDelete(candidate)}
                                className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Candidate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {filteredCandidates.map((candidate) => {
                  return (
                    <div
                      key={candidate.id}
                      className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/hr/candidates/${candidate.id}`}
                            className="font-bold text-base text-zinc-950 hover:text-zinc-700 transition-colors"
                          >
                            {candidate.name}
                          </Link>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {candidate.email}
                          </div>
                          {candidate.phone && (
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">
                              {candidate.phone}
                            </div>
                          )}
                        </div>
                        <Badge status={candidate.status}>
                          {getStatusDisplay(candidate.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                        <div className="text-zinc-500">
                          Job: <span className="font-semibold text-zinc-800">{candidate.job?.title || 'General'}</span>
                        </div>
                        {candidate.match_percentage !== null && candidate.match_percentage !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getMatchScoreBadge(candidate.match_percentage)}`}>
                            {candidate.match_percentage}% Match
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Tech Lead:</span>
                        <span className="font-medium text-zinc-900">
                          {candidate.tech_lead ? candidate.tech_lead.name : 'Unassigned'}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 flex-wrap">
                        <Link href={`/hr/candidates/${candidate.id}`} className="flex-1 min-w-[65px]">
                          <Button variant="secondary" size="sm" className="w-full">
                            View
                          </Button>
                        </Link>
                        <Link
                          href={`/hr/candidates/${candidate.id}/screening`}
                          className="flex-1 min-w-[75px]"
                        >
                          <Button variant="primary" size="sm" className="w-full">
                            Evaluate
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCandidateForMail(candidate)}
                          className="flex-1 min-w-[95px] flex items-center justify-center gap-1.5 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                        >
                          <Mail className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Send Mail</span>
                        </Button>
                        <button
                          onClick={() => setCandidateToEdit(candidate)}
                          className="p-2 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
                          title="Edit Candidate"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCandidateToDelete(candidate)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-zinc-200"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

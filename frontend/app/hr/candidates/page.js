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
  Zap,
  Lock,
  LayoutList,
  LayoutGrid,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Briefcase,
  ChevronRight,
  ShieldCheck,
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

  // Instant render from cache if available
  const [candidates, setCandidates] = useState(() => {
    return candidateService.getCachedCandidatesWithScreening() || [];
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(() => {
    return !(candidateService.getCachedCandidatesWithScreening()?.length > 0);
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search, Filter & View state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'STAGE_2_READY' | 'APPLIED' | 'EVALUATED' | 'SUBMITTED_TO_COMPANY' | 'ACCEPTED' | 'REJECTED'
  const [jobFilter, setJobFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState(null);
  const [candidateForMail, setCandidateForMail] = useState(null);
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
      if (urlParams.get('status') === 'stage2') {
        setStatusFilter('STAGE_2_READY');
      }
    }
  }, [fetchData]);

  // Derived statistics from live database records
  const stats = useMemo(() => {
    const total = candidates.length;
    const stage2Ready = candidates.filter((c) => {
      const match = Number(c.ai_match_percentage ?? c.match_percentage ?? 0);
      return match >= 80;
    }).length;
    const applied = candidates.filter((c) => c.status === 'APPLIED').length;
    const evaluated = candidates.filter((c) => c.status === 'EVALUATED').length;
    const submitted = candidates.filter(
      (c) => c.status === 'SUBMITTED_TO_COMPANY'
    ).length;
    const accepted = candidates.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = candidates.filter((c) => c.status === 'REJECTED').length;

    return { total, stage2Ready, applied, evaluated, submitted, accepted, rejected };
  }, [candidates]);

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      // 1. Stage 2 Ready Quick Filter vs Status Filter
      if (statusFilter === 'STAGE_2_READY') {
        const match = Number(candidate.ai_match_percentage ?? candidate.match_percentage ?? 0);
        if (match < 80) return false;
      } else if (statusFilter !== 'ALL' && candidate.status !== statusFilter) {
        return false;
      }

      // 2. Job Filter
      if (jobFilter !== 'ALL' && String(candidate.job_id) !== String(jobFilter)) {
        return false;
      }

      // 3. Search query (name, email, phone, job title, reviewer)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = candidate.name?.toLowerCase().includes(query);
        const emailMatch = candidate.email?.toLowerCase().includes(query);
        const phoneMatch = candidate.phone?.toLowerCase().includes(query);
        const jobMatch = candidate.job?.title?.toLowerCase().includes(query);
        const interviewerMatch = candidate.interviewer_email?.toLowerCase().includes(query);
        return nameMatch || emailMatch || phoneMatch || jobMatch || interviewerMatch;
      }

      return true;
    });
  }, [candidates, searchTerm, statusFilter, jobFilter]);

  // Status display label
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'SUBMITTED_TO_COMPANY':
        return 'Submitted';
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
    if (val >= 80) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    } else if (val >= 60) {
      return 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
    } else if (val >= 40) {
      return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
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
      const msg = err.response?.data?.message || 'Failed to delete candidate.';
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12 text-slate-900">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <Modal
          isOpen={true}
          title="Delete candidate?"
          message={`Are you sure you want to delete ${candidateToDelete.name}? This will permanently remove their application record.`}
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

      {/* Edit Candidate Modal */}
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

      {/* Send Mail Modal (Stage 2 Technical Interview Invitation) */}
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

      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Talent Pool
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.total} Applicants in System
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Candidate Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review applicant resumes, automated JD match ratings, and dispatch Stage 2 interview invites.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#0B132B] hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
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
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Unable to load candidates
          </h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => fetchData(true)}
            className="inline-flex items-center gap-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 3. Simple Loading State */}
      {loading && !error && (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Loading candidate pipeline...
          </p>
        </div>
      )}

      {/* 4. Loaded Content */}
      {!loading && !error && (
        <>
          {/* Executive Stage Pipeline Ribbon (Interactive Tabs) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Tab: All */}
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900/10'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                All Talent
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats.total}
              </span>
            </button>

            {/* Tab: Stage 2 Ready (Highlight!) */}
            <button
              onClick={() => setStatusFilter('STAGE_2_READY')}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                statusFilter === 'STAGE_2_READY'
                  ? 'bg-blue-50 border-blue-600 shadow-md ring-2 ring-blue-600/20'
                  : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-200/80 hover:border-blue-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                  Stage 2 Ready
                </span>
                <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />
              </div>
              <span className="text-2xl font-black text-blue-900 mt-0.5 block">
                {stats.stage2Ready}
              </span>
              <span className="text-[10px] text-blue-700 font-semibold block truncate">
                ≥80% Match
              </span>
            </button>

            {/* Tab: Applied */}
            <button
              onClick={() => setStatusFilter('APPLIED')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                statusFilter === 'APPLIED'
                  ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900/10'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Applied
              </span>
              <span className="text-2xl font-black text-slate-700 mt-0.5 block">
                {stats.applied}
              </span>
            </button>

            {/* Tab: Evaluated */}
            <button
              onClick={() => setStatusFilter('EVALUATED')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                statusFilter === 'EVALUATED'
                  ? 'bg-white border-purple-600 shadow-md ring-1 ring-purple-600/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
                Evaluated
              </span>
              <span className="text-2xl font-black text-purple-900 mt-0.5 block">
                {stats.evaluated}
              </span>
            </button>

            {/* Tab: Submitted */}
            <button
              onClick={() => setStatusFilter('SUBMITTED_TO_COMPANY')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                statusFilter === 'SUBMITTED_TO_COMPANY'
                  ? 'bg-white border-blue-600 shadow-md ring-1 ring-blue-600/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                Submitted
              </span>
              <span className="text-2xl font-black text-blue-900 mt-0.5 block">
                {stats.submitted}
              </span>
            </button>

            {/* Tab: Accepted */}
            <button
              onClick={() => setStatusFilter('ACCEPTED')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                statusFilter === 'ACCEPTED'
                  ? 'bg-white border-emerald-600 shadow-md ring-1 ring-emerald-600/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                Accepted
              </span>
              <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
                {stats.accepted}
              </span>
            </button>

            {/* Tab: Rejected */}
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-white border-rose-600 shadow-md ring-1 ring-rose-600/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                Rejected
              </span>
              <span className="text-2xl font-black text-rose-900 mt-0.5 block">
                {stats.rejected}
              </span>
            </button>
          </div>

          {/* Search, Filter & View Mode Toolbar */}
          <div className="exec-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by candidate name, email, phone, or title..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 bg-white text-slate-800 font-semibold shadow-xs cursor-pointer"
                >
                  <option value="ALL">All Requisitions ({jobs.length})</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} {j.department ? `(${j.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle: Table vs Cards */}
              <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-end md:self-auto">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Table View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grid Dossier View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Filter Clear Tag */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Showing {filteredCandidates.length} of {candidates.length} candidates
                </span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setJobFilter('ALL');
                  }}
                  className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Empty State: No candidates in database */}
          {candidates.length === 0 ? (
            <div className="exec-card p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-xs">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                No candidates registered yet.
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Add applicant profiles or upload resumes to start AI screening and JD match comparison.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-[#0B132B] hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Candidate</span>
              </Button>
            </div>
          ) : filteredCandidates.length === 0 ? (
            /* Empty State: Filter/search has zero results */
            <div className="exec-card p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No candidates match your filters.
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Try clearing your search query or switching your status/job selection.
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
          ) : viewMode === 'grid' ? (
            /* ========================================================================= */
            /* 4A. GRID CARD VIEW (Candidate Dossier Cards)                              */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCandidates.map((candidate) => {
                const matchPct = Number(
                  candidate.ai_match_percentage ?? candidate.match_percentage ?? 0
                );
                const isStage2 = matchPct >= 80;
                const initials = candidate.name
                  ? candidate.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'C';

                return (
                  <div
                    key={candidate.id}
                    className="exec-card p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Card Header: Avatar, Name & Match Badge */}
                      <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-[#0B132B] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/hr/candidates/${candidate.id}`}
                              className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate block"
                              title={candidate.name}
                            >
                              {candidate.name}
                            </Link>
                            <p className="text-xs text-slate-500 truncate" title={candidate.email}>
                              {candidate.email}
                            </p>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${getMatchScoreBadge(
                              matchPct
                            )}`}
                          >
                            {isStage2 && <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />}
                            <span>{matchPct}% Match</span>
                          </span>
                        </div>
                      </div>

                      {/* Position & Stage Info */}
                      <div className="mt-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500">Position:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[170px]">
                            {candidate.job?.title || 'General Position'}
                          </span>
                        </div>

                        {candidate.job?.department && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Department:</span>
                            <span className="text-slate-700 font-medium">
                              {candidate.job.department}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-500">Stage Status:</span>
                          <Badge status={candidate.status}>
                            {getStatusDisplay(candidate.status)}
                          </Badge>
                        </div>

                        {/* Interviewer assignment info */}
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-slate-500">Reviewer:</span>
                          {candidate.interviewer_email ? (
                            <span className="font-mono text-slate-700 truncate max-w-[150px]" title={candidate.interviewer_email}>
                              {candidate.interviewer_email}
                            </span>
                          ) : isStage2 ? (
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Ready for Interview
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pre-Screening</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* Send Mail Action (Prominent if Stage 2 Ready!) */}
                      {isStage2 ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setCandidateForMail(candidate)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-xl shadow-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send Mail</span>
                        </Button>
                      ) : (
                        <span
                          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 py-1.5 px-2 rounded-xl border border-slate-200 cursor-not-allowed"
                          title="Candidate requires ≥80% match to unlock interview invitation"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Locked (&lt;80%)</span>
                        </span>
                      )}

                      {/* View Button */}
                      <Link href={`/hr/candidates/${candidate.id}`}>
                        <Button variant="outline" size="sm" className="text-xs py-2 px-2.5">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>

                      {/* Edit Button */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCandidateToEdit(candidate)}
                        className="text-xs py-2 px-2.5"
                        title="Edit Candidate"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCandidateToDelete(candidate)}
                        className="text-xs py-2 px-2.5 text-rose-600 hover:bg-rose-50"
                        title="Delete Candidate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* 4B. TABLE VIEW (Default)                                                  */
            /* ========================================================================= */
            <div className="exec-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm divide-y divide-slate-100">
                  <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none border-b border-slate-200/80">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap min-w-[240px]">Candidate</th>
                      <th className="px-5 py-4 whitespace-nowrap min-w-[170px]">Position</th>
                      <th className="px-4 py-4 whitespace-nowrap min-w-[140px] text-center">AI JD Match</th>
                      <th className="px-5 py-4 whitespace-nowrap min-w-[160px]">Assigned Reviewer</th>
                      <th className="px-4 py-4 whitespace-nowrap min-w-[120px]">Status</th>
                      <th className="px-6 py-4 whitespace-nowrap min-w-[240px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCandidates.map((candidate) => {
                      const matchPct = Number(
                        candidate.ai_match_percentage ?? candidate.match_percentage ?? 0
                      );
                      const isStage2 = matchPct >= 80;
                      const initials = candidate.name
                        ? candidate.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'C';

                      return (
                        <tr
                          key={candidate.id}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Candidate Name & Contact */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-[#0B132B] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/hr/candidates/${candidate.id}`}
                                  className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block truncate max-w-[200px]"
                                  title={candidate.name}
                                >
                                  {candidate.name}
                                </Link>
                                <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5 font-medium" title={candidate.email}>
                                  {candidate.email}
                                </p>
                                {candidate.phone && (
                                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {candidate.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Position & Department */}
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-800 block truncate max-w-[180px]" title={candidate.job?.title || 'General'}>
                              {candidate.job?.title || 'General Position'}
                            </span>
                            {candidate.job?.department && (
                              <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                                {candidate.job.department}
                              </span>
                            )}
                          </td>

                          {/* AI JD Match Score Badge */}
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${getMatchScoreBadge(
                                matchPct
                              )}`}
                            >
                              {isStage2 && <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />}
                              <span>{matchPct}%</span>
                            </span>
                            {isStage2 && (
                              <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                                Stage 2 Ready
                              </span>
                            )}
                          </td>

                          {/* Reviewer / Interviewer */}
                          <td className="px-5 py-4 text-xs">
                            {candidate.interviewer_email ? (
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  Interviewer
                                </span>
                                <span className="text-slate-500 block truncate max-w-[150px] font-mono mt-0.5" title={candidate.interviewer_email}>
                                  {candidate.interviewer_email}
                                </span>
                              </div>
                            ) : isStage2 ? (
                              <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 text-xs">
                                Ready to Invite
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                Pre-Screening (&lt;80%)
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-4">
                            <Badge status={candidate.status}>
                              {getStatusDisplay(candidate.status)}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Send Mail Button (If Stage 2 Qualified >=80%) */}
                              {isStage2 ? (
                                <button
                                  onClick={() => setCandidateForMail(candidate)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all"
                                  title="Dispatch Technical Interview Invitation"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Send Mail</span>
                                </button>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                                  title="Unlocks when candidate achieves ≥80% JD match"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>&lt;80%</span>
                                </span>
                              )}

                              {/* View Profile */}
                              <Link href={`/hr/candidates/${candidate.id}`}>
                                <button
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="View Candidate Dossier"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </Link>

                              {/* Edit */}
                              <button
                                onClick={() => setCandidateToEdit(candidate)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                                title="Edit Candidate"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setCandidateToDelete(candidate)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Candidate"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Search,
  X,
  Eye,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  Filter,
  CheckCircle2,
  Mail,
  LayoutList,
  LayoutGrid,
  ArrowUpRight,
  Sparkles,
  Users,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import jobService from '@/services/jobService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function HrJobsPage() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'CLOSED'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Action modals state
  const [activeModal, setActiveModal] = useState(null); // { type: 'CLOSE' | 'REOPEN' | 'DELETE', job }
  const [actionLoading, setActionLoading] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null); // { message, type }

  // Load jobs from backend
  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await jobService.getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError('Unable to load jobs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    fetchJobs();
  }, [fetchJobs]);

  // Derived statistics from real backend data
  const stats = useMemo(() => {
    const total = jobs.length;
    const open = jobs.filter((j) => j.status === 'OPEN').length;
    const closed = jobs.filter((j) => j.status === 'CLOSED').length;
    return { total, open, closed };
  }, [jobs]);

  // Filtered jobs based on search query and status filter
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && job.status !== statusFilter) {
        return false;
      }

      // 2. Search query (title, department, location)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = job.title?.toLowerCase().includes(query);
        const deptMatch = job.department?.toLowerCase().includes(query);
        const locMatch = job.location?.toLowerCase().includes(query);
        return titleMatch || deptMatch || locMatch;
      }

      return true;
    });
  }, [jobs, searchTerm, statusFilter]);

  // Parse comma-separated skills into array
  const parseSkills = (skillsString) => {
    if (!skillsString) return [];
    return skillsString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Handle Close / Reopen
  const handleToggleStatus = async () => {
    if (!activeModal?.job) return;
    setActionLoading(true);

    const targetStatus = activeModal.type === 'CLOSE' ? 'CLOSED' : 'OPEN';
    try {
      await jobService.updateJob(
        activeModal.job.id,
        { status: targetStatus },
        user?.id,
      );
      setToast({
        message: `Job '${activeModal.job.title}' ${
          targetStatus === 'CLOSED' ? 'closed' : 'reopened'
        } successfully.`,
        type: 'success',
      });
      setActiveModal(null);
      await fetchJobs(true);
    } catch (err) {
      console.error('Failed to update job status:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to update job status.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDeleteJob = async () => {
    if (!activeModal?.job) return;
    setActionLoading(true);

    try {
      await jobService.deleteJob(activeModal.job.id, user?.id);
      setToast({
        message: 'Job deleted successfully.',
        type: 'success',
      });
      setActiveModal(null);
      await fetchJobs(true);
    } catch (err) {
      console.error('Failed to delete job:', err);
      const msg =
        err.response?.data?.message ||
        'This job cannot be deleted because candidates are associated with it.';
      setToast({
        message: msg,
        type: 'error',
      });
      setActiveModal(null);
    } finally {
      setActionLoading(false);
    }
  };

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

      {/* Confirmation Modals */}
      {activeModal?.type === 'CLOSE' && (
        <Modal
          isOpen={true}
          title="Close this job?"
          message={`Candidates can no longer be added to '${activeModal.job?.title}'. Are you sure you want to close it?`}
          confirmText="Close Job"
          confirmVariant="primary"
          isLoading={actionLoading}
          onConfirm={handleToggleStatus}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === 'REOPEN' && (
        <Modal
          isOpen={true}
          title="Reopen this job?"
          message={`This will mark '${activeModal.job?.title}' as OPEN and allow new candidates to be registered.`}
          confirmText="Reopen Job"
          confirmVariant="primary"
          isLoading={actionLoading}
          onConfirm={handleToggleStatus}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === 'DELETE' && (
        <Modal
          isOpen={true}
          title="Delete this job?"
          message={`Are you sure you want to delete '${activeModal.job?.title}'? This action cannot be undone.`}
          confirmText="Delete Job"
          confirmVariant="danger"
          isLoading={actionLoading}
          onConfirm={handleDeleteJob}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Requisitions
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.open} Open Roles
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Job Requisitions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage open positions, configure requirements, and review talent matches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/hr/jobs/create">
            <Button
              variant="primary"
              className="flex items-center gap-2 bg-[#0B132B] hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Unable to load jobs
          </h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => fetchJobs()}
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
            Loading requisitions...
          </p>
        </div>
      )}

      {/* 4. Loaded Content */}
      {!loading && !error && (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Total Jobs */}
            <div className="exec-card p-5 flex items-center justify-between hover:border-slate-300 transition-all">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Requisitions
                </span>
                <span className="text-3xl font-black text-slate-900 tracking-tight mt-1 block">
                  {stats.total}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                  All created roles
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            {/* Active / Open Jobs */}
            <div className="exec-card p-5 flex items-center justify-between hover:border-emerald-300 bg-gradient-to-br from-white to-emerald-50/30 border-emerald-200/70 transition-all">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Active Openings
                </span>
                <span className="text-3xl font-black text-emerald-950 tracking-tight mt-1 block">
                  {stats.open}
                </span>
                <span className="text-xs text-emerald-700 mt-0.5 block font-semibold">
                  Receiving candidate applications
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Closed / Filled Jobs */}
            <div className="exec-card p-5 flex items-center justify-between hover:border-slate-300 transition-all">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Archived / Closed
                </span>
                <span className="text-3xl font-black text-slate-900 tracking-tight mt-1 block">
                  {stats.closed}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                  Positions filled or paused
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search, Filter & View Mode Controls Toolbar */}
          <div className="exec-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by job title, department, or location..."
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

              {/* View Mode Toggle & Status Filter */}
              <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
                {/* Status Segmented Filter Pills */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    onClick={() => setStatusFilter('OPEN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'OPEN'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Open ({stats.open})
                  </button>
                  <button
                    onClick={() => setStatusFilter('CLOSED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'CLOSED'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Closed ({stats.closed})
                  </button>
                </div>

                {/* View Mode: Table vs Grid Toggle */}
                <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
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
                    title="Grid Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Empty State: No jobs in database */}
          {jobs.length === 0 ? (
            <div className="exec-card p-12 text-center">
              <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-xs">
                <Briefcase className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                No job requisitions created yet.
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Create your first position to start receiving applicants and activating automated JD matching.
              </p>
              <Link href="/hr/jobs/create">
                <Button
                  variant="primary"
                  size="sm"
                  className="inline-flex items-center gap-2 bg-[#0B132B] hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Requisition</span>
                </Button>
              </Link>
            </div>
          ) : filteredJobs.length === 0 ? (
            /* Empty State: Filter/search has zero results */
            <div className="exec-card p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No jobs match your search.
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Try adjusting your search keywords or switching your status filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ========================================================================= */
            /* 4A. GRID CARD VIEW                                                        */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredJobs.map((job) => {
                const skills = parseSkills(job.required_skills);
                return (
                  <div
                    key={job.id}
                    className="exec-card p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Top Bar with Badge & Actions */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-md">
                          {job.department || 'General'}
                        </span>
                        <Badge status={job.status}>{job.status}</Badge>
                      </div>

                      {/* Title & Email */}
                      <div className="mt-3">
                        <Link
                          href={`/hr/jobs/${job.id}`}
                          className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors block"
                        >
                          {job.title}
                        </Link>
                        {job.contact_email && (
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] font-mono text-blue-700 bg-blue-50/90 border border-blue-200/70 px-2 py-0.5 rounded-md w-fit">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px] font-medium">{job.contact_email}</span>
                          </div>
                        )}
                      </div>

                      {/* Location & Experience */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {job.location || 'Remote'}
                        </span>
                        <span>•</span>
                        <span>{job.experience_required || 'Not specified'}</span>
                      </div>

                      {/* Skills Chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {skills.slice(0, 4).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                          >
                            {skill}
                          </span>
                        ))}
                        {skills.length > 4 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200">
                            +{skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatDate(job.created_at)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/hr/jobs/${job.id}`}>
                          <button
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Requisition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={`/hr/jobs/${job.id}/edit`}>
                          <button
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Requisition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Link>
                        {job.status === 'OPEN' ? (
                          <button
                            onClick={() => setActiveModal({ type: 'CLOSE', job })}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Close Requisition"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveModal({ type: 'REOPEN', job })}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Reopen Requisition"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setActiveModal({ type: 'DELETE', job })}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Requisition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                      <th className="px-6 py-4 whitespace-nowrap min-w-[200px]">Position</th>
                      <th className="px-5 py-4 whitespace-nowrap min-w-[130px]">Department</th>
                      <th className="px-5 py-4 whitespace-nowrap min-w-[130px]">Location</th>
                      <th className="px-5 py-4 whitespace-nowrap min-w-[120px]">Experience</th>
                      <th className="px-5 py-4 whitespace-nowrap min-w-[180px]">Required Skills</th>
                      <th className="px-4 py-4 whitespace-nowrap min-w-[100px]">Status</th>
                      <th className="px-4 py-4 whitespace-nowrap min-w-[110px]">Created</th>
                      <th className="px-6 py-4 whitespace-nowrap min-w-[160px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredJobs.map((job) => {
                      const skills = parseSkills(job.required_skills);
                      return (
                        <tr
                          key={job.id}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Position Title & Contact Email */}
                          <td className="px-6 py-4">
                            <Link
                              href={`/hr/jobs/${job.id}`}
                              className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block text-sm"
                            >
                              {job.title}
                            </Link>
                            {job.contact_email && (
                              <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-blue-700 bg-blue-50/90 border border-blue-200/70 px-2 py-0.5 rounded-md w-fit">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[180px] font-medium">{job.contact_email}</span>
                              </div>
                            )}
                          </td>

                          {/* Department */}
                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-700 text-xs px-2.5 py-1 rounded-lg bg-slate-100">
                              {job.department || 'General'}
                            </span>
                          </td>

                          {/* Location */}
                          <td className="px-5 py-4 text-slate-600 text-xs font-medium">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{job.location || 'Remote'}</span>
                            </div>
                          </td>

                          {/* Experience */}
                          <td className="px-5 py-4 text-slate-600 text-xs">
                            {job.experience_required || 'Not specified'}
                          </td>

                          {/* Skills */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {skills.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                                >
                                  {skill}
                                </span>
                              ))}
                              {skills.length > 3 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200">
                                  +{skills.length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <Badge status={job.status}>{job.status}</Badge>
                          </td>

                          {/* Created Date */}
                          <td className="px-4 py-4 text-slate-500 text-xs font-mono">
                            {formatDate(job.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/hr/jobs/${job.id}`}>
                                <button
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </Link>
                              <Link href={`/hr/jobs/${job.id}/edit`}>
                                <button
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                                  title="Edit Job"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Link>
                              {job.status === 'OPEN' ? (
                                <button
                                  onClick={() =>
                                    setActiveModal({ type: 'CLOSE', job })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                  title="Close Job"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    setActiveModal({ type: 'REOPEN', job })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Reopen Job"
                                >
                                  <Unlock className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setActiveModal({ type: 'DELETE', job })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Job"
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

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
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
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
    <div className="space-y-8">
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

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Jobs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your open positions and job descriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/hr/jobs/create">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>+ Create Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 mb-1">
            Unable to load jobs
          </h2>
          <p className="text-sm text-zinc-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => fetchJobs()}
            className="inline-flex items-center gap-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 3. Loading Skeletons */}
      {loading && !error && (
        <div className="space-y-8 animate-pulse">
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4"
              >
                <div className="h-4 bg-zinc-200 rounded w-24" />
                <div className="h-8 bg-zinc-200 rounded w-16" />
              </div>
            ))}
          </div>

          {/* Search/Filter Skeleton */}
          <div className="h-12 bg-zinc-200 rounded-2xl w-full" />

          {/* Table Skeleton */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-12 bg-zinc-100 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* 4. Loaded Content */}
      {!loading && !error && (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              icon={Briefcase}
              label="Total Jobs"
              value={stats.total}
              description="All requisitions created"
            />
            <StatCard
              icon={Briefcase}
              label="Open Jobs"
              value={stats.open}
              description="Actively accepting applicants"
            />
            <StatCard
              icon={Lock}
              label="Closed Jobs"
              value={stats.closed}
              description="Archived or filled positions"
            />
          </div>

          {/* Search and Status Filter Controls */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search jobs by title, department or location..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white"
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

            {/* Status Segmented Filter */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl w-full sm:w-auto justify-center">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('OPEN')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'OPEN'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Open ({stats.open})
              </button>
              <button
                onClick={() => setStatusFilter('CLOSED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'CLOSED'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Closed ({stats.closed})
              </button>
            </div>
          </div>

          {/* Empty State: No jobs in database */}
          {jobs.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-16 h-16 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-200 shadow-xs">
                <Briefcase className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-zinc-950 mb-1">
                No jobs have been created yet.
              </h2>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
                Create your first job to start recruiting candidates and matching job descriptions.
              </p>
              <Link href="/hr/jobs/create">
                <Button variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            </div>
          ) : filteredJobs.length === 0 ? (
            /* Empty State: Filter/search has zero results */
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center shadow-xs">
              <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">
                No jobs match your search.
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
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
          ) : (
            <>
              {/* Desktop & Tablet Table */}
              <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
                <table className="w-full min-w-[960px] text-left text-sm divide-y divide-zinc-200">
                  <thead className="bg-zinc-50/90 text-xs font-semibold uppercase tracking-wider text-zinc-500 select-none">
                    <tr>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[180px]">Job Title</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[140px]">Department</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[120px]">Location</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[110px]">Experience</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[160px]">Required Skills</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[100px]">Status</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[110px]">Created</th>
                      <th className="px-5 py-3.5 whitespace-nowrap min-w-[150px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredJobs.map((job) => {
                      const skills = parseSkills(job.required_skills);
                      return (
                        <tr
                          key={job.id}
                          className="hover:bg-zinc-50/70 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-zinc-950">
                            <Link
                              href={`/hr/jobs/${job.id}`}
                              className="hover:text-zinc-600 transition-colors"
                            >
                              {job.title}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-zinc-600 font-medium">
                            {job.department}
                          </td>
                          <td className="px-6 py-4 text-zinc-500">
                            {job.location}
                          </td>
                          <td className="px-6 py-4 text-zinc-500">
                            {job.experience_required}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {skills.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                                >
                                  {skill}
                                </span>
                              ))}
                              {skills.length > 3 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[11px] font-medium text-zinc-400">
                                  +{skills.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge status={job.status}>{job.status}</Badge>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 text-xs">
                            {formatDate(job.created_at)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/hr/jobs/${job.id}`}>
                                <button
                                  className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </Link>
                              <Link href={`/hr/jobs/${job.id}/edit`}>
                                <button
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Close Job"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    setActiveModal({ type: 'REOPEN', job })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Reopen Job"
                                >
                                  <Unlock className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setActiveModal({ type: 'DELETE', job })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-4">
                {filteredJobs.map((job) => {
                  const skills = parseSkills(job.required_skills);
                  return (
                    <div
                      key={job.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/hr/jobs/${job.id}`}
                            className="text-base font-bold text-slate-900 hover:text-brand-600 transition-colors"
                          >
                            {job.title}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {job.department}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {job.location}
                            </span>
                          </div>
                        </div>
                        <Badge status={job.status}>{job.status}</Badge>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          <span className="font-semibold text-slate-500">
                            Experience:
                          </span>{' '}
                          {job.experience_required}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(job.created_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link href={`/hr/jobs/${job.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link href={`/hr/jobs/${job.id}/edit`}>
                            <Button variant="secondary" size="sm">
                              Edit
                            </Button>
                          </Link>
                          {job.status === 'OPEN' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setActiveModal({ type: 'CLOSE', job })
                              }
                            >
                              Close
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setActiveModal({ type: 'REOPEN', job })
                              }
                            >
                              Reopen
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setActiveModal({ type: 'DELETE', job })
                            }
                            className="text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </Button>
                        </div>
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

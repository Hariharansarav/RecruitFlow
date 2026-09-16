'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  User,
  Calendar,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import jobService from '@/services/jobService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function JobDetailsPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const jobId = unwrappedParams.id;

  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & Toast states
  const [activeModal, setActiveModal] = useState(null); // 'CLOSE' | 'REOPEN' | 'DELETE'
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobService.getJobById(jobId);
      setJob(data);
    } catch (err) {
      console.error('Failed to load job details:', err);
      if (err.response?.status === 404) {
        setError('Job not found.');
      } else {
        setError('Unable to load job details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    fetchJob();
  }, [fetchJob]);

  // Handle status toggle (Close or Reopen)
  const handleToggleStatus = async () => {
    if (!job) return;
    setActionLoading(true);
    const targetStatus = activeModal === 'CLOSE' ? 'CLOSED' : 'OPEN';

    try {
      const updated = await jobService.updateJob(
        job.id,
        { status: targetStatus },
        user?.id,
      );
      setJob(updated);
      setToast({
        message: `Job ${
          targetStatus === 'CLOSED' ? 'closed' : 'reopened'
        } successfully.`,
        type: 'success',
      });
      setActiveModal(null);
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

  // Handle delete
  const handleDelete = async () => {
    if (!job) return;
    setActionLoading(true);

    try {
      await jobService.deleteJob(job.id, user?.id);
      setToast({
        message: 'Job deleted successfully.',
        type: 'success',
      });
      setActiveModal(null);
      setTimeout(() => {
        router.push('/hr/jobs');
      }, 1000);
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

  const skillsList = job?.required_skills
    ? job.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirmation Modals */}
      {activeModal === 'CLOSE' && (
        <Modal
          isOpen={true}
          title="Close this job?"
          message="Candidates can no longer be added to a closed job. Are you sure you want to close this job?"
          confirmText="Close Job"
          confirmVariant="primary"
          isLoading={actionLoading}
          onConfirm={handleToggleStatus}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'REOPEN' && (
        <Modal
          isOpen={true}
          title="Reopen this job?"
          message="Reopening will change the status back to OPEN and allow new candidates to apply."
          confirmText="Reopen Job"
          confirmVariant="primary"
          isLoading={actionLoading}
          onConfirm={handleToggleStatus}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'DELETE' && (
        <Modal
          isOpen={true}
          title="Delete this job?"
          message="Are you sure you want to delete this job? If candidates are associated with it, deletion will be prevented."
          confirmText="Delete Job"
          confirmVariant="danger"
          isLoading={actionLoading}
          onConfirm={handleDelete}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/hr/jobs"
          className="hover:text-brand-600 transition-colors flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Jobs
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-xs">
          {job ? job.title : 'Job Details'}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">{error}</h2>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/hr/jobs">
              <Button variant="secondary">Back to Jobs</Button>
            </Link>
            <Button variant="primary" onClick={fetchJob}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-slate-200 rounded w-64" />
            <div className="h-6 bg-slate-200 rounded w-20" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded" />
            ))}
          </div>
          <div className="h-32 bg-slate-100 rounded-xl mt-6" />
        </div>
      )}

      {/* Main Job Details Card */}
      {!loading && !error && job && (
        <div className="space-y-6">
          {/* Top Card: Title, Status, Action Buttons */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {job.title}
                  </h1>
                  <Badge status={job.status}>{job.status}</Badge>
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <span>Requisition ID: #{job.id}</span>
                  <span>•</span>
                  <span>Posted by {job.creator?.name || 'HR Recruiter'}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-2.5">
                <Link href={`/hr/jobs/${job.id}/edit`}>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Job</span>
                  </Button>
                </Link>

                {job.status === 'OPEN' ? (
                  <Button
                    variant="outline"
                    onClick={() => setActiveModal('CLOSE')}
                    className="flex items-center gap-2 text-slate-700 hover:text-amber-700 hover:border-amber-300"
                  >
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Close Job</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setActiveModal('REOPEN')}
                    className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                  >
                    <Unlock className="w-4 h-4 text-emerald-500" />
                    <span>Reopen Job</span>
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => setActiveModal('DELETE')}
                  className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Department
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {job.department}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {job.location}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Experience
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {job.experience_required}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Posted Date
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(job.created_at)}
                </p>
              </div>
            </div>

            {/* Required Skills Badges */}
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Full Job Description */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Job Description
              </h2>
              <div className="prose max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/40 p-5 rounded-xl border border-slate-100">
                {job.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

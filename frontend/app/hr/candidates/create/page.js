'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, AlertCircle, Briefcase } from 'lucide-react';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import authService from '@/services/authService';

export default function CreateCandidatePage() {
  const router = useRouter();
  const [openJobs, setOpenJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Form fields strictly: Name, Email, Phone, Assign Job, Resume Link
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    resume_url: '',
    job_id: '',
  });

  // Errors & Status
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'HR') {
      router.replace('/login');
      return;
    }

    async function loadOpenJobs() {
      try {
        const allJobs = await jobService.getJobs();
        const available = allJobs.filter((j) => j.status === 'OPEN');
        setOpenJobs(available);
        if (available.length > 0) {
          setFormData((prev) => ({ ...prev, job_id: String(available[0].id) }));
        }
      } catch (err) {
        console.error('Failed to load open jobs:', err);
        setServerError('Unable to load open jobs list. Please try again.');
      } finally {
        setLoadingJobs(false);
      }
    }

    loadOpenJobs();
  }, [router]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateField = (name, value) => {
    const trimmed = (value || '').trim();
    switch (name) {
      case 'name':
        if (!trimmed) return 'Candidate name is required.';
        if (trimmed.length > 100) return 'Name cannot exceed 100 characters.';
        return '';
      case 'email':
        if (!trimmed) return 'Email address is required.';
        if (!validateEmail(trimmed)) return 'Please enter a valid email address.';
        if (trimmed.length > 150) return 'Email cannot exceed 150 characters.';
        return '';
      case 'phone':
        if (!trimmed) return 'Phone number is required.';
        if (trimmed.replace(/\D/g, '').length < 7) {
          return 'Please enter a valid phone number (minimum 7 digits).';
        }
        if (trimmed.length > 50) return 'Phone cannot exceed 50 characters.';
        return '';
      case 'resume_url':
        if (trimmed && trimmed.length > 500) {
          return 'Resume URL cannot exceed 500 characters.';
        }
        return '';
      case 'job_id':
        if (!trimmed) return 'Please select an open job.';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      const errorMsg = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const errorMsg = validateField(key, formData[key]);
      if (errorMsg) {
        newErrors[key] = errorMsg;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        resume_url: formData.resume_url.trim() || undefined,
        job_id: Number(formData.job_id),
      };

      await candidateService.createCandidate(payload);

      setToast({
        message: '✓ Candidate saved successfully.',
        type: 'success',
      });

      setTimeout(() => {
        router.push('/hr/candidates');
      }, 1000);
    } catch (err) {
      console.error('Failed to create candidate:', err);
      const msg = err.response?.data?.message;
      setServerError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Unable to save candidate. Please check input values.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <Link
          href="/hr/candidates"
          className="hover:text-black transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Candidates
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-semibold">Add Candidate</span>
      </div>

      {/* Header */}
      <div className="pb-4 border-b border-zinc-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
          Add Candidate
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Add a candidate to an open job requisition. Skills will be automatically loaded from the Job Description during evaluation.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-zinc-400" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Warning if no open jobs available */}
      {!loadingJobs && openJobs.length === 0 && (
        <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-200 text-zinc-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base">
            <Briefcase className="w-5 h-5 text-zinc-700" />
            <span>No open jobs available</span>
          </div>
          <p className="text-sm text-zinc-600">
            You must create an open job before adding candidates. Closed jobs cannot accept new applicants.
          </p>
          <div>
            <Link href="/hr/jobs/create">
              <Button variant="primary" size="sm">
                Create Open Job
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Candidate Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-zinc-200/80 rounded-3xl shadow-xs p-6 sm:p-8 space-y-6"
      >
        {/* Row 1: Name & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
            >
              Candidate Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              maxLength={100}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-zinc-200 focus:border-black focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
              }`}
            />
            {errors.name && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
            >
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john@example.com"
              maxLength={150}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.email
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-zinc-200 focus:border-black focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
              }`}
            />
            {errors.email && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.email}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Phone & Job Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
            >
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              maxLength={50}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.phone
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-zinc-200 focus:border-black focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
              }`}
            />
            {errors.phone && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.phone}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="job_id"
              className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
            >
              Assign Job <span className="text-rose-500">*</span>
            </label>
            <select
              id="job_id"
              name="job_id"
              value={formData.job_id}
              onChange={handleChange}
              disabled={loadingJobs || openJobs.length === 0}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.job_id
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-zinc-200 focus:border-black focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
              }`}
            >
              {openJobs.length === 0 ? (
                <option value="">No open jobs available</option>
              ) : (
                openJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))
              )}
            </select>
            {errors.job_id && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.job_id}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Resume URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="resume_url"
              className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
            >
              Resume Link
            </label>
            <span className="text-xs text-zinc-400">Optional</span>
          </div>
          <input
            id="resume_url"
            name="resume_url"
            type="url"
            value={formData.resume_url}
            onChange={handleChange}
            placeholder="e.g. https://example.com/resumes/candidate.pdf"
            maxLength={500}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-zinc-50/50 hover:border-zinc-300 text-zinc-900 transition-all placeholder:text-zinc-400"
          />
          {errors.resume_url && (
            <p className="text-xs font-medium text-rose-600 mt-1">
              {errors.resume_url}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
          <Link href="/hr/candidates">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || openJobs.length === 0}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Candidate...' : 'Save Candidate'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

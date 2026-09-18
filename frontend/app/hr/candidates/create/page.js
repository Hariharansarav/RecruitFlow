'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, AlertCircle, Briefcase } from 'lucide-react';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import techLeadService from '@/services/techLeadService';
import authService from '@/services/authService';

export default function CreateCandidatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [openJobs, setOpenJobs] = useState([]);
  const [activeTechLeads, setActiveTechLeads] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    job_id: '',
    tech_lead_id: '',
    resume_url: '',
  });

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
    setUser(currentUser);

    async function fetchData() {
      try {
        const [jobs, leads] = await Promise.all([
          jobService.getJobs(),
          techLeadService.getActiveTechLeads(),
        ]);
        setOpenJobs(jobs.filter((j) => j.status === 'OPEN'));
        setActiveTechLeads(leads);
      } catch (err) {
        console.error('Failed to load candidate creation options:', err);
        setServerError('Unable to load jobs and tech leads. Please try again.');
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [router]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateUrl = (urlStr) => {
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validateField = (name, value) => {
    const trimmed = (value || '').trim();
    switch (name) {
      case 'name':
        if (!trimmed) return 'Candidate name is required.';
        if (trimmed.length < 2) return 'Candidate name is required.';
        if (trimmed.length > 100) return 'Name cannot exceed 100 characters.';
        return '';
      case 'email':
        if (!trimmed) return 'Candidate email is required.';
        if (!validateEmail(trimmed)) return 'Please enter a valid email address.';
        if (trimmed.length > 150) return 'Email cannot exceed 150 characters.';
        return '';
      case 'phone':
        if (!trimmed) return 'Candidate phone number is required.';
        const phoneDigits = trimmed.replace(/\D/g, '');
        if (
          phoneDigits.length < 7 ||
          phoneDigits.length > 15 ||
          !/^[0-9+\s\-()]+$/.test(trimmed)
        ) {
          return 'Please enter a valid phone number.';
        }
        if (trimmed.length > 50) return 'Phone cannot exceed 50 characters.';
        return '';
      case 'job_id':
        if (!trimmed) return 'Please select a job.';
        return '';
      case 'tech_lead_id':
        if (!trimmed) return 'Please select a Tech Lead for the interview.';
        return '';
      case 'resume_url':
        if (trimmed) {
          if (!validateUrl(trimmed)) {
            return 'Please enter a valid URL (e.g. https://example.com/resume.pdf).';
          }
          if (trimmed.length > 500) {
            return 'Resume URL cannot exceed 500 characters.';
          }
        }
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
        job_id: Number(formData.job_id),
        tech_lead_id: Number(formData.tech_lead_id),
        resume_url: formData.resume_url.trim() || undefined,
      };

      await candidateService.createCandidate(payload);

      setToast({
        message: 'Candidate created successfully.',
        type: 'success',
      });

      setTimeout(() => {
        router.push('/hr/candidates');
      }, 1000);
    } catch (err) {
      console.error('Failed to create candidate:', err);
      const rawMsg = err.response?.data?.message;
      if (Array.isArray(rawMsg)) {
        setServerError(rawMsg.join(', '));
      } else if (typeof rawMsg === 'string') {
        setServerError(rawMsg);
      } else {
        setServerError('Unable to create candidate. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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
        <span className="text-zinc-900 font-semibold">Create Candidate</span>
      </div>

      {/* Page Header */}
      <div className="pb-4 border-b border-zinc-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
          Create Candidate
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Add a new candidate, assign them to an open job requisition, and designate a Tech Lead for technical interview screening.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Warning if no open jobs */}
      {!loadingData && openJobs.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <Briefcase className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
          <div>
            <h4 className="font-bold">No Open Jobs Available</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Candidates can only be assigned to open job requisitions. Please create or reopen a job first.
            </p>
          </div>
        </div>
      )}

      {/* Create Candidate Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-zinc-200/90 rounded-3xl shadow-xs p-6 sm:p-8 space-y-6"
        noValidate
      >
        {/* Candidate Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="candidate_name"
            className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
          >
            Candidate Name <span className="text-red-500">*</span>
          </label>
          <input
            id="candidate_name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            maxLength={100}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-zinc-900'
                : 'border-zinc-200 focus:border-zinc-950 focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
            }`}
          />
          {errors.name && (
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="candidate_email"
            className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="candidate_email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. john@gmail.com"
            maxLength={150}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.email
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-zinc-900'
                : 'border-zinc-200 focus:border-zinc-950 focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
            }`}
          />
          {errors.email && (
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label
            htmlFor="candidate_phone"
            className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
          >
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            id="candidate_phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 9876543210"
            maxLength={50}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.phone
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-zinc-900'
                : 'border-zinc-200 focus:border-zinc-950 focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
            }`}
          />
          {errors.phone && (
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Assign Job */}
        <div className="space-y-1.5">
          <label
            htmlFor="candidate_job_id"
            className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
          >
            Assign Job <span className="text-red-500">*</span>
          </label>
          <select
            id="candidate_job_id"
            name="job_id"
            value={formData.job_id}
            onChange={handleChange}
            disabled={loadingData || openJobs.length === 0}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.job_id
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-zinc-900'
                : 'border-zinc-200 focus:border-zinc-950 focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900 font-medium'
            }`}
          >
            {loadingData ? (
              <option value="">Loading jobs...</option>
            ) : openJobs.length === 0 ? (
              <option value="">No open jobs available</option>
            ) : (
              <>
                <option value="">Select Job</option>
                {openJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </>
            )}
          </select>
          {errors.job_id && (
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {errors.job_id}
            </p>
          )}
        </div>

        {/* Tech Lead */}
        <div className="space-y-1.5">
          <label
            htmlFor="candidate_tech_lead_id"
            className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
          >
            Tech Lead <span className="text-red-500">*</span>
          </label>
          <select
            id="candidate_tech_lead_id"
            name="tech_lead_id"
            value={formData.tech_lead_id}
            onChange={handleChange}
            disabled={loadingData || activeTechLeads.length === 0}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.tech_lead_id
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-zinc-900'
                : 'border-zinc-200 focus:border-zinc-950 focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900 font-medium'
            }`}
          >
            {loadingData ? (
              <option value="">Loading Tech Leads...</option>
            ) : activeTechLeads.length === 0 ? (
              <option value="">No active Tech Leads available</option>
            ) : (
              <>
                <option value="">Select Tech Lead</option>
                {activeTechLeads.map((tl) => (
                  <option key={tl.id} value={tl.id}>
                    {tl.name} — {tl.email}
                  </option>
                ))}
              </>
            )}
          </select>
          {errors.tech_lead_id && (
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {errors.tech_lead_id}
            </p>
          )}
          <p className="text-xs text-zinc-400">
            Selected Tech Lead will conduct the candidate evaluation.
          </p>
        </div>

        {/* Resume Link */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="candidate_resume_url"
              className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
            >
              Resume Link
            </label>
            <span className="text-xs text-zinc-400">Optional</span>
          </div>
          <input
            id="candidate_resume_url"
            name="resume_url"
            type="url"
            value={formData.resume_url}
            onChange={handleChange}
            placeholder="e.g. https://example.com/resume.pdf"
            maxLength={500}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.resume_url
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-zinc-900'
                : 'border-zinc-200 focus:border-zinc-950 focus:ring-zinc-200 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900'
            }`}
          />
          {errors.resume_url && (
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {errors.resume_url}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t border-zinc-100">
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
            <span>{isSubmitting ? 'Creating Candidate...' : 'Create Candidate'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase, Plus, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import jobService from '@/services/jobService';
import authService from '@/services/authService';

export default function CreateJobPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    experience_required: '',
    location: '',
    required_skills: '',
    description: '',
  });

  // Errors state
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
  }, [router]);

  const validateField = (name, value) => {
    const trimmed = (value || '').trim();
    switch (name) {
      case 'title':
        if (!trimmed) return 'Job title is required.';
        if (trimmed.length > 100) return 'Job title cannot exceed 100 characters.';
        return '';
      case 'department':
        if (!trimmed) return 'Department is required.';
        if (trimmed.length > 100) return 'Department cannot exceed 100 characters.';
        return '';
      case 'experience_required':
        if (!trimmed) return 'Experience required is required.';
        if (trimmed.length > 100) return 'Experience cannot exceed 100 characters.';
        return '';
      case 'location':
        if (!trimmed) return 'Location is required.';
        if (trimmed.length > 150) return 'Location cannot exceed 150 characters.';
        return '';
      case 'required_skills':
        if (!trimmed) return 'Required skills are required.';
        if (trimmed.length > 500) return 'Required skills cannot exceed 500 characters.';
        return '';
      case 'description':
        if (!trimmed) return 'Job description is required.';
        if (trimmed.length > 5000) return 'Job description cannot exceed 5000 characters.';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error on change if valid
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

    if (!user || user.role !== 'HR') {
      setServerError('You do not have permission to create this job.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        department: formData.department.trim(),
        experience_required: formData.experience_required.trim(),
        location: formData.location.trim(),
        required_skills: formData.required_skills.trim(),
        description: formData.description.trim(),
        created_by: user.id,
      };

      await jobService.createJob(payload);

      setToast({
        message: '✓ Job created successfully.',
        type: 'success',
      });

      // Navigate to job list after short delay
      setTimeout(() => {
        router.push('/hr/jobs');
      }, 1000);
    } catch (err) {
      console.error('Failed to create job:', err);
      const status = err.response?.status;
      if (status === 403) {
        setServerError('You do not have permission to create this job.');
      } else if (status === 400) {
        const msg = err.response?.data?.message;
        setServerError(Array.isArray(msg) ? msg.join(', ') : msg || 'Unable to create job. Please check all fields.');
      } else {
        setServerError('Unable to create job. Please try again.');
      }
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

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href="/hr/jobs"
          className="hover:text-brand-600 transition-colors flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Jobs
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Create Job</span>
      </div>

      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Create New Job
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create a job opening and define the requirements for candidates.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Create Job Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6"
      >
        {/* Row 1: Title & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-slate-800"
            >
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Frontend Developer"
              maxLength={100}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.title
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100 bg-slate-50/50'
              }`}
            />
            {errors.title && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="department"
              className="block text-sm font-semibold text-slate-800"
            >
              Department <span className="text-rose-500">*</span>
            </label>
            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Engineering, Product, QA"
              maxLength={100}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.department
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100 bg-slate-50/50'
              }`}
            />
            {errors.department && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.department}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Experience Required & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              htmlFor="experience_required"
              className="block text-sm font-semibold text-slate-800"
            >
              Experience Required <span className="text-rose-500">*</span>
            </label>
            <input
              id="experience_required"
              name="experience_required"
              type="text"
              value={formData.experience_required}
              onChange={handleChange}
              placeholder="e.g. 0–2 Years, 3+ Years"
              maxLength={100}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.experience_required
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100 bg-slate-50/50'
              }`}
            />
            {errors.experience_required && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.experience_required}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="location"
              className="block text-sm font-semibold text-slate-800"
            >
              Location <span className="text-rose-500">*</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Chennai, Bangalore, Remote"
              maxLength={150}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.location
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100 bg-slate-50/50'
              }`}
            />
            {errors.location && (
              <p className="text-xs font-medium text-rose-600 mt-1">
                {errors.location}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Required Skills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="required_skills"
              className="block text-sm font-semibold text-slate-800"
            >
              Required Skills <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">Comma-separated</span>
          </div>
          <input
            id="required_skills"
            name="required_skills"
            type="text"
            value={formData.required_skills}
            onChange={handleChange}
            placeholder="e.g. React, JavaScript, HTML, CSS, TypeScript"
            maxLength={500}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.required_skills
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100 bg-slate-50/50'
            }`}
          />
          {errors.required_skills ? (
            <p className="text-xs font-medium text-rose-600 mt-1">
              {errors.required_skills}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Provide skills separated by commas. These will be matched against candidate profiles.
            </p>
          )}
        </div>

        {/* Row 4: Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-slate-800"
            >
              Job Description <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">
              {formData.description.length}/5000 characters
            </span>
          </div>
          <textarea
            id="description"
            name="description"
            rows={6}
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide a comprehensive job description, responsibilities, and qualifications..."
            maxLength={5000}
            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all resize-y leading-relaxed ${
              errors.description
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100 bg-slate-50/50'
            }`}
          />
          {errors.description && (
            <p className="text-xs font-medium text-rose-600 mt-1">
              {errors.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link href="/hr/jobs">
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
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating...' : 'Create Job'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

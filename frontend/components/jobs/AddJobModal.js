'use client';

import { useState, useEffect } from 'react';
import { X, Briefcase, Plus, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import jobService from '@/services/jobService';
import authService from '@/services/authService';

export default function AddJobModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    experience_required: '',
    location: '',
    required_skills: '',
    description: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      title: '',
      department: '',
      experience_required: '',
      location: '',
      required_skills: '',
      description: '',
    });
    setErrors({});
    setServerError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

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

    if (errors[name]) {
      const errorMsg = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

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

    const user = authService.getCurrentUser();
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

      const created = await jobService.createJob(payload);
      onSuccess?.(created);
      onClose?.();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-job-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 text-slate-900 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2
              id="add-job-modal-title"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
            >
              Create Job
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Define position requirements, required skills, and job details.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Job Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Row 1: Title & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="modal_job_title"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                id="modal_job_title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Senior Frontend Developer"
                maxLength={100}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.title
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
                }`}
              />
              {errors.title && (
                <p className="text-xs font-medium text-red-600 mt-0.5">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="modal_job_department"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Department <span className="text-red-500">*</span>
              </label>
              <input
                id="modal_job_department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Engineering"
                maxLength={100}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.department
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
                }`}
              />
              {errors.department && (
                <p className="text-xs font-medium text-red-600 mt-0.5">
                  {errors.department}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Experience & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="modal_job_experience"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Experience Required <span className="text-red-500">*</span>
              </label>
              <input
                id="modal_job_experience"
                name="experience_required"
                type="text"
                value={formData.experience_required}
                onChange={handleChange}
                placeholder="e.g. 3-5 years"
                maxLength={100}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.experience_required
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
                }`}
              />
              {errors.experience_required && (
                <p className="text-xs font-medium text-red-600 mt-0.5">
                  {errors.experience_required}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="modal_job_location"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Location <span className="text-red-500">*</span>
              </label>
              <input
                id="modal_job_location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Remote or Bangalore"
                maxLength={150}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.location
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
                }`}
              />
              {errors.location && (
                <p className="text-xs font-medium text-red-600 mt-0.5">
                  {errors.location}
                </p>
              )}
            </div>
          </div>

          {/* Required Skills */}
          <div className="space-y-1">
            <label
              htmlFor="modal_job_skills"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Required Skills <span className="text-red-500">*</span>
            </label>
            <input
              id="modal_job_skills"
              name="required_skills"
              type="text"
              value={formData.required_skills}
              onChange={handleChange}
              placeholder="e.g. React, TypeScript, Next.js, Node.js"
              maxLength={500}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.required_skills
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            />
            <p className="text-xs text-slate-400">Comma-separated list of required technical skills.</p>
            {errors.required_skills && (
              <p className="text-xs font-medium text-red-600 mt-0.5">
                {errors.required_skills}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label
              htmlFor="modal_job_description"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="modal_job_description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe role responsibilities and requirements..."
              maxLength={5000}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.description
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            />
            {errors.description && (
              <p className="text-xs font-medium text-red-600 mt-0.5">
                {errors.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
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
    </div>
  );
}

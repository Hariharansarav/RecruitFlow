'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Briefcase, Lock, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import candidateService from '@/services/candidateService';
import authService from '@/services/authService';

export default function EditCandidateModal({ isOpen, candidate, onClose, onSuccess }) {
  const isResumeMatched =
    Number(candidate?.ai_match_percentage) >= 80 &&
    candidate?.ai_screening_details?.recommendation !== 'POOR_MATCH';

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    interviewer_email: '',
    resume_url: '',
    skills: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate fields when candidate changes or modal opens
  useEffect(() => {
    if (!isOpen || !candidate) return;

    setFormData({
      name: candidate.name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      interviewer_email: candidate.interviewer_email || '',
      resume_url: candidate.resume_url || '',
      skills: candidate.skills || '',
    });
    setErrors({});
    setServerError(null);
    setIsSubmitting(false);
  }, [isOpen, candidate]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !candidate) return null;

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
        if (trimmed.length < 2) return 'Candidate name must be at least 2 characters.';
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
        if (phoneDigits.length < 7 || phoneDigits.length > 15 || !/^[0-9+\s\-()]+$/.test(trimmed)) {
          return 'Please enter a valid phone number (minimum 7 digits).';
        }
        if (trimmed.length > 50) return 'Phone cannot exceed 50 characters.';
        return '';
      case 'resume_url':
        if (!trimmed) {
          return 'Candidate resume is required for AI screening.';
        }
        if (!trimmed.startsWith('data:') && !validateUrl(trimmed)) {
          return 'Please enter a valid URL (e.g. https://example.com/resume.pdf).';
        }
        if (trimmed.length > 500 && !trimmed.startsWith('data:')) {
          return 'Resume URL cannot exceed 500 characters.';
        }
        return '';
      case 'skills':
        if (trimmed && trimmed.length > 500) {
          return 'Skills description cannot exceed 500 characters.';
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

    // Validate fields
    const newErrors = {};
    ['name', 'email', 'phone', 'resume_url', 'skills'].forEach((key) => {
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
      const currentUser = authService.getCurrentUser();
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        resume_url: formData.resume_url.trim() || undefined,
        skills: formData.skills.trim() || undefined,
        interviewer_email: isResumeMatched
          ? formData.interviewer_email.trim() || undefined
          : undefined,
      };

      const updated = await candidateService.updateCandidate(candidate.id, payload, currentUser?.id);
      onSuccess?.(updated);
      onClose?.();
    } catch (err) {
      console.error('Failed to update candidate:', err);
      if (!err.response) {
        setServerError('Unable to connect to the server.');
      } else {
        const rawMsg = err.response?.data?.message;
        if (Array.isArray(rawMsg)) {
          setServerError(rawMsg.join(', '));
        } else if (typeof rawMsg === 'string') {
          setServerError(rawMsg);
        } else {
          setServerError('Unable to update candidate. Please try again.');
        }
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-candidate-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 text-slate-900 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2
              id="edit-candidate-modal-title"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
            >
              Edit Candidate
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Update candidate profile details, contact information, and interviewer assignment.
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

        {/* Candidate Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Candidate Name */}
          <div className="space-y-1">
            <label
              htmlFor="edit_candidate_name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Candidate Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit_candidate_name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              maxLength={100}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            />
            {errors.name && (
              <p className="text-xs font-medium text-red-600 mt-0.5">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="edit_candidate_email"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="edit_candidate_email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john@gmail.com"
              maxLength={150}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            />
            {errors.email && (
              <p className="text-xs font-medium text-red-600 mt-0.5">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label
              htmlFor="edit_candidate_phone"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="edit_candidate_phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              maxLength={50}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.phone
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            />
            {errors.phone && (
              <p className="text-xs font-medium text-red-600 mt-0.5">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Assigned Job (Read-Only) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Job Requisition
              </label>
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked to application
              </span>
            </div>
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 text-sm text-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span className="font-semibold text-zinc-900 truncate">
                  {candidate.job?.title || 'General Requisition'}
                </span>
                {candidate.job?.department && (
                  <span className="text-xs text-zinc-500">
                    ({candidate.job.department})
                  </span>
                )}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-200/70 text-zinc-700 font-medium">
                {candidate.job?.status || 'OPEN'}
              </span>
            </div>
          </div>

          {/* Stage 2 Interviewer Assignment */}
          {isResumeMatched ? (
            <div className="space-y-1">
              <label
                htmlFor="edit_candidate_interviewer_email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Interviewer Email ID (Stage 2)
              </label>
              <input
                id="edit_candidate_interviewer_email"
                name="interviewer_email"
                type="email"
                value={formData.interviewer_email}
                onChange={handleChange}
                placeholder="e.g. interviewer@company.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900 text-sm focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-500">
                Manually enter the technical interviewer's email address who will conduct the Stage 2 evaluation.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Stage 2 (Technical Interview) Locked</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Interviewer email can only be entered if the candidate's resume matches the JD (ATS match &ge; 80%). Current ATS score: {candidate?.ai_match_percentage !== null && candidate?.ai_match_percentage !== undefined ? `${candidate.ai_match_percentage}%` : 'Not evaluated'}.
                </p>
              </div>
            </div>
          )}

          {/* Resume Link */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit_candidate_resume_url"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Resume Link <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                Required for AI Screening
              </span>
            </div>
            <input
              id="edit_candidate_resume_url"
              name="resume_url"
              type="url"
              value={formData.resume_url}
              onChange={handleChange}
              placeholder="e.g. https://example.com/resume.pdf"
              maxLength={500}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.resume_url
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            />
            {errors.resume_url && (
              <p className="text-xs font-medium text-red-600 mt-0.5">
                {errors.resume_url}
              </p>
            )}
          </div>

          {/* Skills / Notes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit_candidate_skills"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Key Skills / Notes
              </label>
              <span className="text-xs text-slate-400">Optional</span>
            </div>
            <input
              id="edit_candidate_skills"
              name="skills"
              type="text"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
              maxLength={500}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.skills
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            />
            {errors.skills && (
              <p className="text-xs font-medium text-red-600 mt-0.5">
                {errors.skills}
              </p>
            )}
          </div>

          {/* Action Buttons */}
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
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Briefcase } from 'lucide-react';
import Button from '@/components/ui/Button';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import techLeadService from '@/services/techLeadService';

export default function AddCandidateModal({ isOpen, onClose, onSuccess }) {
  const [openJobs, setOpenJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [activeTechLeads, setActiveTechLeads] = useState([]);
  const [loadingTechLeads, setLoadingTechLeads] = useState(true);

  // Form fields: Name, Email, Phone, Assign Job, Tech Lead, Resume Link
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

  // Reset form and load jobs when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      name: '',
      email: '',
      phone: '',
      job_id: '',
      tech_lead_id: '',
      resume_url: '',
    });
    setErrors({});
    setServerError(null);
    setIsSubmitting(false);
    setLoadingJobs(true);
    setLoadingTechLeads(true);

    let isMounted = true;
    async function loadData() {
      try {
        const [allJobs, leads] = await Promise.all([
          jobService.getJobs(),
          techLeadService.getActiveTechLeads(),
        ]);
        if (isMounted) {
          const available = allJobs.filter((j) => j.status === 'OPEN');
          setOpenJobs(available);
          setActiveTechLeads(leads);
        }
      } catch (err) {
        console.error('Failed to load modal data:', err);
        if (isMounted) {
          setServerError('Unable to load required data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoadingJobs(false);
          setLoadingTechLeads(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  if (!isOpen) return null;

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
        if (phoneDigits.length < 7 || phoneDigits.length > 15 || !/^[0-9+\s\-()]+$/.test(trimmed)) {
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

      const created = await candidateService.createCandidate(payload);
      onSuccess?.(created);
      onClose?.();
    } catch (err) {
      console.error('Failed to create candidate:', err);
      if (!err.response) {
        setServerError('Unable to connect to the server.');
      } else {
        const rawMsg = err.response?.data?.message;
        const status = err.response?.status;
        if (Array.isArray(rawMsg)) {
          setServerError(rawMsg.join(', '));
        } else if (typeof rawMsg === 'string') {
          if (rawMsg.toLowerCase().includes('closed job') || rawMsg.toLowerCase().includes('open jobs')) {
            setServerError('Candidates can only be added to open jobs.');
          } else if (rawMsg.toLowerCase().includes('not found') || status === 404) {
            setServerError('Selected job was not found.');
          } else {
            setServerError(rawMsg);
          }
        } else {
          setServerError('Unable to create candidate. Please try again.');
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
      aria-labelledby="add-candidate-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 text-slate-900 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2
              id="add-candidate-modal-title"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
            >
              Add Candidate
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Enter candidate details to assign them to an open job requisition.
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

        {/* Warning if no open jobs */}
        {!loadingJobs && openJobs.length === 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
            <Briefcase className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5" />
            <span>
              No open jobs available. Please create an open job before adding a candidate.
            </span>
          </div>
        )}

        {/* Candidate Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Candidate Name */}
          <div className="space-y-1">
            <label
              htmlFor="modal_candidate_name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Candidate Name <span className="text-red-500">*</span>
            </label>
            <input
              id="modal_candidate_name"
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
              htmlFor="modal_candidate_email"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="modal_candidate_email"
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
              htmlFor="modal_candidate_phone"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="modal_candidate_phone"
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

          {/* Assign Job Dropdown */}
          <div className="space-y-1">
            <label
              htmlFor="modal_candidate_job_id"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Assign Job <span className="text-red-500">*</span>
            </label>
            <select
              id="modal_candidate_job_id"
              name="job_id"
              value={formData.job_id}
              onChange={handleChange}
              disabled={loadingJobs || openJobs.length === 0}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.job_id
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            >
              {loadingJobs ? (
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

          {/* Tech Lead Dropdown */}
          <div className="space-y-1">
            <label
              htmlFor="modal_candidate_tech_lead_id"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Tech Lead <span className="text-red-500">*</span>
            </label>
            <select
              id="modal_candidate_tech_lead_id"
              name="tech_lead_id"
              value={formData.tech_lead_id}
              onChange={handleChange}
              disabled={loadingTechLeads || activeTechLeads.length === 0}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.tech_lead_id
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900'
              }`}
            >
              {loadingTechLeads ? (
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
          </div>

          {/* Resume Link */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="modal_candidate_resume_url"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Resume Link
              </label>
              <span className="text-xs text-slate-400">Optional</span>
            </div>
            <input
              id="modal_candidate_resume_url"
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
              disabled={isSubmitting || openJobs.length === 0}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Candidate...' : 'Save Candidate'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

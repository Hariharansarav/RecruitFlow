'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  UserPlus,
  AlertCircle,
  Briefcase,
  Upload,
  FileText,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import NextStepModal from '@/components/ui/NextStepModal';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';

export default function AddCandidateModal({ isOpen, onClose, onSuccess }) {
  const router = useRouter();
  const [openJobs, setOpenJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Form fields: Name, Email, Phone, Assign Job, Resume
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    job_id: '',
    resume_url: '',
  });

  const [selectedFileName, setSelectedFileName] = useState('');
  const [createdCandidate, setCreatedCandidate] = useState(null);
  const [showNextModal, setShowNextModal] = useState(false);

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
      resume_url: '',
    });
    setSelectedFileName('');
    setCreatedCandidate(null);
    setShowNextModal(false);
    setErrors({});
    setServerError(null);
    setIsSubmitting(false);
    setLoadingJobs(true);

    let isMounted = true;
    async function loadData() {
      try {
        const allJobs = await jobService.getJobs();
        if (isMounted) {
          const available = allJobs.filter((j) => j.status === 'OPEN');
          setOpenJobs(available);
        }
      } catch (err) {
        console.error('Failed to load modal data:', err);
        if (isMounted) {
          setServerError('Unable to load required data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoadingJobs(false);
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
      if (e.key === 'Escape' && isOpen && !isSubmitting && !showNextModal) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, showNextModal, onClose]);

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
        if (!trimmed) return 'Please select an open job requisition.';
        return '';

      case 'resume_url':
        if (!trimmed) {
          return 'Candidate resume is required for Stage 1 AI screening.';
        }
        if (!trimmed.startsWith('data:') && !validateUrl(trimmed)) {
          return 'Please provide a valid resume URL (e.g. https://example.com/resume.pdf) or upload a file.';
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setFormData((prev) => ({ ...prev, resume_url: result }));
      setErrors((prev) => ({ ...prev, resume_url: '' }));
    };
    reader.readAsDataURL(file);
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
        resume_url: formData.resume_url.trim(),
      };

      const created = await candidateService.createCandidate(payload);
      setCreatedCandidate(created);
      setShowNextModal(true);
      onSuccess?.(created);
    } catch (err) {
      console.error('Failed to create candidate:', err);
      if (!err.response) {
        setServerError('Unable to connect to the server.');
      } else {
        const rawMsg = err.response?.data?.message;
        const status = err.response?.status;
        if (status === 413) {
          setServerError('The uploaded resume payload exceeds server limits.');
        } else if (Array.isArray(rawMsg)) {
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

  const handleResetForAnother = () => {
    setShowNextModal(false);
    setCreatedCandidate(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      job_id: formData.job_id, // keep selected job
      resume_url: '',
    });
    setSelectedFileName('');
    setErrors({});
    setServerError(null);
    setIsSubmitting(false);
  };

  const handleCloseAll = () => {
    setShowNextModal(false);
    onClose?.();
  };

  return (
    <>
      {/* Guided Next Step Modal on successful creation */}
      <NextStepModal
        isOpen={showNextModal}
        onClose={handleCloseAll}
        title="Candidate Registered & AI Screened!"
        subtitle="Resume has been submitted for Stage 1 AI Resume Screening against the job description."
        badgeText="Stage 1 Complete"
        badgeColor="bg-slate-100 text-slate-700 border-slate-200"
        icon={CheckCircle2}
        iconColor="bg-slate-900 text-white"
        itemSummary={{
          label: 'Candidate Created',
          value: createdCandidate?.name || formData.name,
          tag: 'Stage 1: AI Screening',
          subtext: `Assigned to: ${openJobs.find((j) => String(j.id) === String(formData.job_id))?.title || 'Open Requisition'}`,
        }}
        nextStageTitle="Next Step: Review Match % & Schedule Interview"
        nextStageDescription="Review the AI match percentage, verified strengths, and missing skills. Then, provide the interviewer's email to dispatch meeting & evaluation links."
        primaryAction={{
          label: 'Review AI Screening & Match %',
          onClick: () => {
            if (createdCandidate?.id) {
              router.push(`/hr/candidates/${createdCandidate.id}/screening`);
            } else {
              handleCloseAll();
            }
          },
        }}
        secondaryAction={{
          label: 'Add Another Candidate',
          onClick: handleResetForAnother,
        }}
        tertiaryAction={{
          label: 'Done',
          onClick: handleCloseAll,
        }}
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-candidate-modal-title"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 text-slate-900 overflow-y-auto max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                  Stage 1: Candidate Entry &amp; Screening
                </span>
              </div>
              <h2
                id="add-candidate-modal-title"
                className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
              >
                Add Candidate
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Upload resume and enter candidate details to trigger automatic AI screening.
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
                Candidate Email <span className="text-red-500">*</span>
              </label>
              <input
                id="modal_candidate_email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. candidate@example.com"
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
                Assign Job Requisition <span className="text-red-500">*</span>
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
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100 bg-white hover:border-slate-300 text-slate-900 font-medium'
                }`}
              >
                {loadingJobs ? (
                  <option value="">Loading jobs...</option>
                ) : openJobs.length === 0 ? (
                  <option value="">No open jobs available</option>
                ) : (
                  <>
                    <option value="">Select Job Requisition</option>
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

            {/* MANDATORY RESUME SECTION FOR AI SCREENING */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="modal_candidate_resume_url"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  Candidate Resume (Required for AI Screening) <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Stage 1 Mandatory
                </span>
              </div>

              {/* Upload file button or URL input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="modal_resume_file"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Upload Resume File</span>
                  </label>
                  <input
                    id="modal_resume_file"
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {selectedFileName && (
                    <span className="text-xs font-semibold text-emerald-700 truncate max-w-[200px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {selectedFileName}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-medium">Or paste a public Resume Link:</div>

                <input
                  id="modal_candidate_resume_url"
                  name="resume_url"
                  type="text"
                  value={formData.resume_url.startsWith('data:') ? 'Document attached (' + (selectedFileName || 'File uploaded') + ')' : formData.resume_url}
                  onChange={(e) => {
                    if (!e.target.value.startsWith('Document attached')) {
                      setSelectedFileName('');
                      handleChange(e);
                    }
                  }}
                  placeholder="https://example.com/resumes/candidate.pdf"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                    errors.resume_url
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                      : 'border-slate-200 focus:border-slate-800 focus:ring-slate-100 bg-white hover:border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {errors.resume_url && (
                <p className="text-xs font-medium text-red-600 mt-0.5">
                  {errors.resume_url}
                </p>
              )}

              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>AI Resume Screening:</strong> RecruitFlow AI evaluates candidate competencies and computes an ATS match score directly against the JD.
              </p>
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
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Screening Resume...' : 'Save & Trigger AI Screening'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

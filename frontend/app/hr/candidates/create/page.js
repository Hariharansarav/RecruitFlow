'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  AlertCircle,
  Briefcase,
  FileText,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import NextStepModal from '@/components/ui/NextStepModal';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import authService from '@/services/authService';

export default function CreateCandidatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [openJobs, setOpenJobs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form fields
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
        const jobs = await jobService.getJobs();
        setOpenJobs(jobs.filter((j) => j.status === 'OPEN'));
      } catch (err) {
        console.error('Failed to load candidate creation options:', err);
        setServerError('Unable to load open jobs. Please try again.');
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
        if (!trimmed) return 'Please select a job requisition.';
        return '';

      case 'resume_url':
        if (!trimmed) {
          return 'Candidate resume is required for Stage 1 AI screening.';
        }
        if (!trimmed.startsWith('data:') && !validateUrl(trimmed)) {
          return 'Please enter a valid URL (e.g. https://example.com/resume.pdf) or upload a file.';
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

      setToast({
        message: 'Candidate created and submitted for AI screening.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to create candidate:', err);
      const rawMsg = err.response?.data?.message;
      const status = err.response?.status;
      if (status === 413) {
        setServerError('The uploaded resume payload exceeds server limits.');
      } else if (Array.isArray(rawMsg)) {
        setServerError(rawMsg.join(', '));
      } else if (typeof rawMsg === 'string') {
        setServerError(rawMsg);
      } else {
        setServerError('Unable to create candidate. Please try again.');
      }
    } finally {
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
      job_id: formData.job_id,
      resume_url: '',
    });
    setSelectedFileName('');
    setErrors({});
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Guided Next Step Modal */}
      <NextStepModal
        isOpen={showNextModal}
        onClose={() => router.push('/hr/candidates')}
        title="Candidate Registered & AI Screened!"
        subtitle="Resume has been submitted for Stage 1 AI Resume Screening against the job description."
        badgeText="Stage 1 Complete"
        badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
        icon={CheckCircle2}
        iconColor="from-emerald-500 to-teal-600"
        itemSummary={{
          label: 'Candidate Created',
          value: createdCandidate?.name || formData.name,
          tag: 'Stage 1: AI Screened',
          subtext: `Requisition: ${openJobs.find((j) => String(j.id) === String(formData.job_id))?.title || 'Open Requisition'}`,
        }}
        nextStageTitle="Next Step: Review Match % & Schedule Interview"
        nextStageDescription="Examine the AI match percentage, strengths, and missing skills. Move to Stage 2 to assign the interviewer's email, date, time, and Google Meet link."
        primaryAction={{
          label: 'Review AI Screening & Match %',
          onClick: () => {
            if (createdCandidate?.id) {
              router.push(`/hr/candidates/${createdCandidate.id}/screening`);
            } else {
              router.push('/hr/candidates');
            }
          },
        }}
        secondaryAction={{
          label: 'Add Another Candidate',
          onClick: handleResetForAnother,
        }}
        tertiaryAction={{
          label: 'Go to Candidates List',
          onClick: () => router.push('/hr/candidates'),
        }}
      />

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
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            Stage 1: Candidate Entry &amp; Screening
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Create Candidate
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload candidate resume and assign them to an open job requisition to trigger AI screening.
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
            placeholder="e.g. Sarah Connor"
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
            Candidate Email <span className="text-red-500">*</span>
          </label>
          <input
            id="candidate_email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. sarah.connor@example.com"
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
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="candidate_phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. +1 555-0199"
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
            Assign Job Requisition <span className="text-red-500">*</span>
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

        {/* MANDATORY RESUME UPLOAD FOR AI SCREENING */}
        <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="candidate_resume_url"
              className="block text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Candidate Resume (Required for Stage 1 AI Screening) <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
              Stage 1 Mandatory
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label
                htmlFor="page_resume_file"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-indigo-300 hover:border-indigo-500 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Resume Document</span>
              </label>
              <input
                id="page_resume_file"
                type="file"
                accept=".pdf,.docx,.txt,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              {selectedFileName && (
                <span className="text-xs font-semibold text-emerald-700 truncate max-w-xs flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {selectedFileName}
                </span>
              )}
            </div>

            <div className="text-[11px] text-zinc-500 font-medium pt-1">Or enter a public Resume URL:</div>

            <input
              id="candidate_resume_url"
              name="resume_url"
              type="text"
              value={formData.resume_url.startsWith('data:') ? 'Document attached (' + (selectedFileName || 'File uploaded') + ')' : formData.resume_url}
              onChange={(e) => {
                if (!e.target.value.startsWith('Document attached')) {
                  setSelectedFileName('');
                  handleChange(e);
                }
              }}
              placeholder="https://example.com/resumes/sarah.pdf"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                errors.resume_url
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-zinc-900'
                  : 'border-zinc-200 focus:border-zinc-950 focus:ring-zinc-200 bg-white hover:border-zinc-300 text-zinc-900'
              }`}
            />
          </div>

          {errors.resume_url && (
            <p className="text-xs font-medium text-red-600 mt-0.5">
              {errors.resume_url}
            </p>
          )}

          <p className="text-xs text-indigo-900/80 leading-relaxed pt-1">
            🤖 <strong>Stage 1 AI Screening:</strong> RecruitFlow AI parses the candidate profile and calculates a role match percentage against the requisition competencies immediately upon submission.
          </p>
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
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Screening Resume...' : 'Save & Trigger AI Screening'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

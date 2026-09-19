'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  FileText,
  Upload,
  ArrowLeft,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Layers,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import jobService from '@/services/jobService';
import authService from '@/services/authService';

export default function CreateJobPage() {
  const router = useRouter();

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);

  // High-level mode: 'generate' (Option B) | 'existing' (Option A)
  const [mode, setMode] = useState('generate');

  // Mode A input sub-tab: 'file' | 'paste'
  const [existingTab, setExistingTab] = useState('file');

  // Option B: Generate with AI Form state
  const [generateForm, setGenerateForm] = useState({
    job_title: '',
    experience_years: '',
    department: 'Engineering',
    location: '',
  });

  // Option A: Existing JD Form state
  const [jdText, setJdText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // AI Loading & Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // AI Generated / Extracted Draft Preview state (null when in input mode)
  const [previewJob, setPreviewJob] = useState(null);

  // New skill input in preview editor
  const [newSkillInput, setNewSkillInput] = useState('');

  // Creation submission state
  const [isCreating, setIsCreating] = useState(false);

  // Notifications & UI feedback
  const [errorBanner, setErrorBanner] = useState(null);
  const [toast, setToast] = useState(null);

  // Load current user
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'HR') {
      router.replace('/company/dashboard');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  // Seniority helper based on experience years
  const seniorityHint = useMemo(() => {
    const yrs = Number(generateForm.experience_years);
    if (generateForm.experience_years === '' || isNaN(yrs) || yrs < 0) {
      return null;
    }
    if (yrs === 0) return { label: 'Entry Level / Fresher', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (yrs <= 2) return { label: 'Junior (1-2 years)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (yrs <= 5) return { label: 'Mid-Level (3-5 years)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (yrs <= 8) return { label: 'Senior (6-8 years)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    return { label: 'Lead / Expert (9+ years)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }, [generateForm.experience_years]);

  // Handle file selection with validation
  const handleFileChange = (e) => {
    setErrorBanner(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setErrorBanner('Only PDF (.pdf) and Word DOCX (.docx) documents are supported.');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorBanner('The selected file is too large. Maximum file size allowed is 5MB.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorBanner(null);
  };

  // Helper to normalize raw AI response
  const normalizeAiOutput = (raw) => {
    const uniqueSkills = [];
    const seenSkills = new Set();
    (raw.required_skills || []).forEach((s) => {
      if (typeof s === 'string' && s.trim()) {
        const trimmed = s.trim();
        const lower = trimmed.toLowerCase();
        if (!seenSkills.has(lower)) {
          seenSkills.add(lower);
          uniqueSkills.push(trimmed);
        }
      }
    });

    const cleanResponsibilities = (raw.responsibilities || [])
      .filter((r) => typeof r === 'string' && r.trim())
      .map((r) => r.trim());

    const cleanQualifications = (raw.qualifications || [])
      .filter((q) => typeof q === 'string' && q.trim())
      .map((q) => q.trim());

    return {
      title: raw.title || '',
      department: raw.department || 'Engineering',
      seniority_level: raw.seniority_level || 'Mid-Level',
      experience_required: raw.experience_required || '',
      location: raw.location || '',
      description: raw.description || '',
      required_skills: uniqueSkills,
      responsibilities: cleanResponsibilities.length > 0 ? cleanResponsibilities : ['Execute core duties and collaborate with the engineering team.'],
      qualifications: cleanQualifications.length > 0 ? cleanQualifications : ["Bachelor's degree in Computer Science or relevant practical experience."],
    };
  };

  // ACTION: Generate Job with AI (Option B)
  const handleGenerateWithAI = async (e) => {
    e.preventDefault();
    setErrorBanner(null);

    const title = generateForm.job_title.trim();
    const expStr = generateForm.experience_years.toString().trim();

    if (!title) {
      setErrorBanner('Please enter a valid Job Title.');
      return;
    }

    const expYears = Number(expStr);
    if (expStr === '' || isNaN(expYears) || expYears < 0) {
      setErrorBanner('Please enter a valid, non-negative number of years of experience.');
      return;
    }

    if (expYears > 50) {
      setErrorBanner('Please enter a realistic experience value (maximum 50 years).');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('AI is generating role responsibilities, core skills, and qualifications tailored to your specifications...');

    try {
      const payload = {
        job_title: title,
        experience_years: expYears,
        department: generateForm.department.trim() || undefined,
        location: generateForm.location.trim() || undefined,
      };

      const response = await jobService.generateJobWithAI(payload, currentUser?.id);
      if (response && response.success && response.data) {
        const normalized = normalizeAiOutput(response.data);
        setPreviewJob(normalized);
        setToast({ message: 'Job Description generated successfully! Review and edit below.', type: 'success' });
      } else {
        throw new Error(response?.message || 'AI generation failed');
      }
    } catch (err) {
      console.error('AI Generation error:', err);
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message;

      if (status === 429) {
        setErrorBanner('AI service is temporarily busy due to rate limits. Please try again in a moment.');
      } else if (status === 503) {
        setErrorBanner('AI service is currently unavailable. Please verify backend configuration.');
      } else if (status === 400) {
        setErrorBanner(Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg || 'Invalid generation parameters.');
      } else {
        setErrorBanner(apiMsg || 'Unable to generate job description. Please check connection and try again.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // ACTION: Parse Existing JD (Option A)
  const handleParseExistingJD = async (e) => {
    e.preventDefault();
    setErrorBanner(null);

    if (existingTab === 'file') {
      if (!selectedFile) {
        setErrorBanner('Please select a PDF or DOCX file to upload.');
        return;
      }
    } else {
      if (!jdText.trim() || jdText.trim().length < 20) {
        setErrorBanner('Please paste a substantive Job Description of at least 20 characters.');
        return;
      }
    }

    setIsProcessing(true);
    setProcessingMessage('AI is reading and structuring the job description into standardized components...');

    try {
      let payload;
      if (existingTab === 'file') {
        payload = new FormData();
        payload.append('file', selectedFile);
      } else {
        payload = { jd_text: jdText.trim() };
      }

      const response = await jobService.parseJobDescription(payload, currentUser?.id);
      if (response && response.success && response.data) {
        const normalized = normalizeAiOutput(response.data);
        setPreviewJob(normalized);
        setToast({ message: 'Job details extracted successfully! Review and edit below.', type: 'success' });
      } else {
        throw new Error(response?.message || 'JD parsing failed');
      }
    } catch (err) {
      console.error('JD Parsing error:', err);
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message;

      if (status === 413) {
        setErrorBanner('The uploaded document is too large. Please upload a file under 5MB.');
      } else if (status === 422) {
        setErrorBanner('Unable to extract readable text from this document. The file may be empty, image-only scanned, or corrupted.');
      } else if (status === 429) {
        setErrorBanner('AI service is temporarily busy. Please wait a moment and try again.');
      } else if (status === 503) {
        setErrorBanner('AI service is currently unavailable. Please verify backend configuration.');
      } else {
        setErrorBanner(apiMsg || 'Unable to parse job description. Please check the file or paste the JD manually.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Preview Editor: Add Skill Tag
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed || !previewJob) return;

    const lower = trimmed.toLowerCase();
    const exists = previewJob.required_skills.some((s) => s.toLowerCase() === lower);
    if (exists) {
      setToast({ message: `Skill "${trimmed}" is already in the list.`, type: 'info' });
      setNewSkillInput('');
      return;
    }

    setPreviewJob((prev) => ({
      ...prev,
      required_skills: [...prev.required_skills, trimmed],
    }));
    setNewSkillInput('');
  };

  // Preview Editor: Remove Skill Tag
  const handleRemoveSkill = (indexToRemove) => {
    setPreviewJob((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Preview Editor: Update Responsibility
  const handleUpdateResponsibility = (index, value) => {
    setPreviewJob((prev) => {
      const updated = [...prev.responsibilities];
      updated[index] = value;
      return { ...prev, responsibilities: updated };
    });
  };

  // Preview Editor: Add Responsibility
  const handleAddResponsibility = () => {
    setPreviewJob((prev) => ({
      ...prev,
      responsibilities: [...prev.responsibilities, ''],
    }));
  };

  // Preview Editor: Remove Responsibility
  const handleRemoveResponsibility = (indexToRemove) => {
    setPreviewJob((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Preview Editor: Update Qualification
  const handleUpdateQualification = (index, value) => {
    setPreviewJob((prev) => {
      const updated = [...prev.qualifications];
      updated[index] = value;
      return { ...prev, qualifications: updated };
    });
  };

  // Preview Editor: Add Qualification
  const handleAddQualification = () => {
    setPreviewJob((prev) => ({
      ...prev,
      qualifications: [...prev.qualifications, ''],
    }));
  };

  // Preview Editor: Remove Qualification
  const handleRemoveQualification = (indexToRemove) => {
    setPreviewJob((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // ACTION: HR confirms and saves the Job via existing POST /api/jobs
  const handleCreateJobSubmit = async () => {
    setErrorBanner(null);
    if (!previewJob) return;

    // Validate required fields
    if (!previewJob.title.trim()) {
      setErrorBanner('Job Title is required.');
      return;
    }
    if (!previewJob.department.trim()) {
      setErrorBanner('Department is required.');
      return;
    }
    if (!previewJob.description.trim()) {
      setErrorBanner('Job Description overview is required.');
      return;
    }
    if (!previewJob.experience_required.trim()) {
      setErrorBanner('Experience Required is required.');
      return;
    }

    // Critical constraint: At least 1 required skill must be specified
    const validSkills = previewJob.required_skills.filter((s) => s.trim().length > 0);
    if (validSkills.length === 0) {
      setErrorBanner('Please add at least one required skill. These skills are essential for Tech Lead evaluations.');
      return;
    }

    setIsCreating(true);

    try {
      const payload = {
        title: previewJob.title.trim(),
        department: previewJob.department.trim(),
        description: previewJob.description.trim(),
        required_skills: validSkills, // jobService will serialize to string for existing backend DTO
        experience_required: previewJob.experience_required.trim(),
        location: previewJob.location ? previewJob.location.trim() : 'Remote',
        created_by: currentUser?.id,
      };

      await jobService.createJob(payload);

      setToast({ message: 'Job created successfully! Redirecting...', type: 'success' });

      setTimeout(() => {
        router.push('/hr/jobs');
      }, 1000);
    } catch (err) {
      console.error('Failed to create approved job:', err);
      const msg = err.response?.data?.message;
      setErrorBanner(Array.isArray(msg) ? msg.join(', ') : msg || 'Unable to create job. Please review the fields.');
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <Link
            href="/hr/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950 transition-colors mb-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Jobs</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Create New Job
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              AI Intelligence
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Generate a comprehensive Job Description or parse an existing document with AI assistance.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="bg-red-50 border border-red-200/90 rounded-2xl p-4 flex items-start gap-3 text-red-800 shadow-xs animate-slide-up">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{errorBanner}</div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-red-400 hover:text-red-700 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STAGE 1: Input & Mode Selection (Displayed when previewJob is null) */}
      {!previewJob && (
        <div className="space-y-6">
          {/* Mode Selector Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
              1. Choose How You Want To Create This Job
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: I Have a JD */}
              <button
                type="button"
                onClick={() => {
                  setMode('existing');
                  setErrorBanner(null);
                }}
                disabled={isProcessing}
                className={`text-left p-5 rounded-2xl border transition-all relative select-none cursor-pointer ${
                  mode === 'existing'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      mode === 'existing'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-950 text-base">
                        I Have a Job Description
                      </span>
                      {mode === 'existing' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Upload a PDF/DOCX or paste an existing JD. AI will extract and structure the role.
                    </p>
                  </div>
                </div>
              </button>

              {/* Option B: Generate with AI */}
              <button
                type="button"
                onClick={() => {
                  setMode('generate');
                  setErrorBanner(null);
                }}
                disabled={isProcessing}
                className={`text-left p-5 rounded-2xl border transition-all relative select-none cursor-pointer ${
                  mode === 'generate'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      mode === 'generate'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-950 text-base">
                        Generate with AI
                      </span>
                      {mode === 'generate' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Enter the role and experience level. AI will craft a complete, structured JD.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* AI Processing Card */}
          {isProcessing && (
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/80 rounded-2xl p-8 text-center shadow-xs animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-sm animate-spin">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 tracking-tight">
                AI is Processing Your Job Specification...
              </h3>
              <p className="text-sm text-zinc-600 max-w-lg mx-auto mt-2 leading-relaxed">
                {processingMessage}
              </p>
              <div className="mt-5 w-48 h-1.5 bg-indigo-200 rounded-full mx-auto overflow-hidden">
                <div className="w-full h-full bg-indigo-600 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* MODE B: Generate with AI Form */}
          {!isProcessing && mode === 'generate' && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-2 pb-4 border-b border-zinc-100 mb-6">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-zinc-950 tracking-tight">
                  Generate Job Description with AI
                </h2>
              </div>

              <form onSubmit={handleGenerateWithAI} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Job Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                      Job Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DevOps Engineer, Senior Frontend Developer, QA Lead"
                      value={generateForm.job_title}
                      onChange={(e) =>
                        setGenerateForm((prev) => ({
                          ...prev,
                          job_title: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200/90 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all outline-none"
                    />
                  </div>

                  {/* Years of Experience */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Years of Experience <span className="text-rose-500">*</span>
                      </label>
                      {seniorityHint && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${seniorityHint.color}`}
                        >
                          {seniorityHint.label}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      min={0}
                      max={50}
                      placeholder="e.g. 4 (0 for Fresher)"
                      value={generateForm.experience_years}
                      onChange={(e) =>
                        setGenerateForm((prev) => ({
                          ...prev,
                          experience_years: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200/90 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all outline-none"
                    />
                    <p className="text-xs text-zinc-400 mt-1.5">
                      0: Fresher · 1–2: Junior · 3–5: Mid-Level · 6–8: Senior · 9+: Lead
                    </p>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                      Department <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engineering, Product, Infrastructure, Design"
                      value={generateForm.department}
                      onChange={(e) =>
                        setGenerateForm((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200/90 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all outline-none"
                    />
                  </div>

                  {/* Location */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                      Location <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chennai, Bengaluru, Hybrid, or Remote"
                      value={generateForm.location}
                      onChange={(e) =>
                        setGenerateForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200/90 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-zinc-100">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isProcessing}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Job Description</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* MODE A: I Have a JD Form */}
          {!isProcessing && mode === 'existing' && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-zinc-950 tracking-tight">
                    Extract Details from Existing JD
                  </h2>
                </div>

                {/* Sub tabs: File vs Paste */}
                <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setExistingTab('file');
                      setErrorBanner(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      existingTab === 'file'
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    Upload Document
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExistingTab('paste');
                      setErrorBanner(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      existingTab === 'paste'
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              <form onSubmit={handleParseExistingJD} className="space-y-6">
                {/* File Upload Option */}
                {existingTab === 'file' && (
                  <div>
                    {!selectedFile ? (
                      <label className="border-2 border-dashed border-zinc-300 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-indigo-50/20 group">
                        <input
                          type="file"
                          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 group-hover:bg-indigo-100 text-zinc-600 group-hover:text-indigo-600 flex items-center justify-center mb-3 transition-colors">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-zinc-900 mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-zinc-500">
                          Supported formats: PDF or DOCX (max 5MB)
                        </p>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 break-all">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB · Ready to extract
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          className="text-zinc-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                          <span>Remove</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Paste Text Option */}
                {existingTab === 'paste' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                      Job Description Text <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={8}
                      required
                      placeholder="Paste the full job description here (responsibilities, required skills, qualifications, etc.)..."
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200/90 rounded-2xl text-sm text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 transition-all outline-none font-sans"
                    />
                    <div className="flex items-center justify-between mt-1 text-xs text-zinc-400">
                      <span>Minimum 20 characters</span>
                      <span>{jdText.length} characters</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end pt-4 border-t border-zinc-100">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isProcessing}
                    disabled={existingTab === 'file' ? !selectedFile : jdText.trim().length < 20}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Job Details</span>
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: AI Generated Preview & Edit Section */}
      {previewJob && (
        <div className="space-y-8 animate-slide-up">
          {/* Preview Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  AI Generated Draft Preview
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Review and Edit Job Details
              </h2>
              <p className="text-sm text-zinc-300 mt-1 max-w-xl leading-relaxed">
                Everything below is fully editable. Review carefully before confirming. The job is not saved until you click &quot;Create Job&quot;.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setPreviewJob(null)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Regenerate / Back
              </Button>
            </div>
          </div>

          {/* Editable Form Card */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-8">
            {/* Core Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={previewJob.title}
                  onChange={(e) =>
                    setPreviewJob((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-950 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Department <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={previewJob.department}
                  onChange={(e) =>
                    setPreviewJob((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-950 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                />
              </div>

              {/* Seniority Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Seniority Level
                </label>
                <input
                  type="text"
                  value={previewJob.seniority_level}
                  onChange={(e) =>
                    setPreviewJob((prev) => ({
                      ...prev,
                      seniority_level: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-950 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                />
              </div>

              {/* Experience Required */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Experience Required <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={previewJob.experience_required}
                  onChange={(e) =>
                    setPreviewJob((prev) => ({
                      ...prev,
                      experience_required: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-950 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Remote, Chennai, Hybrid"
                  value={previewJob.location}
                  onChange={(e) =>
                    setPreviewJob((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-950 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                Job Description Overview <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                value={previewJob.description}
                onChange={(e) =>
                  setPreviewJob((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm text-zinc-950 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 outline-none leading-relaxed"
              />
            </div>

            {/* Required Skills Tag/Chip Editor */}
            <div className="pt-4 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Required Skills ({previewJob.required_skills.length}) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    These skills are evaluated 0–5 by Tech Leads during candidate interviews.
                  </p>
                </div>
              </div>

              {/* Skills Tags List */}
              <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 min-h-[52px]">
                {previewJob.required_skills.length === 0 && (
                  <span className="text-xs text-rose-500 font-medium py-1">
                    No skills added. Please add at least one required skill.
                  </span>
                )}
                {previewJob.required_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-indigo-700 border border-indigo-200/90 shadow-xs group"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(idx)}
                      className="text-zinc-400 hover:text-red-600 rounded-full p-0.5 transition-colors"
                      title="Remove skill"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Skill Input */}
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Type a skill (e.g. Docker, PostgreSQL)..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15 outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddSkill}
                  disabled={!newSkillInput.trim()}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Skill</span>
                </Button>
              </div>
            </div>

            {/* Responsibilities Editor */}
            <div className="pt-4 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800">
                  Key Responsibilities ({previewJob.responsibilities.length})
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleAddResponsibility}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Responsibility
                </Button>
              </div>

              <div className="space-y-2">
                {previewJob.responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 w-6 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={resp}
                      onChange={(e) =>
                        handleUpdateResponsibility(idx, e.target.value)
                      }
                      className="flex-1 px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveResponsibility(idx)}
                      className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      title="Remove responsibility"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Qualifications Editor */}
            <div className="pt-4 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800">
                  Qualifications & Requirements ({previewJob.qualifications.length})
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleAddQualification}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Qualification
                </Button>
              </div>

              <div className="space-y-2">
                {previewJob.qualifications.map((qual, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 w-6 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={qual}
                      onChange={(e) =>
                        handleUpdateQualification(idx, e.target.value)
                      }
                      className="flex-1 px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveQualification(idx)}
                      className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      title="Remove qualification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-zinc-100 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setPreviewJob(null)}
                disabled={isCreating}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Inputs
              </Button>

              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={isCreating}
                onClick={handleCreateJobSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white px-8"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Confirm & Create Job
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

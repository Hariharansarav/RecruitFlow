'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ShieldCheck,
  Users,
  Briefcase,
  Lock,
  Mail,
} from 'lucide-react';
import authService from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect directly to role dashboard
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      if (user.role === 'HR') {
        router.replace('/hr/dashboard');
      } else if (user.role === 'COMPANY') {
        router.replace('/company/dashboard');
      }
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const user = await authService.login(email, password);

      if (user.role === 'HR') {
        router.push('/hr/dashboard');
      } else if (user.role === 'COMPANY') {
        router.push('/company/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Invalid email or password');
      } else if (err.response && err.response.data && err.response.data.message) {
        const msg = err.response.data.message;
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      } else {
        setError('Unable to connect to server. Please make sure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans bg-slate-100">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-stretch rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        
        {/* LEFT SECTION: Executive Brand Showcase (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 p-10 xl:p-12 flex-col justify-between relative bg-slate-50 border-r border-slate-200">

          {/* Brand Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="text-base font-bold tracking-tight text-slate-900">
                RecruitFlow
              </span>
            </div>
          </div>

          {/* Core Value Proposition */}
          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-200/70 text-[11px] font-semibold uppercase tracking-wider mb-5 text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
              Enterprise Recruitment Platform
            </div>

            <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight text-slate-900 mb-4">
              Find the right talent. <br />
              <span className="text-slate-500 font-normal">Build the right team.</span>
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed font-normal mb-8 max-w-md">
              A unified corporate portal for automated job descriptions, technical interview evaluation, and employer hiring decisions.
            </p>

            {/* Platform Feature Cards */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">HR Portal</p>
                  <p className="text-xs font-bold text-slate-900">Pipeline & Scoring</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Company Portal</p>
                  <p className="text-xs font-bold text-slate-900">Review & Decisions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="relative z-10 text-[11px] text-slate-400 font-medium">
            © 2026 RecruitFlow. Enterprise Recruitment Platform.
          </div>
        </div>

        {/* RIGHT SECTION: Minimalist Clean Executive Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 xl:p-12 bg-white">
          <div className="w-full max-w-md space-y-6">
            
            {/* Header Mobile Brand Icon */}
            <div className="lg:hidden flex items-center gap-2.5 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="text-lg font-bold text-slate-900">RecruitFlow</span>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Sign in to access your recruitment workspace.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <span className="font-bold text-rose-500 text-sm leading-none">✕</span>
                <p className="flex-1 font-medium">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all shadow-xs"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all shadow-xs"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-5 border-t border-slate-200 text-xs text-slate-500 space-y-2.5">
              <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                Quick Demo Access:
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('hr@recruitment.com');
                    setPassword('123456');
                  }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 text-left transition-all group"
                >
                  <span className="block text-[10px] text-slate-500 font-medium">
                    Click to autofill
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs font-bold text-slate-900">HR Workspace</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('company@recruitment.com');
                    setPassword('123456');
                  }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 text-left transition-all group"
                >
                  <span className="block text-[10px] text-slate-500 font-medium">
                    Click to autofill
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs font-bold text-slate-900">Company Portal</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}


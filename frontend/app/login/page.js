'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, Users, Briefcase } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* LEFT SECTION: Visual Brand Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 p-12 flex-col justify-between relative overflow-hidden text-white">
        {/* Subtle Decorative Gradient Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">RecruitFlow</h2>
            <p className="text-xs text-brand-200 font-medium">Talent Screening & Evaluation</p>
          </div>
        </div>

        {/* Core Value Proposition */}
        <div className="relative z-10 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6 text-brand-100">
            <ShieldCheck className="w-4 h-4" />
            Recruitment SaaS Platform
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Find the right talent. <br />
            <span className="text-brand-200">Build the right team.</span>
          </h1>

          <p className="text-base text-brand-100 leading-relaxed font-normal mb-8">
            A centralized platform for automated JD matching, structured interview evaluations, and seamless collaborative hiring decisions.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-brand-200" />
              </div>
              <div>
                <p className="text-xs text-brand-200 font-medium">HR Portal</p>
                <p className="text-sm font-semibold">Pipeline & Scoring</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-accent-200" />
              </div>
              <div>
                <p className="text-xs text-brand-200 font-medium">Company Portal</p>
                <p className="text-sm font-semibold">Review & Decision</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-brand-200/80">
          © 2026 RecruitFlow Platform. Recruitment Screening & Candidate Evaluation.
        </div>
      </div>

      {/* RIGHT SECTION: Modern Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm">
          {/* Header Mobile Brand Icon */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-slate-900">RecruitFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Sign in to continue to your recruitment workspace.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <span className="font-bold text-rose-500">✕</span>
              <p className="flex-1 font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="e.g. hr@recruitment.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials hint */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
            <p className="font-semibold text-slate-600">Demo Credentials:</p>
            <p className="flex justify-between">
              <span>HR Workspace:</span>
              <span className="font-mono text-slate-700 font-medium">hr@recruitment.com / 123456</span>
            </p>
            <p className="flex justify-between">
              <span>Company Workspace:</span>
              <span className="font-mono text-slate-700 font-medium">company@recruitment.com / 123456</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

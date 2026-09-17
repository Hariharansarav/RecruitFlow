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
    <div className="min-h-screen bg-zinc-50 flex">
      {/* LEFT SECTION: Luxury Obsidian Brand Showcase (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 p-12 flex-col justify-between relative overflow-hidden text-white border-r border-zinc-900">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg font-bold">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">RecruitFlow</h2>
            <p className="text-xs text-zinc-400 font-medium">Talent Screening & Evaluation</p>
          </div>
        </div>

        {/* Core Value Proposition */}
        <div className="relative z-10 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold uppercase tracking-wider mb-6 text-zinc-300 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-white" />
            Recruitment SaaS Platform
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Find the right talent. <br />
            <span className="text-zinc-400">Build the right team.</span>
          </h1>

          <p className="text-base text-zinc-400 leading-relaxed font-normal mb-8">
            A centralized platform for automated JD matching, skill-by-skill interview evaluations, and seamless collaborative hiring decisions.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-900">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">HR Portal</p>
                <p className="text-sm font-semibold text-white">Pipeline & Scoring</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">Company Portal</p>
                <p className="text-sm font-semibold text-white">Review & Decision</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-zinc-500">
          © 2026 RecruitFlow Platform. Minimalist Recruitment Excellence.
        </div>
      </div>

      {/* RIGHT SECTION: Modern Minimalist Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-zinc-200/80 rounded-3xl p-8 sm:p-10 shadow-xs">
          {/* Header Mobile Brand Icon */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-zinc-950">RecruitFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Welcome back</h2>
            <p className="text-sm text-zinc-500 mt-1.5">
              Sign in to continue to your recruitment workspace.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <span className="font-bold text-red-500">✕</span>
              <p className="flex-1 font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="e.g. hr@recruitment.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-black hover:bg-zinc-800 active:bg-zinc-950 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Quick Demo Credentials hint with 1-click autofill */}
          <div className="mt-8 pt-6 border-t border-zinc-100 text-xs text-zinc-500 space-y-2.5">
            <p className="font-semibold text-zinc-700 uppercase tracking-wider text-[11px]">
              Quick Demo Access:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmail('hr@recruitment.com');
                  setPassword('123456');
                }}
                className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 rounded-xl text-zinc-900 font-semibold text-left transition-all"
              >
                <span className="block text-[10px] text-zinc-400 font-medium">Click to fill</span>
                HR User
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('company@recruitment.com');
                  setPassword('123456');
                }}
                className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200 rounded-xl text-zinc-900 font-semibold text-left transition-all"
              >
                <span className="block text-[10px] text-zinc-400 font-medium">Click to fill</span>
                Company User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  Briefcase,
  UserCheck,
  CheckCircle2,
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-amber-300 selection:text-zinc-900">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-stretch rounded-[32px] border border-[#eae8dc] bg-white/70 backdrop-blur-2xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.08),0_2px_6px_0_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* LEFT SECTION: Warm Luxury Brand Showcase (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 p-10 xl:p-12 flex-col justify-between relative bg-gradient-to-br from-[#faf9f4]/90 via-[#f6f5ef]/80 to-[#eeebe2]/90 border-r border-[#eae8dc]">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

          {/* Brand Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 border border-[#e2dec9] shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-500/20 animate-pulse" />
              <span className="text-base font-bold tracking-tight text-zinc-900">
                RecruitFlow
              </span>
            </div>
          </div>

          {/* Core Value Proposition */}
          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eeebe2] border border-[#e2dec9] text-[11px] font-semibold uppercase tracking-wider mb-5 text-zinc-700 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-800" />
              Intelligent Recruitment Platform
            </div>

            <h1 className="text-3xl xl:text-4xl font-normal tracking-tight leading-tight text-[#1a1a1e] mb-4">
              Find the right talent. <br />
              <span className="font-semibold text-zinc-600">Build the right team.</span>
            </h1>

            <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-8 max-w-md">
              A unified workspace for AI job description generation, technical interview scoring, and collaborative employer hiring decisions.
            </p>

            {/* Platform Feature Cards Matching Dashboard Aesthetics */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-white/80 border border-[#e2dec9] shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#18181b] text-white flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 font-medium">HR Portal</p>
                  <p className="text-xs font-bold text-zinc-900">Pipeline & Scoring</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 border border-[#e2dec9] shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#facc15] text-[#18181b] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 font-medium">Company Portal</p>
                  <p className="text-xs font-bold text-zinc-900">Review & Decisions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="relative z-10 text-[11px] text-zinc-400 font-medium">
            © 2026 RecruitFlow. Minimalist Recruitment Excellence.
          </div>
        </div>

        {/* RIGHT SECTION: Modern Minimalist Warm Glassmorphic Login Card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 xl:p-12 bg-white/60">
          <div className="w-full max-w-md space-y-6">
            
            {/* Header Mobile Brand Icon */}
            <div className="lg:hidden flex items-center gap-2.5 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-500/20 animate-pulse" />
              <span className="text-lg font-bold text-zinc-950">RecruitFlow</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-[#1a1a1e]">
                Welcome back
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Sign in to continue to your recruitment workspace.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <span className="font-bold text-red-500 text-sm leading-none">✕</span>
                <p className="flex-1 font-medium">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#e2dec9] rounded-2xl text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#18181b] focus:border-[#18181b] focus:bg-white transition-all shadow-xs"
                    placeholder="e.g. hr@recruitment.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#e2dec9] rounded-2xl text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#18181b] focus:border-[#18181b] focus:bg-white transition-all shadow-xs"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-[#18181b] hover:bg-zinc-800 active:bg-zinc-900 text-white font-semibold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#18181b] focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Quick Demo Credentials matching the warm cream theme */}
            <div className="pt-5 border-t border-[#eae8dc] text-xs text-zinc-500 space-y-2.5">
              <p className="font-semibold text-zinc-700 uppercase tracking-wider text-[11px]">
                Quick Demo Access:
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('hr@recruitment.com');
                    setPassword('123456');
                  }}
                  className="p-3 bg-[#eeebe2]/60 hover:bg-[#eeebe2] active:bg-[#e4e0d4] border border-[#e2dec9] rounded-2xl text-zinc-900 font-semibold text-left transition-all group"
                >
                  <span className="block text-[10px] text-zinc-500 font-medium group-hover:text-zinc-700">
                    Click to autofill
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs font-bold text-zinc-900">HR User</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('company@recruitment.com');
                    setPassword('123456');
                  }}
                  className="p-3 bg-[#eeebe2]/60 hover:bg-[#eeebe2] active:bg-[#e4e0d4] border border-[#e2dec9] rounded-2xl text-zinc-900 font-semibold text-left transition-all group"
                >
                  <span className="block text-[10px] text-zinc-500 font-medium group-hover:text-zinc-700">
                    Click to autofill
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs font-bold text-zinc-900">Company User</span>
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
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


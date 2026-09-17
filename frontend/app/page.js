'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/authService';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const user = authService.getCurrentUser();

    if (user && user.role === 'HR') {
      router.replace('/hr/dashboard');
    } else if (user && user.role === 'COMPANY') {
      router.replace('/company/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Loading RecruitFlow...</p>
      </div>
    </div>
  );
}

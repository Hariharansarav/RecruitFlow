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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Redirecting to workspace...</p>
      </div>
    </div>
  );
}

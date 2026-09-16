'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import authService from '@/services/authService';

export default function CompanyLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      setChecking(false);
      router.replace('/login');
      return;
    }

    if (currentUser.role !== 'COMPANY') {
      setChecking(false);
      router.replace('/hr/dashboard');
      return;
    }

    setUser(currentUser);
    setChecking(false);
  }, [router]);

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout role="COMPANY" user={user}>
      {children}
    </AppLayout>
  );
}

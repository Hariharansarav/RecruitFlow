'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/authService';

export default function AuthGuard({ children, requiredRole }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();

    if (!user) {
      setAuthorized(false);
      setChecking(false);
      router.replace('/login');
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      setAuthorized(false);
      setChecking(false);

      if (user.role === 'HR') {
        router.replace('/hr/dashboard');
      } else if (user.role === 'COMPANY') {
        router.replace('/company/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }, [requiredRole, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  return authorized ? children : null;
}

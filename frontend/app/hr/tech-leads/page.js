'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HrTechLeadsPage() {
  const router = useRouter();

  useEffect(() => {
    // Tech Leads page is permanently removed; redirect to Evaluations
    router.replace('/hr/evaluations');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-xs text-zinc-500 font-medium">Redirecting to Evaluations...</p>
      </div>
    </div>
  );
}

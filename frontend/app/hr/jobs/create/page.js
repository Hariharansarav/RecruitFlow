'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateJobPage() {
  const router = useRouter();

  useEffect(() => {
    // In accordance with popup card requirement, job creation
    // opens as a modal card directly on /hr/jobs with a blurred backdrop
    router.replace('/hr/jobs?add=true');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Loading job creation...</p>
      </div>
    </div>
  );
}

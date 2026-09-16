'use client';

import Link from 'next/link';
import { ClipboardCheck, ArrowLeft } from 'lucide-react';
import Badge from '@/components/ui/Badge';

export default function HrEvaluationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interview Evaluations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conduct 1-5 star ratings, capture interview feedback, and recommend next steps.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-sm">
          <ClipboardCheck className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-2 mb-3">
          <Badge status="EVALUATED">Phase 13 Design System Ready</Badge>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Interview Evaluation Module</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
          Evaluation forms, rating stars, and interview submission flows will be rendered here in subsequent phases.
        </p>
        <Link
          href="/hr/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

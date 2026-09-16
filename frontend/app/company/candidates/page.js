'use client';

import Link from 'next/link';
import { Users, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import Badge from '@/components/ui/Badge';

export default function CompanyCandidatesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Submissions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review candidate resumes, HR screening match scores, and make Accept/Reject decisions.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 bg-accent-50 text-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-accent-100 shadow-sm">
          <Users className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-2 mb-3">
          <Badge status="SUBMITTED_TO_COMPANY">Phase 13 Design System Ready</Badge>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Company Review Pipeline</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
          Candidates submitted by HR with skill matching breakdowns and evaluations will be displayed here for decisioning in Phase 14.
        </p>
        <Link
          href="/company/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent-600 hover:text-accent-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

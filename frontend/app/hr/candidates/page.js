'use client';

import Link from 'next/link';
import { Users, Plus, ArrowLeft } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function HrCandidatesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track applicant profiles, screening match scores, and hiring status.
          </p>
        </div>
        <Button variant="primary" disabled title="Will be available in Phase 14">
          <Plus className="w-4 h-4 mr-2" />
          Add Candidate
        </Button>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100 shadow-sm">
          <Users className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-2 mb-3">
          <Badge status="APPLIED">Phase 13 Design System Ready</Badge>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Candidate Pipeline Module</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
          Applicant tracking, resume parsing, and automated JD skill matching endpoints will be wired into this UI view in Phase 14.
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

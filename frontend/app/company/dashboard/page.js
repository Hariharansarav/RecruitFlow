'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Users, Inbox } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import authService from '@/services/authService';

export default function CompanyDashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-600 bg-accent-50 px-2.5 py-0.5 rounded-full">
              Company Workspace
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">RecruitFlow SaaS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'Company Reviewer'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review candidates submitted by the HR team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge status="COMPANY" className="text-xs font-semibold px-3 py-1">
            Client Reviewer Role
          </Badge>
        </div>
      </div>

      {/* Metric Cards Grid (UI Placeholders for Phase 13) */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Candidate Review Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            icon={Clock}
            label="Pending Review"
            value="4"
            description="Submitted dossiers awaiting decision"
            color="amber"
          />
          <StatCard
            icon={CheckCircle2}
            label="Accepted"
            value="6"
            description="Candidates accepted for offers"
            color="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value="2"
            description="Archived candidate profiles"
            color="rose"
          />
          <StatCard
            icon={Users}
            label="Total Candidates"
            value="12"
            description="Total candidates reviewed all-time"
            color="brand"
          />
        </div>
      </div>

      {/* Candidate Review Inbox Placeholder */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Review Queue</h3>
              <p className="text-xs text-slate-400">Submitted candidates pending action</p>
            </div>
          </div>
        </div>

        <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <p className="text-sm text-slate-400 font-medium">No candidates in queue.</p>
          <p className="text-xs text-slate-400 mt-1">
            Candidates submitted by the HR team will appear here for review and decision.
          </p>
        </div>
      </div>
    </div>
  );
}

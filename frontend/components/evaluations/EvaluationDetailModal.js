'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  FileText,
  ExternalLink,
  Briefcase,
  User,
  Calendar,
  CheckCircle2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/dateUtils';

export default function EvaluationDetailModal({ isOpen, evaluation, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !evaluation) return null;

  const candidate = evaluation.candidate;
  const job = evaluation.job;
  const skills = evaluation.skills || [];
  const scoreNum = Number(evaluation.overall_score ?? evaluation.score) || 0;
  const matchNum =
    evaluation.jd_match_percentage != null
      ? Number(evaluation.jd_match_percentage)
      : scoreNum > 0
      ? Math.round((scoreNum / 5) * 100)
      : 0;
  const resumeUrl = candidate?.resume_url;

  // Score badge color
  const getScoreColor = (score) => {
    if (score >= 4) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 3) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getMatchColor = (match) => {
    if (match >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (match >= 60) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluation-detail-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 text-slate-900 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2
                id="evaluation-detail-modal-title"
                className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
              >
                {candidate?.name || `Candidate #${evaluation.candidate_id}`}
              </h2>
              <Badge status={candidate?.status || 'EVALUATED'}>
                {candidate?.status || 'Evaluated'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span>{candidate?.email}</span>
              {candidate?.phone && (
                <>
                  <span>•</span>
                  <span className="font-mono">{candidate?.phone}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Job Requisition & Interviewer Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Position
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <span>{job?.title || 'General Requisition'}</span>
            </div>
            {job?.department && (
              <span className="text-slate-500 block">
                Department: {job.department}
              </span>
            )}
          </div>

          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Evaluation Details
            </span>
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>
                Interviewer:{' '}
                <strong className="text-slate-900">
                  {evaluation.interviewer_email || evaluation.hr?.name || 'Technical Interviewer'}
                </strong>
              </span>
            </div>
            {evaluation.created_at && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Conducted on {formatDate(evaluation.created_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scores Overview Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Overall Score */}
          <div className={`p-4 rounded-xl border text-center space-y-1 ${getScoreColor(scoreNum)}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
              Overall Score
            </span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold">{scoreNum.toFixed(2)}</span>
              <span className="text-xs font-semibold opacity-70">/ 5.0</span>
            </div>
          </div>

          {/* JD Match Percentage */}
          <div className={`p-4 rounded-xl border text-center space-y-1 ${getMatchColor(matchNum)}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
              JD Competency Match
            </span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold">{Math.round(matchNum)}%</span>
            </div>
          </div>

          {/* Total Points */}
          <div className="col-span-2 sm:col-span-1 p-4 rounded-xl border border-slate-200 bg-white text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Points Scored
            </span>
            <div className="flex items-center justify-center gap-1 text-slate-900">
              <span className="text-2xl font-bold">
                {evaluation.total_score ?? Math.round(scoreNum * skills.length)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / {evaluation.max_score ?? skills.length * 5}
              </span>
            </div>
          </div>
        </div>

        {/* Skills Evaluation Breakdown Matrix */}
        {skills.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Technical Competencies Rated ({skills.length})
              </h3>
              <span className="text-[11px] text-slate-400">Scale: 0 to 5</span>
            </div>

            <div className="space-y-2.5">
              {skills.map((skillItem) => {
                const score = Number(skillItem.score) || 0;
                const percent = (score / 5) * 100;
                return (
                  <div
                    key={skillItem.id || skillItem.skill}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">
                        {skillItem.skill}
                      </span>
                      <div className="flex items-center gap-1 font-bold text-slate-900">
                        <span>{score}</span>
                        <span className="text-slate-400 text-[11px] font-normal">/ 5</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          score >= 4
                            ? 'bg-emerald-600'
                            : score >= 3
                            ? 'bg-slate-700'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Interview Notes & Observations */}
        {evaluation.notes && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Interviewer Observations & Notes
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed italic">
              &ldquo;{evaluation.notes}&rdquo;
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div>
            {resumeUrl ? (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 font-semibold"
                >
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>View Candidate Resume</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Button>
              </a>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1.5 italic">
                <FileText className="w-3.5 h-3.5 text-slate-300" />
                No resume uploaded for this candidate
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link
              href={`/hr/candidates/${evaluation.candidate_id}/screening`}
              className="flex-1 sm:flex-initial"
            >
              <Button variant="primary" size="sm" className="w-full flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm">
                <span>View Full Screening</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={onClose} className="border-slate-300">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

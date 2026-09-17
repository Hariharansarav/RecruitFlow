'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Search,
  X,
  Star,
  Sparkles,
  ArrowRight,
  User,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import interviewEvaluationService from '@/services/interviewEvaluationService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function HrEvaluationsPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvaluations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await interviewEvaluationService.getEvaluations();
      setEvaluations(data);
    } catch (err) {
      console.error('Failed to load interview evaluations:', err);
      setError('Unable to load evaluations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (currentUser.role !== 'HR') {
      router.replace('/company/dashboard');
      return;
    }
    fetchEvaluations();
  }, [router, fetchEvaluations]);

  const filteredEvaluations = evaluations.filter((ev) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const candidateName = ev.candidate?.name?.toLowerCase() || '';
    const candidateEmail = ev.candidate?.email?.toLowerCase() || '';
    const hrName = ev.hr?.name?.toLowerCase() || '';
    const notes = ev.notes?.toLowerCase() || '';
    return (
      candidateName.includes(q) ||
      candidateEmail.includes(q) ||
      hrName.includes(q) ||
      notes.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Interview Evaluations
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Review completed interview evaluations, scores, and recruiter feedback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/hr/candidates">
            <Button variant="primary" className="flex items-center gap-2">
              <span>View Candidates</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 text-center max-w-lg mx-auto shadow-xs">
          <AlertCircle className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
          <h2 className="text-base font-bold text-zinc-950 mb-1">{error}</h2>
          <Button variant="primary" size="sm" onClick={() => fetchEvaluations()} className="mt-3">
            Retry
          </Button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search evaluations by candidate name, recruiter, or notes..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-zinc-50/50 hover:border-zinc-300 text-zinc-900 transition-all placeholder:text-zinc-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs h-28"
            />
          ))}
        </div>
      )}

      {/* Evaluations List */}
      {!loading && !error && (
        <>
          {filteredEvaluations.length > 0 ? (
            <div className="space-y-4">
              {filteredEvaluations.map((item) => {
                const scoreNum = Number(item.score) || 0;
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-xs hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2.5">
                        <span className="font-bold text-base text-zinc-950 truncate">
                          {item.candidate?.name || `Candidate #${item.candidate_id}`}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {item.candidate?.email}
                        </span>
                        <Badge status="EVALUATED">Evaluated</Badge>
                      </div>

                      {/* Notes snippet */}
                      <p className="text-sm text-zinc-600 italic line-clamp-2 leading-relaxed">
                        &ldquo;{item.notes}&rdquo;
                      </p>

                      {/* Recruiter & Date */}
                      <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                        <span className="flex items-center gap-1 text-zinc-700 font-medium">
                          <User className="w-3.5 h-3.5 text-zinc-900" />
                          {item.hr?.name || 'HR Recruiter'}
                        </span>
                        {item.created_at && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.created_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score & Action */}
                    <div className="flex items-center gap-4 flex-shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-zinc-100 justify-between md:justify-end">
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-xl font-extrabold text-zinc-950">
                            {item.score}
                          </span>
                          <span className="text-xs text-zinc-400 font-semibold">/ 5</span>
                        </div>
                        <span className="text-xs text-zinc-400 block font-medium">Overall Score</span>
                      </div>

                      <Link href={`/hr/candidates/${item.candidate_id}/screening`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                          <span>View Screening</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto mb-2">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950">
                {searchTerm ? 'No matching evaluations' : 'No evaluations recorded yet'}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {searchTerm
                  ? 'Try searching with a different candidate name or keyword.'
                  : 'Screen candidates and provide interview evaluations to see them listed here.'}
              </p>
              {!searchTerm && (
                <div className="pt-2">
                  <Link href="/hr/candidates">
                    <Button variant="primary" size="sm">
                      Go to Candidates
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

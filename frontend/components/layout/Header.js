'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Share2,
  Bell,
  Menu,
  Moon,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header({ user, onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const isHr = user?.role === 'HR';

  // Calculate dynamic greeting based on system hour
  const [greeting, setGreeting] = useState('Good Day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Alan';

  // Page title context
  const getPageInfo = () => {
    if (pathname === '/hr/dashboard' || pathname === '/company/dashboard') {
      return {
        title: `${greeting}, ${firstName}`,
        subtitle: "Check your team's latest hiring activity.",
      };
    }
    if (pathname.startsWith('/hr/jobs/create')) {
      return {
        title: 'Create Job Requisition',
        subtitle: 'Synthesize competencies and publish role requirements.',
      };
    }
    if (pathname.startsWith('/hr/jobs')) {
      return {
        title: 'Active Job Requisitions',
        subtitle: 'Manage roles, requirements, and candidate pipelines.',
      };
    }
    if (pathname.includes('/screening')) {
      return {
        title: 'AI Resume Screening Dossier',
        subtitle: 'Competency matching against requisition specifications.',
      };
    }
    if (pathname.startsWith('/hr/candidates') || pathname.startsWith('/company/candidates')) {
      return {
        title: 'Candidate Directory',
        subtitle: 'Review talent pipeline and interview progress.',
      };
    }
    if (pathname.startsWith('/hr/evaluations')) {
      return {
        title: 'Technical Evaluations',
        subtitle: 'Real-time scorecard assessment and interviewer feedback.',
      };
    }
    if (pathname.startsWith('/hr/settings')) {
      return {
        title: 'Platform Settings',
        subtitle: 'Manage Gmail API integration and workspace configurations.',
      };
    }
    return {
      title: `${greeting}, ${firstName}`,
      subtitle: "Check your team's latest hiring activity.",
    };
  };

  const pageInfo = getPageInfo();

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/hr/candidates?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="w-full pt-4 pb-3 sm:py-5 px-4 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 z-30 transition-all">
      {/* 1. Left: Dynamic Page Greeting & Subtitle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-950 focus:outline-none transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {pageInfo.title}
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
              {pageInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Right: Search Bar with ⌘K + Action Buttons */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
        {/* Pill Search Input with ⌘K Shortcut */}
        <div className="relative flex-1 sm:w-64 md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search for data / people..."
            className="w-full pl-9 pr-12 py-2 rounded-full bg-white border border-slate-200/90 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all shadow-2xs"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400 bg-slate-50 border border-slate-200 pointer-events-none hidden sm:inline-block">
            ⌘ K
          </kbd>
        </div>

        {/* Quick Icon Button (Notifications) */}
        <button
          onClick={() => alert('All candidates and interviews are currently up to date!')}
          className="w-9 h-9 rounded-full bg-white border border-slate-200/90 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs cursor-pointer relative"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </button>

        {/* Share / Quick Action Pill Button */}
        <button
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
              alert('Dashboard link copied to clipboard!');
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer hover:border-slate-300"
          title="Share View"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Share</span>
        </button>

        {/* User Profile Pill Menu on mobile or extra viewports */}
        <div className="lg:hidden">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

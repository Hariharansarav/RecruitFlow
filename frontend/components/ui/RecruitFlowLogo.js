'use client';

import React from 'react';

/**
 * RecruitFlow Brand Identity Logo Component
 * Provides both an emblem mark (for slim rail navigation) and full wordmark (with typography)
 */
export default function RecruitFlowLogo({
  variant = 'mark', // 'mark' | 'full'
  size = 40,
  className = '',
  showTagline = false,
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Precision Vector Emblem Mark */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(21,112,239,0.35)]"
        >
          <defs>
            {/* Background Gradient */}
            <linearGradient id="rf-bg-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="60%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* Primary Flow Stroke Gradient */}
            <linearGradient id="rf-flow-primary" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>

            {/* Accent Glow Gradient */}
            <linearGradient id="rf-flow-accent" x1="16" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>

            {/* Subtle Inner Glow Border */}
            <linearGradient id="rf-border-glow" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Squircle Badge Container */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="14"
            fill="url(#rf-bg-grad)"
            stroke="url(#rf-border-glow)"
            strokeWidth="1.5"
          />

          {/* Geometric Flow Paths forming stylized 'R' & forward recruitment pipeline loops */}
          {/* Vertical Backbone / Column */}
          <rect
            x="14"
            y="13"
            width="4.5"
            height="22"
            rx="2.25"
            fill="#FFFFFF"
          />

          {/* Upper Flow Loop of 'R' */}
          <path
            d="M17 14 H25 C29.4 14 33 17.6 33 22 C33 26.4 29.4 30 25 30 H17"
            stroke="url(#rf-flow-primary)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dynamic Forward Momentum Kick / Flow Wave */}
          <path
            d="M23 27 L31.5 35"
            stroke="url(#rf-flow-accent)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* Precision AI Sparkle / Target Node in Center of Loop */}
          <circle
            cx="25"
            cy="22"
            r="2.5"
            fill="#38BDF8"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Typography Wordmark (Visible when variant === 'full') */}
      {variant === 'full' && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center tracking-tight leading-none">
            <span className="text-lg font-black text-white tracking-tight">Recruit</span>
            <span className="text-lg font-black bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Flow
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
              AI Talent Suite
            </span>
          )}
        </div>
      )}
    </div>
  );
}

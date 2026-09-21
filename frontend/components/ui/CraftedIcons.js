import React from 'react';

/**
 * RecruitFlow Crafted Vector Icons
 * Multi-tone, gradient-enhanced, high-fidelity SVGs with depth, glows, and custom geometry.
 */

// 1. AI Neural Talent Match Icon (Violet / Indigo / Electric Cyan)
export function AiNeuralIcon({ className = 'w-7 h-7' }) {
  const id = React.useId();
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(99,102,241,0.35)]">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id={`${id}-star`} x1="8" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#C7D2FE" />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Background Squircle with subtle gradient */}
        <rect width="36" height="36" rx="10" fill={`url(#${id}-bg)`} />
        {/* Ambient glow accent */}
        <circle cx="18" cy="18" r="12" fill={`url(#${id}-glow)`} />
        {/* Central 8-point AI sparkle star */}
        <path
          d="M18 6C18 12.6 12.6 18 6 18C12.6 18 18 23.4 18 30C18 23.4 23.4 18 30 18C23.4 18 18 12.6 18 6Z"
          fill={`url(#${id}-star)`}
        />
        {/* Mini satellite sparkles */}
        <circle cx="28" cy="9" r="1.75" fill="#38BDF8" />
        <circle cx="8" cy="27" r="1.25" fill="#A5B4FC" />
        {/* Micro neural node connectors */}
        <circle cx="18" cy="18" r="2.5" fill="#4338CA" stroke="#FFFFFF" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

// 2. Hiring Demand Growth Icon (Emerald / Teal / Vibrant Jade)
export function HiringGrowthIcon({ className = 'w-7 h-7' }) {
  const id = React.useId();
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id={`${id}-accent`} x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#D1FAE5" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="10" fill={`url(#${id}-bg)`} />
        {/* Modern Briefcase Outline */}
        <rect x="7" y="13" width="22" height="15" rx="3.5" fill={`url(#${id}-accent)`} />
        {/* Briefcase Handle */}
        <path
          d="M13 13V10.5C13 9.4 13.9 8.5 15 8.5H21C22.1 8.5 23 9.4 23 10.5V13"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Rising Growth Chevron on the Briefcase */}
        <path
          d="M11 22L15.5 17.5L19 21L25 15"
          stroke="#059669"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21.5 15H25V18.5"
          stroke="#059669"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// 3. Technical Scorecard Trophy Icon (Warm Amber / Metallic Gold / Tangerine)
export function ScorecardTrophyIcon({ className = 'w-7 h-7' }) {
  const id = React.useId();
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id={`${id}-gold`} x1="10" y1="8" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="50%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="10" fill={`url(#${id}-bg)`} />
        {/* Trophy Cup */}
        <path
          d="M11 10H25V17C25 20.866 21.866 24 18 24C14.134 24 11 20.866 11 17V10Z"
          fill={`url(#${id}-gold)`}
        />
        {/* Handles */}
        <path
          d="M11 12H8C6.9 12 6 12.9 6 14V15C6 17.2 7.8 19 10 19H11.5"
          stroke="#FEF3C7"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M25 12H28C29.1 12 30 12.9 30 14V15C30 17.2 28.2 19 26 19H24.5"
          stroke="#FEF3C7"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        {/* Trophy Base */}
        <path d="M18 24V27M13 28H23" stroke="#FFFBEB" strokeWidth="2" strokeLinecap="round" />
        {/* Star on Cup */}
        <path
          d="M18 13.5L19.2 16L22 16.3L20 18.1L20.5 20.8L18 19.4L15.5 20.8L16 18.1L14 16.3L16.8 16L18 13.5Z"
          fill="#D97706"
        />
      </svg>
    </div>
  );
}

// 4. Client Decision Enterprise Hub Icon (Deep Royal Indigo / Cobalt / Violet)
export function EnterpriseHubIcon({ className = 'w-7 h-7' }) {
  const id = React.useId();
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(79,70,229,0.35)]">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#3730A3" />
          </linearGradient>
          <linearGradient id={`${id}-bldg`} x1="9" y1="8" x2="27" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EEF2FF" />
            <stop offset="100%" stopColor="#C7D2FE" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="10" fill={`url(#${id}-bg)`} />
        {/* Corporate High-Rise Building */}
        <path
          d="M9 28V12C9 10.9 9.9 10 11 10H20C21.1 10 22 10.9 22 12V28"
          fill={`url(#${id}-bldg)`}
        />
        {/* Secondary Tower */}
        <path
          d="M22 16H25C26.1 16 27 16.9 27 18V28H22V16Z"
          fill="#A5B4FC"
        />
        {/* Windows */}
        <rect x="12" y="13" width="2.5" height="2.5" rx="0.5" fill="#4F46E5" />
        <rect x="16.5" y="13" width="2.5" height="2.5" rx="0.5" fill="#4F46E5" />
        <rect x="12" y="17.5" width="2.5" height="2.5" rx="0.5" fill="#4F46E5" />
        <rect x="16.5" y="17.5" width="2.5" height="2.5" rx="0.5" fill="#4F46E5" />
        <rect x="12" y="22" width="2.5" height="2.5" rx="0.5" fill="#4F46E5" />
        <rect x="16.5" y="22" width="2.5" height="2.5" rx="0.5" fill="#4F46E5" />
        {/* Entrance Portal */}
        <path d="M14 28V25H17V28" fill="#312E81" />
        {/* Connected Decision Node */}
        <circle cx="28" cy="9" r="3" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// 5. Active Jobs Executive Metric Badge
export function ActiveJobsMetricIcon({ className = 'w-11 h-11' }) {
  const id = React.useId();
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 44 44" fill="none" className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#BFDBFE" />
          </linearGradient>
          <linearGradient id={`${id}-icon`} x1="12" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <rect width="44" height="44" rx="14" fill={`url(#${id}-ring)`} stroke="#93C5FD" strokeWidth="1.2" />
        <rect x="11" y="15" width="22" height="17" rx="4" fill={`url(#${id}-icon)`} />
        <path d="M17 15V13C17 11.9 17.9 11 19 11H25C26.1 11 27 11.9 27 13V15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 21H33" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx="22" cy="24" r="2" fill="#FFFFFF" />
        {/* Pulsing indicator pip */}
        <circle cx="34" cy="11" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// 6. Evaluated Talent Executive Metric Badge
export function EvaluatedMetricIcon({ className = 'w-11 h-11' }) {
  const id = React.useId();
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 44 44" fill="none" className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.2)]">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
          <linearGradient id={`${id}-icon`} x1="12" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        <rect width="44" height="44" rx="14" fill={`url(#${id}-ring)`} stroke="#FCD34D" strokeWidth="1.2" />
        {/* Assessment Clipboard / Seal */}
        <rect x="12" y="11" width="20" height="22" rx="4" fill={`url(#${id}-icon)`} />
        <path d="M17 11V9.5C17 8.7 17.7 8 18.5 8H25.5C26.3 8 27 8.7 27 9.5V11" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        {/* Verified check badge inside */}
        <circle cx="22" cy="22" r="6" fill="#FFFFFF" />
        <path d="M19.5 22L21.2 23.8L24.8 20.2" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// 7. Talent Pool Executive Metric Badge
export function TalentPoolMetricIcon({ className = 'w-11 h-11' }) {
  const id = React.useId();
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 44 44" fill="none" className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(99,102,241,0.2)]">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EEF2FF" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>
          <linearGradient id={`${id}-icon`} x1="12" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <rect width="44" height="44" rx="14" fill={`url(#${id}-ring)`} stroke="#C7D2FE" strokeWidth="1.2" />
        {/* Layered Users */}
        <circle cx="22" cy="17" r="4.5" fill={`url(#${id}-icon)`} />
        <path d="M14 31C14 26.6 17.6 23 22 23C26.4 23 30 26.6 30 31" fill={`url(#${id}-icon)`} />
        {/* Side Satellite User */}
        <circle cx="31" cy="19" r="3" fill="#818CF8" />
        <path d="M28 30C28.5 27.5 30.5 25.5 33 25.5C34.8 25.5 36 26.5 36.5 28" stroke="#818CF8" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// 8. Tech Stack Micro Badges
export function SkillReactIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#0284C7" strokeWidth="1.75" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#0284C7" strokeWidth="1.75" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#0284C7" strokeWidth="1.75" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="2.25" fill="#0284C7" />
    </svg>
  );
}

export function SkillNodeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        fill="#16A34A"
        stroke="#15803D"
        strokeWidth="1.5"
      />
      <path d="M12 7V17M12 17L19 13M12 17L5 13" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SkillTsIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="#3178C6" />
      <path d="M6 9H14M10 9V17" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15 12.5C15 11.5 16 11 17.5 11C19 11 20 11.8 20 12.8C20 14.5 15 14 15 16C15 17.2 16.2 17.5 17.5 17.5C19 17.5 20 16.8 20 16" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 9. Hot Requisition Flame Badge
export function FlameHotIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <defs>
        <linearGradient id="flame-grad" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <path
        d="M10 1C8 5 4 8 4 12C4 15.3 6.7 18 10 18C13.3 18 16 15.3 16 12C16 7 12 4 10 1Z"
        fill="url(#flame-grad)"
      />
      <path
        d="M10 9C9 10.5 7.5 12 7.5 13.5C7.5 14.9 8.6 16 10 16C11.4 16 12.5 14.9 12.5 13.5C12.5 11.5 11 10 10 9Z"
        fill="#FEF08A"
      />
    </svg>
  );
}

// 10. Official Stylized Gmail 4-Color Icon
export function GmailBrandIcon({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M45 16.2V37C45 39.2 43.2 41 41 41H37V22L24 12L11 22V41H7C4.8 41 3 39.2 3 37V16.2C3 14.3 4.2 12.6 6 12L24 0L42 12C43.8 12.6 45 14.3 45 16.2Z" fill="#EA4335" />
      <path d="M45 16.2V37C45 39.2 43.2 41 41 41H37V22L45 16.2Z" fill="#C5221F" />
      <path d="M3 16.2V37C3 39.2 4.8 41 7 41H11V22L3 16.2Z" fill="#C5221F" />
      <path d="M11 41H37V22L24 12L11 22V41Z" fill="#FFFFFF" />
      <path d="M37 41H41C43.2 41 45 39.2 45 37V24L37 30V41Z" fill="#4285F4" />
      <path d="M11 41H7C4.8 41 3 39.2 3 37V24L11 30V41Z" fill="#34A853" />
      <path d="M11 22L24 31.5L37 22V41H11V22Z" fill="#FBBC05" />
      <path d="M37 22L24 31.5L11 22L24 12L37 22Z" fill="#EA4335" />
    </svg>
  );
}

// 11. Fast Send Airplane Icon with Glow Trail
export function SendPlaneIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

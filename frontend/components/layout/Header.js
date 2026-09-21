'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Bell, Menu, Sparkles } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header({ user, onMenuClick }) {
  const pathname = usePathname();
  const isHr = user?.role === 'HR';

  const hrNavItems = [
    { label: 'Dashboard', href: '/hr/dashboard' },
    { label: 'People', href: '/hr/candidates' },
    { label: 'Hiring', href: '/hr/jobs' },
    { label: 'Evaluations', href: '/hr/evaluations' },
    { label: 'Settings', href: '/hr/settings' },
  ];

  const companyNavItems = [
    { label: 'Dashboard', href: '/company/dashboard' },
    { label: 'Candidates', href: '/company/candidates' },
  ];

  const navItems = isHr ? hrNavItems : companyNavItems;

  return (
    <header className="w-full pt-3 sm:pt-5 pb-3 px-4 sm:px-8 lg:px-10 flex items-center justify-between z-30 transition-all">
      {/* 1. Left: Brand Logo Capsule */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-full glass-pill text-zinc-600 hover:text-zinc-950 focus:outline-none transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href={isHr ? '/hr/dashboard' : '/company/dashboard'}
          className="glass-pill px-4 sm:px-5 py-2 rounded-full flex items-center gap-2.5 hover:border-blue-400/50 hover:shadow-glass transition-all group"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-500/20 animate-pulse" />
          <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 group-hover:text-blue-600 transition-colors">
            RecruitFlow
          </span>
        </Link>
      </div>

      {/* 2. Center: Floating Navigation Dock (Desktop) */}
      <nav className="hidden lg:flex items-center glass-nav-dock rounded-full p-1.5 border border-white/90 shadow-sm gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/hr/dashboard' && item.href !== '/company/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/80'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 3. Right: Quick Actions (Bell, Profile) */}
      <div className="flex items-center gap-2.5">

        {/* Notification Bell Pill */}
        <button
          onClick={() => alert('All candidates and interviews are currently up to date!')}
          className="glass-pill w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-xs relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        {/* User Profile Pill Menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}

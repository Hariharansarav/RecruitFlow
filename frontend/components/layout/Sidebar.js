'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  ClipboardCheck,
  UserCheck,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';
import authService from '@/services/authService';

export default function Sidebar({ role, user, isOpen, onClose }) {
  const pathname = usePathname();

  const isHr = role === 'HR';

  const hrNavItems = [
    { label: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
    { label: 'Jobs', href: '/hr/jobs', icon: BriefcaseBusiness },
    { label: 'Candidates', href: '/hr/candidates', icon: Users },
    { label: 'Evaluations', href: '/hr/evaluations', icon: ClipboardCheck },
  ];

  const companyNavItems = [
    { label: 'Dashboard', href: '/company/dashboard', icon: LayoutDashboard },
    { label: 'Candidates', href: '/company/candidates', icon: UserCheck },
  ];

  const navItems = isHr ? hrNavItems : companyNavItems;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-zinc-200 z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full'
        }`}
      >
        {/* Top Branding Section */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-100">
            <Link href={isHr ? '/hr/dashboard' : '/company/dashboard'} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white shadow-xs border border-zinc-900">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-zinc-950 tracking-tight leading-none">
                  RecruitFlow
                </span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-1">
                  Talent Platform
                </span>
              </div>
            </Link>

            {/* Close button for mobile drawer */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="px-3.5 py-5">
            <p className="px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              {isHr ? 'HR Workspace' : 'Company Workspace'}
            </p>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-zinc-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom User Card & Quick Logout */}
        <div className="p-3.5 border-t border-zinc-100">
          <div className="bg-zinc-50 border border-zinc-200/70 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-zinc-950 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {user?.role}
                </p>
              </div>
            </div>

            <button
              onClick={() => authService.logout()}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

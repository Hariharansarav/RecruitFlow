'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Briefcase,
  Users,
  ClipboardCheck,
  UserCheck,
  Settings,
  Plus,
  ChevronRight,
  LogOut,
  X,
  Mail,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import authService from '@/services/authService';
import RecruitFlowLogo from '@/components/ui/RecruitFlowLogo';

export default function Sidebar({ role, user, isOpen, onClose }) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isHr = role === 'HR';

  const hrNavItems = [
    { label: 'Dashboard', href: '/hr/dashboard', icon: LayoutGrid, shortcut: '⌘1' },
    { label: 'Hiring & Jobs', href: '/hr/jobs', icon: Briefcase, shortcut: '⌘2' },
    { label: 'Candidates', href: '/hr/candidates', icon: Users, shortcut: '⌘3' },
    { label: 'Evaluations', href: '/hr/evaluations', icon: ClipboardCheck, shortcut: '⌘4' },
    { label: 'Settings', href: '/hr/settings', icon: Settings, shortcut: '⌘5' },
  ];

  const companyNavItems = [
    { label: 'Dashboard', href: '/company/dashboard', icon: LayoutGrid, shortcut: '⌘1' },
    { label: 'Candidates', href: '/company/candidates', icon: UserCheck, shortcut: '⌘2' },
  ];

  const navItems = isHr ? hrNavItems : companyNavItems;

  const getInitials = (name) => {
    if (!name) return 'RF';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const userInitials = getInitials(user?.name);

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP PERMANENT SLIM RAIL (Hidden on mobile, visible lg and up)       */}
      {/* ========================================================================= */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 bottom-0 w-[76px] bg-[#0B132B] border-r border-slate-800/80 z-40 flex-col items-center justify-between py-5 select-none transition-all shadow-xl"
        aria-label="Desktop Navigation"
      >
        {/* Top: RecruitFlow Brand Logo & Navigation */}
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Logo Container at the Top */}
          <div className="relative group flex flex-col items-center">
            <Link
              href={isHr ? '/hr/dashboard' : '/company/dashboard'}
              className="relative p-1 rounded-2xl transition-all duration-300 hover:scale-105 group"
              title="RecruitFlow Platform"
            >
              <RecruitFlowLogo variant="mark" size={42} />

              {/* Status indicator on logo */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0B132B] flex items-center justify-center p-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-emerald-300 animate-pulse" />
              </div>
            </Link>

            {/* Rich Hover Brand Tooltip */}
            <div className="absolute left-[70px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 z-50 shadow-2xl border border-slate-700/80 flex items-center gap-2">
              <span>RecruitFlow</span>
              <span className="text-[10px] text-blue-400 font-semibold px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/50">
                ATS
              </span>
            </div>
          </div>

          {/* Elegant Divider */}
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

          {/* Primary Nav Icon Stack */}
          <nav className="flex flex-col items-center gap-2.5 w-full px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/hr/dashboard' &&
                  item.href !== '/company/dashboard' &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-white text-[#0B132B] shadow-[0_8px_20px_-4px_rgba(0,0,0,0.35)] scale-100 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Left Active Vertical Notch Indicator */}
                  {isActive && (
                    <span className="absolute -left-[14px] w-1.5 h-6 bg-blue-500 rounded-r-full shadow-sm" />
                  )}

                  <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

                  {/* Enhanced Tooltip with Shortcut Chip */}
                  <div className="absolute left-[64px] px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 shadow-xl border border-slate-800 flex items-center gap-2">
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* Quick Action (+) Button for HR */}
            {isHr && (
              <div className="pt-2 w-full flex justify-center">
                <Link
                  href="/hr/jobs/create"
                  className="w-10 h-10 rounded-2xl border border-dashed border-slate-700/80 bg-white/5 hover:bg-blue-600/20 hover:border-blue-500/60 text-slate-300 hover:text-blue-300 flex items-center justify-center transition-all group relative"
                  title="Create New Requisition"
                >
                  <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
                  <div className="absolute left-[64px] px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 shadow-xl border border-slate-800">
                    Create Requisition
                  </div>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom: Integration Badges & User Profile Avatar */}
        <div className="flex flex-col items-center gap-4 w-full px-3">
          {/* Email / API Status Pill Indicator */}
          <Link
            href={isHr ? '/hr/settings' : '/company/dashboard'}
            className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all group relative"
            title="Integrations & Settings"
          >
            <Mail className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0B132B]" />

            {/* Tooltip */}
            <div className="absolute left-[64px] px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 shadow-xl border border-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Gmail API Active</span>
            </div>
          </Link>

          {/* User Profile Avatar with Flyout */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold text-xs flex items-center justify-center border-2 border-slate-700 hover:border-blue-400 transition-all cursor-pointer relative shadow-md group"
              title={user?.name || 'User Account'}
              aria-label="User Account Menu"
            >
              <span>{userInitials}</span>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B132B]" />
            </button>

            {/* Flyout Profile Card */}
            {showUserMenu && (
              <div
                className="absolute left-[62px] bottom-0 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 text-slate-900 animate-in fade-in slide-in-from-left-2 duration-150"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.name || 'Recruiter'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      <ShieldCheck className="w-3 h-3" />
                      {user?.role === 'HR' ? 'HR Administrator' : 'Company Reviewer'}
                    </span>
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <Link
                    href={isHr ? '/hr/settings' : '/company/dashboard'}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Workspace Settings</span>
                  </Link>
                  <button
                    onClick={() => authService.logout()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 text-left transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE SLIDE-OVER DRAWER (Visible on mobile viewports when isOpen)      */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[#0B132B] text-white z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:hidden shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section */}
        <div>
          <div className="h-18 flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <Link
              href={isHr ? '/hr/dashboard' : '/company/dashboard'}
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <RecruitFlowLogo variant="full" size={36} showTagline={true} />
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-5">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Main Menu
            </p>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/hr/dashboard' &&
                    item.href !== '/company/dashboard' &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white text-[#0B132B] font-bold shadow-md'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-slate-700">
                {userInitials}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={() => authService.logout()}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

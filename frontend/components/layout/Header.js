'use client';

import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header({ user, onMenuClick }) {
  const pathname = usePathname();

  // Determine current page title from pathname
  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/jobs')) return 'Job Openings';
    if (pathname.includes('/candidates')) return 'Candidate Pipeline';
    if (pathname.includes('/evaluations')) return 'Interview Evaluations';
    return 'Workspace';
  };

  const getBreadcrumb = () => {
    const role = user?.role === 'HR' ? 'HR Portal' : 'Company Portal';
    return `${role} / ${getPageTitle()}`;
  };

  return (
    <header className="h-16 bg-white/85 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 focus:outline-none transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-950 tracking-tight leading-none">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 hidden sm:block font-medium">
            {getBreadcrumb()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Bell */}
        <button
          onClick={() => alert('Notifications will be available in future phases.')}
          className="relative p-2 rounded-xl text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors focus:outline-none"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-black rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-zinc-200 mx-1 hidden sm:block" />

        {/* User Profile Menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}

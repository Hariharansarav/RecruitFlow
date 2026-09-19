'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, User as UserIcon, ChevronDown, Settings } from 'lucide-react';
import authService from '@/services/authService';

export default function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate 1-2 letter initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const initials = getInitials(user?.name);
  const isHr = user?.role === 'HR';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-zinc-100 transition-colors focus:outline-none"
        aria-label="User profile menu"
      >
        <div className="w-9 h-9 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center shadow-xs border border-zinc-900">
          {initials}
        </div>

        <div className="hidden md:flex flex-col text-left">
          <span className="text-sm font-semibold text-zinc-900 line-clamp-1 leading-tight">
            {user?.name || 'User'}
          </span>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            {user?.role || 'Guest'}
          </span>
        </div>

        <ChevronDown className="w-4 h-4 text-zinc-400 hidden md:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-2.5 border-b border-zinc-100">
            <p className="text-sm font-bold text-zinc-950 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{user?.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/hr/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors text-left font-medium"
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              <span>Email & Settings</span>
            </Link>
          </div>

          <div className="border-t border-zinc-100 pt-1">
            <button
              onClick={() => authService.logout()}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

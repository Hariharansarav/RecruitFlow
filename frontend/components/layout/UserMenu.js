'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, ChevronDown, Settings, User } from 'lucide-react';
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full glass-pill p-0.5 flex items-center justify-center hover:border-blue-400 hover:shadow-glass hover:scale-105 transition-all focus:outline-none relative group"
        aria-label="User profile menu"
        title={user?.name || 'User Profile'}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-white">
          {initials}
        </div>
        <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
      </button>

      {/* Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-60 bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-glass-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-2.5 border-b border-zinc-100/80">
            <p className="text-sm font-bold text-zinc-950 truncate">
              {user?.name || 'Recruiter'}
            </p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{user?.email}</p>
          </div>

          <div className="py-1.5 px-1.5">
            <Link
              href="/hr/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-blue-50 hover:text-blue-700 transition-all text-left"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Workspace Settings</span>
            </Link>
          </div>

          <div className="border-t border-zinc-100/80 pt-1.5 px-1.5">
            <button
              onClick={() => authService.logout()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

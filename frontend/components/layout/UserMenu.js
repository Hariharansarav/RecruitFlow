'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
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
        className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="User profile menu"
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs text-white shadow-sm ${
            isHr ? 'bg-brand-600' : 'bg-accent-600'
          }`}
        >
          {initials}
        </div>

        <div className="hidden md:flex flex-col text-left">
          <span className="text-sm font-semibold text-slate-800 line-clamp-1 leading-tight">
            {user?.name || 'User'}
          </span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {user?.role || 'Guest'}
          </span>
        </div>

        <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                alert('User Profile details will be available in future phases.');
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span>Profile Settings</span>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={() => authService.logout()}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

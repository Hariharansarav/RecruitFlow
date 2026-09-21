'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children, role, user }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col justify-start selection:bg-blue-600 selection:text-white">
      {/* Full-bleed Canvas Container with no side gaps */}
      <div className="w-full flex-1 flex flex-col relative">
        {/* Floating Capsule Header */}
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 py-4 sm:py-6 px-4 sm:px-8 lg:px-10 w-full">
          {children}
        </main>
      </div>

      {/* Mobile Drawer (Only visible on mobile when toggled) */}
      <Sidebar
        role={role}
        user={user}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
}

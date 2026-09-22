'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children, role, user }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#F4F6F8] flex justify-start selection:bg-slate-900 selection:text-white">
      {/* Permanent Left Slim Sidebar on desktop + Mobile Drawer */}
      <Sidebar
        role={role}
        user={user}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Column (offset by 76px on desktop) */}
      <div className="w-full flex-1 flex flex-col relative lg:pl-[76px] min-h-screen">
        {/* Top Header */}
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 pb-10 px-4 sm:px-8 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

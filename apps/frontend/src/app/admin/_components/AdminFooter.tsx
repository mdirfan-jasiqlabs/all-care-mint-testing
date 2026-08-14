'use client';

import React from 'react';

export default function AdminFooter() {
  return (
    <footer
      id="admin-footer"
      className="w-full px-4 sm:px-8 py-3.5 border-t border-white/[0.08] bg-[#020617] text-slate-400 text-xs flex items-center justify-start z-10 shrink-0"
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
        <span className="font-medium text-slate-400">
          © {new Date().getFullYear()} All Care Mint Operations Team
        </span>
      </div>
    </footer>
  );
}

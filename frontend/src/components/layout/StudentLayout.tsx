import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, MessageSquareHeart, ShieldCheck, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import type { PublicPortalInfo } from '@/types';

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [info, setInfo] = useState<PublicPortalInfo | null>(null);

  useEffect(() => {
    api.getPortalInfo().then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-blue-50/25 to-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm group-hover:bg-blue-700 transition-colors">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold text-slate-900 sm:text-base">
                {info?.portalTitle || 'College Quiz & Feedback Portal'}
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                {info?.collegeName || 'Academic Excellence & Anonymous Student Voice'}
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/feedback"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                location.pathname.startsWith('/feedback')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <MessageSquareHeart className="h-4 w-4" />
              <span>Feedback</span>
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Admin Portal</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 py-5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              Student quiz responses &amp; feedback are stored without student identity or account links.
            </span>
          </div>
          <span className="text-slate-400">
            {info?.collegeName || 'College Quiz & Anonymous Feedback Portal'}
          </span>
        </div>
      </footer>
    </div>
  );
}

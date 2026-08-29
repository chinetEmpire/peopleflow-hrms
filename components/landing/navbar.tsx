'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'relative transition-all duration-300',
        scrolled
          ? 'bg-slate-950/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.16)] border-b border-white/10'
          : 'bg-transparent'
      )}
    >
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="flowHR" className="h-9 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-white">flowHR</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-200">
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-white">
            How It Works
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="rounded-2xl border border-white/10 text-white hover:bg-white/10">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-2xl bg-gradient-to-r from-[#60a5fa] to-[#ec4899] text-white shadow-lg shadow-[#60a5fa]/20 hover:brightness-105">
              Get Started
            </Button>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="md:hidden rounded-lg text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-slate-950 border-t border-white/10 shadow-2xl shadow-black/25">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" className="block rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-white/5" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <a href="#how-it-works" className="block rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-white/5" onClick={() => setMobileOpen(false)}>
              How It Works
            </a>
            <a href="#pricing" className="block rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-white/5" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full rounded-2xl text-white border border-white/10 hover:bg-white/5">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                <Button className="w-full rounded-2xl bg-gradient-to-r from-[#60a5fa] to-[#ec4899] text-white hover:brightness-105">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

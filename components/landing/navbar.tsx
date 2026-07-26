'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, Menu, X } from 'lucide-react';
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
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-border/50'
          : 'bg-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#032364]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#051536]">HR Platform</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-[#051536] transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-[#051536] transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-[#051536] transition-colors">
            Pricing
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="rounded-lg text-[#032364]">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-lg bg-[#032364] hover:bg-[#032364]/90 text-white">
              Get Started
            </Button>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="md:hidden rounded-lg"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-border/50 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-muted-foreground hover:text-[#051536] py-2" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-[#051536] py-2" onClick={() => setMobileOpen(false)}>
              How It Works
            </a>
            <a href="#pricing" className="block text-sm text-muted-foreground hover:text-[#051536] py-2" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
            <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full rounded-lg text-[#032364]">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                <Button className="w-full rounded-lg bg-[#032364] hover:bg-[#032364]/90 text-white">
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

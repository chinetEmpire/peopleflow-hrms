import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-[#032364]/5 via-[#032364]/3 to-transparent blur-3xl" />
        <div className="absolute top-20 right-0 h-[300px] w-[300px] rounded-full bg-[#f2e9e9] blur-3xl" />
        <div className="absolute top-40 left-0 h-[200px] w-[200px] rounded-full bg-[#e8e1f0] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#032364]/10 bg-[#032364]/5 px-4 py-1.5 text-sm text-[#032364]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Modern HR for Growing Teams</span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-[#051536] sm:text-5xl lg:text-6xl">
          Manage Your Workforce{' '}
          <span className="text-[#032364]">Effortlessly</span>
        </h1>

        {/* Subtext */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Streamline employee management, attendance tracking, payroll processing, 
          and leave management — all in one powerful, secure platform built for modern organizations.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="rounded-xl bg-[#032364] hover:bg-[#032364]/90 text-white px-8 py-6 text-base font-medium shadow-lg shadow-[#032364]/25 hover:shadow-xl hover:shadow-[#032364]/30 transition-all">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="rounded-xl px-8 py-6 text-base font-medium border-[#032364]/20 text-[#032364] hover:bg-[#032364]/5">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-sm text-muted-foreground">
          No credit card required &middot; Free plan available
        </p>

        {/* Dashboard preview */}
        <div className="mt-16 mx-auto max-w-5xl">
          <div className="relative rounded-2xl border border-border/50 bg-white p-2 shadow-2xl shadow-[#032364]/10">
            <div className="rounded-xl overflow-hidden bg-[#f2e9e9]">
              {/* Mock dashboard */}
              <div className="flex h-10 items-center gap-2 border-b border-border/50 bg-white px-4">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <div className="ml-4 h-3 w-32 rounded bg-muted" />
              </div>
              <div className="flex">
                <div className="hidden sm:block w-48 bg-[#051536] p-4 space-y-3">
                  <div className="h-4 w-24 rounded bg-white/20" />
                  <div className="h-3 w-20 rounded bg-white/10" />
                  <div className="h-3 w-28 rounded bg-white/10" />
                  <div className="h-3 w-16 rounded bg-white/10" />
                  <div className="h-3 w-24 rounded bg-white/10" />
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-lg bg-white p-3 vcgl-shadow">
                      <div className="h-2 w-12 rounded bg-muted" />
                      <div className="mt-2 h-4 w-8 rounded bg-[#032364]/20" />
                    </div>
                    <div className="h-16 rounded-lg bg-white p-3 vcgl-shadow">
                      <div className="h-2 w-12 rounded bg-muted" />
                      <div className="mt-2 h-4 w-8 rounded bg-green-500/20" />
                    </div>
                    <div className="h-16 rounded-lg bg-white p-3 vcgl-shadow">
                      <div className="h-2 w-12 rounded bg-muted" />
                      <div className="mt-2 h-4 w-8 rounded bg-amber-500/20" />
                    </div>
                  </div>
                  <div className="h-32 rounded-lg bg-white vcgl-shadow p-4 space-y-2">
                    <div className="h-2 w-24 rounded bg-muted" />
                    <div className="h-2 w-full rounded bg-muted/50" />
                    <div className="h-2 w-3/4 rounded bg-muted/50" />
                    <div className="h-2 w-5/6 rounded bg-muted/50" />
                    <div className="h-2 w-2/3 rounded bg-muted/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

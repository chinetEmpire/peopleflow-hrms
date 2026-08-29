import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { FadeIn, SlideUp } from './animations';

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-[#020316] text-white">
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#ec4899]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 px-6 py-16 shadow-2xl shadow-slate-950/40 sm:px-12 sm:py-20 text-center">
            <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.12),transparent_35%)]" />
            <div className="relative z-10">
              <SlideUp>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                  Ready to Simplify HR?
                </h2>
              </SlideUp>

              <SlideUp delay={100}>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                  Join hundreds of growing businesses using one affordable HR platform to manage their workforce. Stop wasting time on spreadsheets. Start focusing on growing your business.
                </p>
              </SlideUp>

              <SlideUp delay={200}>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/register">
                    <Button size="lg" className="rounded-3xl bg-gradient-to-r from-[#60a5fa] via-[#8b5cf6] to-[#ec4899] px-8 py-6 text-base font-medium text-white shadow-lg shadow-[#60a5fa]/20 hover:brightness-110">
                      Start Free Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" className="rounded-3xl bg-white px-8 py-6 text-base font-medium text-black hover:bg-black hover:text-white transition-colors duration-200">
                      Schedule a Live Demo
                    </Button>
                  </Link>
                </div>
              </SlideUp>

              <SlideUp delay={300}>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {['No credit card required', 'Free plan available', 'Setup in minutes'].map((item) => (
                    <div key={item} className="flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm text-slate-200 shadow-lg shadow-slate-950/20">
                      <CheckCircle2 className="h-4 w-4 text-[#60a5fa]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </SlideUp>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

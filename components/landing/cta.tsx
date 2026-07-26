import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { FadeIn, SlideUp } from './animations';

export function CTASection() {
  return (
    <section className="py-20 sm:py-28 bg-[#f2e9e9]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-[#051536] px-6 py-16 sm:px-12 sm:py-20 text-center">
            <div className="absolute inset-0 -z-0">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#032364]/30 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#032364]/20 blur-3xl" />
            </div>

            <div className="relative z-10">
              <SlideUp>
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Ready to Simplify HR?
                </h2>
              </SlideUp>

              <SlideUp delay={100}>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
                  Join hundreds of growing businesses using one affordable HR platform to manage their workforce.
                  Stop wasting time on spreadsheets. Start focusing on growing your business.
                </p>
              </SlideUp>

              <SlideUp delay={200}>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register">
                    <Button size="lg" className="rounded-xl bg-white text-[#051536] hover:bg-white/90 px-8 py-6 text-base font-medium shadow-lg">
                      Start Free Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="ghost" className="rounded-xl px-8 py-6 text-base font-medium text-white hover:bg-white/10">
                      Schedule a Live Demo
                    </Button>
                  </Link>
                </div>
              </SlideUp>

              <SlideUp delay={300}>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {['No credit card required', 'Free plan available', 'Setup in minutes'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-sm text-white/60">
                      <CheckCircle2 className="h-3.5 w-3.5" />
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

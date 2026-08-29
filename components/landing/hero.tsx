import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { FadeIn, SlideUp, ScaleIn } from './animations';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#020316] pt-28 pb-24 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.16),transparent_40%)]" />
      <div className="pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-[#ec4899]/20 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-32 h-72 w-72 rounded-full bg-[#60a5fa]/20 blur-3xl" />
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:px-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="relative z-10">
          <SlideUp delay={100}>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              HR Management Made{' '}
              <span className="bg-gradient-to-r from-[#60a5fa] via-[#a78bfa] to-[#f472b6] bg-clip-text text-transparent">
                Simple.
              </span>
            </h1>
          </SlideUp>

          <SlideUp delay={200}>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Everything your business needs to manage employees—without the enterprise price.
            </p>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
              Stop managing your employees with spreadsheets, notebooks, and WhatsApp messages. Manage attendance, leave, payroll, employee records, performance, and HR processes from one easy-to-use platform built specifically for Nigerian businesses.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/register">
                <Button size="lg" className="rounded-3xl bg-gradient-to-r from-[#60a5fa] via-[#8b5cf6] to-[#ec4899] px-8 py-6 text-base font-medium text-white shadow-2xl shadow-[#60a5fa]/20 hover:brightness-110">
                  Start Free Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" className="rounded-3xl bg-white px-8 py-6 text-base font-medium text-black shadow-lg shadow-slate-950/10 transition-colors duration-200 hover:bg-black hover:text-white">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </SlideUp>

          <SlideUp delay={500}>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {['No credit card required', 'Setup in minutes', 'Cancel anytime'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-lg shadow-slate-950/20">
                  <CheckCircle2 className="h-4 w-4 text-[#60a5fa]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SlideUp>
        </div>

        <ScaleIn delay={600}>
          <div className="flex justify-center">
            <video
              className="h-auto max-h-[32rem] w-auto max-w-full rounded-[2rem] object-contain mix-blend-multiply"
              src="https://res.cloudinary.com/k3fsipdt/video/upload/v1787906907/iphone_16_pro_hr_dashboard_mockup.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="HR dashboard product preview"
            />
          </div>
        </ScaleIn>
      </div>
    </section>
  );
}

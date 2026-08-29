import { Building2, UserPlus, LayoutDashboard } from 'lucide-react';
import { FadeIn, StaggerItem } from './animations';

const steps = [
  {
    icon: Building2,
    number: '01',
    title: 'Create Your Account',
    description: 'Create your company account in minutes. No complex setup required.',
  },
  {
    icon: UserPlus,
    number: '02',
    title: 'Add Your Employees',
    description: 'Add your employees manually or import them from Excel. Start managing the same day.',
  },
  {
    icon: LayoutDashboard,
    number: '03',
    title: 'Start Managing',
    description: 'Start managing attendance, leave, payroll, and employee records from one dashboard. That\'s it.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 bg-[#020316] text-white">
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#ec4899]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#60a5fa] mb-3">
              Simple Setup
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Get Started in Three Simple Steps
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              No complex configuration needed. Start managing your team in minutes.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <StaggerItem key={step.number} delay={index * 150}>
              <div className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+60px)] w-[calc(100%-120px)] h-[2px] bg-gradient-to-r from-[#032364]/20 to-[#032364]/5" />
                )}

                <div className="relative text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 text-[#60a5fa] shadow-2xl shadow-slate-950/20 border border-white/10 transition-transform duration-300 hover:scale-110">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#60a5fa] text-xs font-semibold text-slate-950">
                    {step.number}
                  </span>
                  <h3 className="mt-6 text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300 max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </div>
      </div>
    </section>
  );
}

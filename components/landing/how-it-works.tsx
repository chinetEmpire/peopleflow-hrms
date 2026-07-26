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
    <section id="how-it-works" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
              Simple Setup
            </p>
            <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
              Get Started in Three Simple Steps
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
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
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#032364]/10 border border-border/50 transition-transform duration-300 hover:scale-110">
                    <step.icon className="h-8 w-8 text-[#032364]" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#032364] text-xs font-bold text-white">
                    {step.number}
                  </span>
                  <h3 className="mt-6 text-lg font-semibold text-[#051536]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
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

import { Building2, UserPlus, LayoutDashboard } from 'lucide-react';

const steps = [
  {
    icon: Building2,
    number: '01',
    title: 'Create Your Organization',
    description: 'Sign up and set up your organization in minutes. Add your company details, branding, and preferences.',
  },
  {
    icon: UserPlus,
    number: '02',
    title: 'Invite Your Team',
    description: 'Add employees by email or invite them directly. Assign roles and departments with ease.',
  },
  {
    icon: LayoutDashboard,
    number: '03',
    title: 'Manage Everything',
    description: 'Track attendance, process payroll, manage leaves, and generate reports — all from one dashboard.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#f2e9e9]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
            Simple Setup
          </p>
          <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
            Get Started in Three Steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No complex configuration needed. Start managing your team in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+60px)] w-[calc(100%-120px)] h-[2px] bg-gradient-to-r from-[#032364]/20 to-[#032364]/5" />
              )}

              <div className="relative text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#032364]/10 border border-border/50">
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
          ))}
        </div>
      </div>
    </section>
  );
}

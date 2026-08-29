import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    description: 'Perfect for small teams getting started',
    monthly: 0,
    yearly: 0,
    maxEmployees: '10',
    maxDepartments: '3',
    features: [
      'Up to 10 employees',
      '3 departments',
      'Attendance tracking',
      'Basic leave management',
      'Employee profiles',
      'Standard support',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Starter',
    description: 'For growing teams that need more',
    monthly: 29,
    yearly: 290,
    maxEmployees: '50',
    maxDepartments: '10',
    features: [
      'Up to 50 employees',
      '10 departments',
      'Everything in Free',
      'Payroll processing',
      'Advanced reports',
      'Custom branding',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For organizations that need it all',
    monthly: 79,
    yearly: 790,
    maxEmployees: '200',
    maxDepartments: '50',
    features: [
      'Up to 200 employees',
      '50 departments',
      'Everything in Starter',
      'Multi-company support',
      'Advanced payroll',
      'Performance reviews',
      'API access',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    monthly: 199,
    yearly: 1990,
    maxEmployees: 'Unlimited',
    maxDepartments: 'Unlimited',
    features: [
      'Unlimited employees',
      'Unlimited departments',
      'Everything in Professional',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'SSO & SAML',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28 bg-[#020316] text-white">
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#ec4899]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#60a5fa] mb-3">
            Transparent Pricing
          </p>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Plans That Scale With You
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Start free and upgrade as your organization grows. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative rounded-[2rem] border ${
                plan.popular
                  ? 'border-[#60a5fa]/40 shadow-2xl shadow-[#60a5fa]/10'
                  : 'border-white/10'
              } bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-2xl hover:shadow-slate-950/20`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-[#60a5fa] to-[#ec4899] text-slate-950 px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-300">{plan.description}</p>

                <div className="mt-5">
                  {plan.monthly === 0 ? (
                    <div className="text-3xl font-semibold text-white">Free</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-slate-400">₦</span>
                      <span className="text-3xl font-semibold text-white">{plan.monthly}</span>
                      <span className="text-sm text-slate-400">/month</span>
                    </div>
                  )}
                  {plan.monthly > 0 && (
                    <p className="mt-1 text-xs text-slate-400">
                      ₦{plan.yearly}/year — save 2 months
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-3 text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link href="/register">
                    <Button
                      className={`w-full rounded-3xl py-3 text-base font-medium ${
                        plan.popular
                          ? 'bg-gradient-to-r from-[#60a5fa] to-[#ec4899] text-slate-950 shadow-xl shadow-[#60a5fa]/20'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

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
    <section id="pricing" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
            Transparent Pricing
          </p>
          <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
            Plans That Scale With You
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free and upgrade as your organization grows. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? 'border-[#032364] shadow-xl shadow-[#032364]/10'
                  : 'border-border/50'
              } bg-white transition-all duration-300 hover:shadow-lg`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#032364] text-white px-3 py-1 rounded-full text-xs">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#051536]">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-5">
                  {plan.monthly === 0 ? (
                    <div className="text-3xl font-bold text-[#051536]">Free</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">₦</span>
                      <span className="text-3xl font-bold text-[#051536]">{plan.monthly}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  )}
                  {plan.monthly > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ₦{plan.yearly}/year — save 2 months
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-3">
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
                      className={`w-full rounded-xl py-2.5 ${
                        plan.popular
                          ? 'bg-[#032364] hover:bg-[#032364]/90 text-white shadow-lg shadow-[#032364]/25'
                          : 'bg-[#051536]/5 hover:bg-[#051536]/10 text-[#051536]'
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

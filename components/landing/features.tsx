import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Calendar,
  Clock,
  Banknote,
  BarChart3,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Centralized employee profiles with complete lifecycle management. Onboard, track, and manage your workforce effortlessly.',
    color: '#032364',
  },
  {
    icon: Calendar,
    title: 'Attendance Tracking',
    description: 'GPS-enabled check-in and check-out with real-time tracking. Monitor attendance patterns and generate reports.',
    color: '#059669',
  },
  {
    icon: Clock,
    title: 'Leave Management',
    description: 'Configurable leave types, automated balance tracking, and approval workflows that follow your organization policy.',
    color: '#d97706',
  },
  {
    icon: Banknote,
    title: 'Payroll Processing',
    description: 'Automated payroll runs with payslip generation. Handle salaries, deductions, and compensation in one place.',
    color: '#7c3aed',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Insightful reports on attendance, leaves, and workforce trends. Make data-driven HR decisions with ease.',
    color: '#0891b2',
  },
  {
    icon: Shield,
    title: 'Role-Based Security',
    description: 'Multi-tenant architecture with granular role-based access control. Your data stays isolated and secure.',
    color: '#dc2626',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
            Everything You Need
          </p>
          <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
            Powerful Features for Modern HR
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete suite of tools to manage your entire workforce — from hiring to payroll.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group rounded-2xl border border-border/50 bg-white hover:shadow-xl hover:shadow-[#032364]/5 transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-7">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: feature.color + '12' }}
                >
                  <feature.icon
                    className="h-6 w-6"
                    style={{ color: feature.color }}
                  />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#051536]">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

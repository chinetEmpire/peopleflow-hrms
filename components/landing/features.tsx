import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Calendar,
  Clock,
  Banknote,
  BarChart3,
  Shield,
  FileText,
  Smartphone,
} from 'lucide-react';
import { FadeIn, StaggerItem } from './animations';

const features = [
  {
    icon: Users,
    title: 'Employee Records',
    description: 'Store employee information, documents, contracts, emergency contacts, and employment history securely.',
    color: '#032364',
  },
  {
    icon: Calendar,
    title: 'Attendance Management',
    description: 'Track staff attendance, lateness, working hours, and absences with real-time reports.',
    color: '#059669',
  },
  {
    icon: Clock,
    title: 'Leave Management',
    description: 'Employees can request leave online while managers approve requests in just a few clicks.',
    color: '#d97706',
  },
  {
    icon: Banknote,
    title: 'Payroll Support',
    description: 'Generate payroll data quickly and reduce errors caused by manual calculations.',
    color: '#7c3aed',
  },
  {
    icon: BarChart3,
    title: 'Performance Management',
    description: 'Set goals, conduct employee reviews, and monitor staff performance over time.',
    color: '#0891b2',
  },
  {
    icon: Smartphone,
    title: 'Employee Self-Service',
    description: 'Employees can update personal information, request leave, download documents, and access company information without contacting HR.',
    color: '#059669',
  },
  {
    icon: FileText,
    title: 'Reports & Analytics',
    description: 'Get insights into attendance, workforce trends, leave balances, and employee performance.',
    color: '#dc2626',
  },
  {
    icon: Shield,
    title: 'Secure Cloud Access',
    description: 'Access your HR system from anywhere using your phone, tablet, or computer.',
    color: '#032364',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
              One Platform for Your Entire Workforce
            </p>
            <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
              Everything You Need in One Platform
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our HR platform brings every HR process into one secure cloud system, making it easier
              to manage your employees from anywhere.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <StaggerItem key={feature.title} delay={i * 80}>
              <Card className="group h-full rounded-2xl border border-border/50 bg-white hover:shadow-xl hover:shadow-[#032364]/5 transition-all duration-300 hover:-translate-y-1">
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
            </StaggerItem>
          ))}
        </div>
      </div>
    </section>
  );
}

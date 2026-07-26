import {
  Wallet,
  ThumbsUp,
  Zap,
  HeadphonesIcon,
  TrendingUp,
} from 'lucide-react';
import { FadeIn, StaggerItem } from './animations';

const reasons = [
  {
    icon: Wallet,
    title: 'Affordable Pricing',
    points: ['No huge setup fees', 'No expensive annual contracts', 'Only pay for what your business needs'],
    color: '#059669',
  },
  {
    icon: ThumbsUp,
    title: 'Easy to Use',
    points: ['No HR expert required', 'Your team can start using the platform within minutes', 'Intuitive interface'],
    color: '#032364',
  },
  {
    icon: Zap,
    title: 'Fast Setup',
    points: ['Import your employees and start managing the same day', 'No complex configuration', 'Get started in minutes'],
    color: '#d97706',
  },
  {
    icon: HeadphonesIcon,
    title: 'Local Support',
    points: ['Our Nigerian support team is always available', 'We understand your business needs', 'Responsive help desk'],
    color: '#7c3aed',
  },
  {
    icon: TrendingUp,
    title: 'Scales With Your Business',
    points: ['Start with 5 employees', 'Grow to 500+ without changing systems', 'Flexible plans for every stage'],
    color: '#dc2626',
  },
];

export function WhyChooseUsSection() {
  return (
    <section className="py-20 sm:py-28 bg-[#f2e9e9]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
              Why Choose Us
            </p>
            <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
              Built for Nigerian Businesses
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Unlike expensive international HR software designed for large corporations,
              we built this platform for businesses like yours.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, i) => (
            <StaggerItem key={reason.title} delay={i * 100}>
              <div className="group h-full rounded-2xl border border-border/50 bg-white p-7 transition-all duration-300 hover:shadow-xl hover:shadow-[#032364]/5 hover:-translate-y-1">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: reason.color + '12' }}
                >
                  <reason.icon className="h-6 w-6" style={{ color: reason.color }} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#051536]">
                  {reason.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {reason.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#032364]" />
                      <span className="text-sm text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          ))}
        </div>
      </div>
    </section>
  );
}

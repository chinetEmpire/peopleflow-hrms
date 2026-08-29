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
    <section className="relative py-20 sm:py-28 bg-[#020316] text-white">
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#ec4899]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#60a5fa] mb-3">
              Why Choose Us
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Built for Nigerian Businesses
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Unlike expensive international HR software designed for large corporations, we built this platform for businesses like yours.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, i) => (
            <StaggerItem key={reason.title} delay={i * 100}>
              <div className="group h-full rounded-[2rem] border border-white/10 bg-white/5 p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-2xl hover:shadow-slate-950/20">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-3xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: reason.color + '12' }}
                >
                  <reason.icon className="h-6 w-6" style={{ color: reason.color }} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {reason.title}
                </h3>
                <ul className="mt-3 space-y-2 text-slate-300">
                  {reason.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#60a5fa]" />
                      <span className="text-sm leading-6">{point}</span>
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

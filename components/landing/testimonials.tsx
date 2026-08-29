import { FadeIn, StaggerItem } from './animations';

const testimonials = [
  {
    quote: 'We replaced three Excel files and countless WhatsApp messages with one simple platform. Managing our employees has never been easier.',
    author: 'Business Owner',
    location: 'Lagos',
  },
  {
    quote: 'The leave approval process alone saves our HR team several hours every week.',
    author: 'HR Manager',
    location: 'Abuja',
  },
  {
    quote: 'Affordable, simple, and built for businesses like ours.',
    author: 'Startup Founder',
    location: 'Port Harcourt',
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative py-20 sm:py-28 bg-[#020316] text-white">
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#ec4899]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#60a5fa] mb-3">
              Testimonials
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Businesses Love How Easy HR Has Become
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <StaggerItem key={item.author} delay={i * 120}>
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:-translate-y-1">
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-white/90 leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <div className="mt-6">
                  <p className="text-sm font-medium text-white">{item.author}</p>
                  <p className="text-xs text-white/50">{item.location}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </div>
      </div>
    </section>
  );
}

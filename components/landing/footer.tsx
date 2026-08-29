import Link from 'next/link';
import { FadeIn } from './animations';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Security', href: '#' },
    { label: 'Integrations', href: '#' },
    { label: 'Updates', href: '#' },
  ],
  solutions: [
    { label: 'Small Businesses', href: '#' },
    { label: 'Schools', href: '#' },
    { label: 'NGOs', href: '#' },
    { label: 'Startups', href: '#' },
    { label: 'Professional Services', href: '#' },
  ],
  resources: [
    { label: 'Help Center', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'HR Guides', href: '#' },
    { label: 'Documentation', href: '#' },
    { label: 'FAQs', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export function LandingFooter() {
  return (
    <footer className="bg-[#020316] text-slate-300">
      <div className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#60a5fa]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#ec4899]/10 blur-3xl" />

        <FadeIn>
          <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-3">
                <img src="/logo.png" alt="flowHR" className="h-12 w-auto" />
                <div>
                  <p className="text-lg font-semibold text-white">flowHR</p>
                  <p className="mt-2 max-w-xs text-sm text-slate-400">
                    Built for Nigerian businesses. Designed to help small businesses grow.
                  </p>
                </div>
              </Link>
            </div>

            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
                  {category}
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <a href={link.href} className="transition-colors hover:text-white">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="transition-colors hover:text-white">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeIn>

        <div className="relative z-10 mt-12 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex sm:items-center sm:justify-between">
          <p>Making HR simple and affordable for every Nigerian business.</p>
          <p>&copy; {new Date().getFullYear()} flowHR. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

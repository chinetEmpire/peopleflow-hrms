import Link from 'next/link';
import { Building2 } from 'lucide-react';
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
    <footer className="border-t border-border/50 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#032364]">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-[#051536]">HR Platform</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Built for Nigerian businesses. Designed to help small businesses grow.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Affordable.</span>
                <span className="text-xs text-muted-foreground">Simple.</span>
                <span className="text-xs text-muted-foreground">Reliable.</span>
              </div>
            </div>

            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-[#051536] mb-4 capitalize">{category}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <a href={link.href} className="text-sm text-muted-foreground hover:text-[#032364] transition-colors">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="text-sm text-muted-foreground hover:text-[#032364] transition-colors">
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

        <div className="border-t border-border/50 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Making HR simple and affordable for every Nigerian business.
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} HR Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

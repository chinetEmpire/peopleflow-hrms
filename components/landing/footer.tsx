import Link from 'next/link';
import { Building2 } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#032364]">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#051536]">HR Platform</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Modern human resource management platform for growing organizations.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[#051536] mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-muted-foreground hover:text-[#032364] transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-[#032364] transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-[#032364] transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-[#051536] mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><span className="text-sm text-muted-foreground">About Us</span></li>
              <li><span className="text-sm text-muted-foreground">Careers</span></li>
              <li><span className="text-sm text-muted-foreground">Contact</span></li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h4 className="text-sm font-semibold text-[#051536] mb-4">Get Started</h4>
            <ul className="space-y-2.5">
              <li><Link href="/register" className="text-sm text-muted-foreground hover:text-[#032364] transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="text-sm text-muted-foreground hover:text-[#032364] transition-colors">Sign In</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} HR Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Privacy Policy</span>
            <span className="text-xs text-muted-foreground">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

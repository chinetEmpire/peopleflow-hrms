'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { LandingNavbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero';
import { FeaturesSection } from '@/components/landing/features';
import { HowItWorksSection } from '@/components/landing/how-it-works';
import { PricingSection } from '@/components/landing/pricing';
import { CTASection } from '@/components/landing/cta';
import { LandingFooter } from '@/components/landing/footer';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { organization, loading: tenantLoading } = useTenant();
  const loading = authLoading || tenantLoading;

  useEffect(() => {
    if (loading) return;

    // On a subdomain (org portal): require auth
    if (organization) {
      if (user && profile) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    // On root domain (no org): redirect logged-in users to dashboard
    if (user && profile) {
      router.replace('/dashboard');
    }
  }, [user, profile, organization, loading, router]);

  // Show landing page while loading or when user is not logged in
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2e9e9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  // If logged in with org, don't show landing (will redirect)
  if (organization && user && profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2e9e9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  // Show landing page
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}

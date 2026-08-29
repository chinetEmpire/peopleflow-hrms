'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { LandingNavbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero';
import { TrustSection } from '@/components/landing/trust';
import { ProblemSection } from '@/components/landing/problem';
import { FeaturesSection } from '@/components/landing/features';
import { WhyChooseUsSection } from '@/components/landing/why-choose-us';
import { HowItWorksSection } from '@/components/landing/how-it-works';
import { TestimonialsSection } from '@/components/landing/testimonials';
import { PricingSection } from '@/components/landing/pricing';
import { FAQSection } from '@/components/landing/faq';
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

    if (organization) {
      if (user && profile) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    if (user && profile) {
      router.replace('/dashboard');
    }
  }, [user, profile, organization, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050816]">
        <Loader2 className="h-8 w-8 animate-spin text-[#60a5fa]" />
      </div>
    );
  }

  if (organization && user && profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050816]">
        <Loader2 className="h-8 w-8 animate-spin text-[#60a5fa]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020316] text-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <TrustSection />
        <ProblemSection />
        <FeaturesSection />
        <WhyChooseUsSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}

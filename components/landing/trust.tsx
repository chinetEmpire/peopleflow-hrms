import {
  Building2,
  GraduationCap,
  Heart,
  ShoppingBag,
  Factory,
  Stethoscope,
  HardHat,
  Truck,
  Briefcase,
  Landmark,
} from 'lucide-react';
import { FadeIn, StaggerItem } from './animations';

const industries = [
  { icon: Building2, label: 'Small Businesses' },
  { icon: Briefcase, label: 'Startups' },
  { icon: GraduationCap, label: 'Schools' },
  { icon: Heart, label: 'NGOs' },
  { icon: ShoppingBag, label: 'Retail Stores' },
  { icon: HardHat, label: 'Construction' },
  { icon: Stethoscope, label: 'Hospitals & Clinics' },
  { icon: Factory, label: 'Manufacturing' },
  { icon: Landmark, label: 'Professional Services' },
  { icon: Truck, label: 'Logistics' },
];

export function TrustSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-[#020316] text-white">
      <div className="pointer-events-none absolute right-20 top-0 h-72 w-72 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-64 w-64 rounded-full bg-[#ec4899]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#60a5fa] mb-3">
              Trusted by Growing Nigerian Businesses
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Built for Businesses Like Yours
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Whether you run a company with 5 employees or 500, our platform helps you save time, reduce paperwork, and focus on growing your business.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {industries.map((item, i) => (
            <StaggerItem key={item.label} delay={i * 60}>
              <div className="group flex flex-col items-center gap-3 rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#60a5fa]/20 hover:bg-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#60a5fa] transition-colors duration-300 group-hover:bg-[#60a5fa]/10">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-slate-100">{item.label}</span>
              </div>
            </StaggerItem>
          ))}
        </div>
      </div>
    </section>
  );
}

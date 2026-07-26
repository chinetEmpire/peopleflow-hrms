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
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
              Trusted by Growing Nigerian Businesses
            </p>
            <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
              Built for Businesses Like Yours
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Whether you run a company with 5 employees or 500, our platform helps you save time,
              reduce paperwork, and focus on growing your business.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {industries.map((item, i) => (
            <StaggerItem key={item.label} delay={i * 60}>
              <div className="group flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-white p-6 transition-all duration-300 hover:border-[#032364]/20 hover:shadow-lg hover:shadow-[#032364]/5 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#032364]/5 transition-colors duration-300 group-hover:bg-[#032364]/10">
                  <item.icon className="h-6 w-6 text-[#032364]" />
                </div>
                <span className="text-sm font-medium text-[#051536] text-center">{item.label}</span>
              </div>
            </StaggerItem>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import {
  getPlans,
  getCurrentSubscription,
  createSubscription,
  updateSubscriptionPlan,
  formatPrice,
  formatLimit,
  isPlanActive,
  type Plan,
  type Subscription,
} from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Zap,
  Crown,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Sparkles,
  starter: Zap,
  pro: Crown,
  enterprise: Building2,
};

export default function UpgradePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { organization } = useTenant();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace('/login');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    async function loadData() {
      setLoadingPlans(true);
      const [plansData, subData] = await Promise.all([
        getPlans(),
        profile?.org_id ? getCurrentSubscription(profile.org_id) : Promise.resolve(null),
      ]);
      setPlans(plansData);
      setCurrentSub(subData);
      if (subData) {
        setSelectedPlan(subData.plan_id);
        setBillingCycle(subData.billing_cycle);
      } else {
        setSelectedPlan(organization?.plan || 'free');
      }
      setLoadingPlans(false);
    }
    if (profile?.org_id) loadData();
  }, [profile?.org_id, organization?.plan]);

  async function handleUpgrade() {
    if (!selectedPlan || !profile?.org_id) return;
    setUpgrading(true);
    try {
      if (currentSub && isPlanActive(currentSub.status)) {
        const success = await updateSubscriptionPlan(profile.org_id, selectedPlan, billingCycle);
        if (success) {
          toast.success('Plan updated successfully!');
          router.push('/billing');
        } else {
          toast.error('Failed to update plan. Please try again.');
        }
      } else {
        const sub = await createSubscription(profile.org_id, selectedPlan, billingCycle);
        if (sub) {
          toast.success('Subscription activated!');
          router.push('/billing');
        } else {
          toast.error('Failed to create subscription. Please try again.');
        }
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setUpgrading(false);
    }
  }

  if (loading || loadingPlans) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push('/billing')}
          className="rounded-lg px-2 hover:bg-secondary shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-[#051536]">Upgrade Your Plan</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Choose the plan that best fits your organization
          </p>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center">
        <RadioGroup
          value={billingCycle}
          onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}
          className="flex items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="monthly" id="monthly" />
            <Label htmlFor="monthly" className="text-sm font-medium cursor-pointer">Monthly</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yearly" id="yearly" />
            <Label htmlFor="yearly" className="text-sm font-medium cursor-pointer">
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                Save ~17%
              </Badge>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id] || Sparkles;
          const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
          const monthlyEquivalent = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
          const isSelected = selectedPlan === plan.id;
          const isCurrent = currentSub?.plan_id === plan.id || (!currentSub && organization?.plan === plan.id);
          const isEnterprise = plan.max_employees === -1;

          return (
            <Card
              key={plan.id}
              className={`rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#032364] bg-[#032364]/5'
                  : 'border-[#e2e8f0] bg-white hover:border-[#032364]/30'
              } ${plan.is_popular ? 'ring-2 ring-[#032364]/20' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                    <Icon className="h-5 w-5 text-[#032364]" />
                  </div>
                  {plan.is_popular && (
                    <Badge className="text-xs bg-[#032364] text-white">Popular</Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                </div>

                <h3 className="text-base font-bold text-[#051536]">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-bold text-[#051536]">
                    {formatPrice(monthlyEquivalent)}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                  {billingCycle === 'yearly' && plan.price_yearly > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatPrice(price)}/year
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm text-[#051536]">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{isEnterprise ? 'Unlimited' : formatLimit(plan.max_employees)} employees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{isEnterprise ? 'Unlimited' : formatLimit(plan.max_departments)} departments</span>
                  </div>
                  {plan.features.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-xs">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 4 && (
                    <p className="text-xs text-muted-foreground ml-6">
                      +{plan.features.length - 4} more features
                    </p>
                  )}
                </div>

                <Button
                  className={`w-full mt-4 rounded-lg ${
                    isSelected && !isCurrent
                      ? 'bg-[#032364] hover:bg-[#032364]/90'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                  disabled={isCurrent || upgrading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCurrent) {
                      setSelectedPlan(plan.id);
                      handleUpgrade();
                    }
                  }}
                >
                  {isCurrent ? 'Current Plan' : isSelected ? 'Select' : 'Choose'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA */}
      {selectedPlan && selectedPlan !== (currentSub?.plan_id || organization?.plan) && (
        <div className="flex justify-center">
          <Button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="rounded-lg bg-[#032364] hover:bg-[#032364]/90 px-8"
          >
            {upgrading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Upgrade to {plans.find((p) => p.id === selectedPlan)?.name}</>
            )}
          </Button>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground">
        All plans include a 14-day free trial. No credit card required to start.
        Cancel anytime from your billing settings.
      </p>
    </div>
  );
}

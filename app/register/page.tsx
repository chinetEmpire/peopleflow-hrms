'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getPlans, formatPrice, type Plan } from '@/lib/billing';
import { isPaystackConfigured } from '@/lib/paystack';
import {
  Building2,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  Crown,
} from 'lucide-react';

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Sparkles,
  starter: Zap,
  pro: Crown,
};

export default function RegisterPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [orgName, setOrgName] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!authLoading && user && profile) {
      router.replace('/dashboard');
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    getPlans().then((data) => {
      setPlans(data);
      if (data.length > 0) {
        const freePlan = data.find((p) => p.id === 'free');
        setSelectedPlan(freePlan?.id ?? data[0].id);
      }
      setPlansLoading(false);
    });
  }, []);

  const selectedPlanDef = plans.find((p) => p.id === selectedPlan);
  const isPaidPlan = selectedPlanDef ? (selectedPlanDef.price_monthly > 0 || selectedPlanDef.price_yearly > 0) : false;

  function validateStep1(): boolean {
    if (!orgName.trim()) {
      setError('Organization name is required');
      return false;
    }
    if (orgName.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return false;
    }
    setError('');
    return true;
  }

  function validateStep2(): boolean {
    if (!adminFirstName.trim() || !adminLastName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!adminEmail.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    setError('');
    return true;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setError('');
      return;
    }
    if (step === 2 && validateStep2()) {
      setStep(3);
      setError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: orgName.trim(),
          adminEmail: adminEmail.trim(),
          adminFirstName: adminFirstName.trim(),
          adminLastName: adminLastName.trim(),
          adminPassword,
          plan: selectedPlan,
          billing_cycle: billingCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const { getSupabase } = await import('@/lib/supabase');
      const { data: signInData, error: signInError } = await getSupabase().auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (signInError) {
        router.push('/login?registered=true');
        return;
      }

      const token = signInData.session?.access_token ?? '';

      if (!data.requires_payment) {
        router.push('/onboarding');
        return;
      }

      // Paid plan — if the payment gateway isn't configured (e.g. local dev),
      // activate the plan directly so the account is usable.
      if (!isPaystackConfigured()) {
        const actRes = await fetch('/api/admin/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: data.orgId, plan: selectedPlan, billing_cycle: billingCycle }),
        });
        if (actRes.ok) {
          router.push('/onboarding');
        } else {
          setError('Account created, but plan activation failed. Contact support.');
        }
        setLoading(false);
        return;
      }

      // Start Paystack checkout, then return to the app to finish setup.
      const checkoutRes = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan_id: selectedPlan,
          billing_cycle: billingCycle,
          from_register: true,
        }),
      });

      const checkoutData = await checkoutRes.json();

      if (checkoutRes.ok && checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url;
      } else {
        setError(checkoutData.error || 'Failed to start payment');
        setLoading(false);
      }
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020316]">
        <Loader2 className="h-8 w-8 animate-spin text-[#60a5fa]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07021a] via-[#0b1440] to-[#30103f] py-16 px-6">
      <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-2 items-center">
        <div className="order-2 lg:order-1 lg:px-8">
          <h1 className="text-4xl font-semibold text-white lg:text-5xl">Join Our Platform Today</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Create your account in minutes and get access to HR automation, payroll, attendance, and people
            workflows built for growing Nigerian businesses.
          </p>

          <ul className="mt-8 space-y-5">
            <li className="flex items-start gap-4">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[#60a5fa]">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Secure & Protected</h4>
                <p className="text-sm text-slate-300">Your data is encrypted and protected with industry-standard security.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[#ec4899]">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Quick Verification</h4>
                <p className="text-sm text-slate-300">OTP-based verification ensures your account safety and fast onboarding.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[#fbbf24]">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">24/7 Support</h4>
                <p className="text-sm text-slate-300">Our team is available to help you get set up and stay productive.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="order-1 lg:order-2 px-4">
          <Card className="rounded-[1.25rem] bg-white p-6 shadow-2xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-slate-900">Create Account</h2>
              <p className="mt-1 text-sm text-slate-500">Fill in your details to get started</p>

              <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="mt-6 space-y-4">
                {step === 1 && (
                  <div>
                    <Label htmlFor="orgName">Organization Name</Label>
                    <div className="relative mt-2">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="orgName"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corporation"
                        className="h-11 rounded-lg pl-10"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName">Full Name</Label>
                        <div className="relative mt-2">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="firstName"
                            required
                            value={adminFirstName}
                            onChange={(e) => setAdminFirstName(e.target.value)}
                            placeholder="First"
                            className="h-11 rounded-lg pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="invisible">Last</Label>
                        <Input
                          id="lastName"
                          required
                          value={adminLastName}
                          onChange={(e) => setAdminLastName(e.target.value)}
                          placeholder="Last"
                          className="h-11 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@company.com"
                          className="h-11 rounded-lg pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative mt-2">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="h-11 rounded-lg pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative mt-2">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="h-11 rounded-lg pl-10"
                        />
                      </div>
                    </div>
</>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <div>
                        <Label>Billing Cycle</Label>
                        <RadioGroup
                          value={billingCycle}
                          onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}
                          className="mt-2 flex items-center gap-6"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="monthly" id="reg-monthly" />
                            <Label htmlFor="reg-monthly" className="cursor-pointer text-sm font-medium">
                              Monthly
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="yearly" id="reg-yearly" />
                            <Label htmlFor="reg-yearly" className="cursor-pointer text-sm font-medium">
                              Yearly
                              <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                                Save on yearly
                              </Badge>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {plansLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin text-[#0b1440]" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {plans.map((plan) => {
                            const Icon = planIcons[plan.id] ?? Sparkles;
                            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                            const monthlyEquivalent =
                              billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
                            const isSelected = selectedPlan === plan.id;
                            return (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`w-full rounded-xl border p-4 text-left transition-all ${
                                  isSelected
                                    ? 'border-[#0b1440] bg-[#0b1440]/5 ring-1 ring-[#0b1440]'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0b1440]/10 text-[#0b1440]">
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                                      <p className="text-xs text-slate-500">
                                        Up to {plan.max_employees} employees · {plan.max_departments} departments
                                      </p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1440]">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 flex items-end justify-between">
                                  <div>
                                    {plan.price_monthly > 0 ? (
                                      <>
                                        <p className="text-lg font-bold text-slate-900">
                                          ₦{formatPrice(monthlyEquivalent)}
                                          <span className="text-xs font-normal text-slate-500">/month</span>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {billingCycle === 'yearly'
                                            ? `₦${formatPrice(plan.price_yearly)}/year`
                                            : `₦${formatPrice(plan.price_yearly)}/year if billed annually`}
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-lg font-bold text-slate-900">
                                        Free
                                        <span className="text-xs font-normal text-slate-500"> forever</span>
                                      </p>
                                    )}
                                  </div>
                                  {plan.is_popular && (
                                    <Badge className="bg-[#0b1440] text-white">Most Popular</Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                {error && (
                  <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  {(step === 2 || step === 3) && (
                    <Button type="button" variant="outline" onClick={() => { setStep(step - 1); setError(''); }} className="h-11 rounded-lg">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}

                  <Button type="submit" disabled={loading || (step === 3 && plansLoading)} className="h-11 flex-1 rounded-lg bg-[#0b1440] text-white hover:opacity-90">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : step === 1 ? (
                      <>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : step === 2 ? (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : isPaidPlan ? (
                      'Proceed to Payment'
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>
              </form>

              <p className="mt-4 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-[#0b1440] hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

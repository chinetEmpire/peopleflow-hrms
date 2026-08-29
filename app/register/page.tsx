'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';

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

  useEffect(() => {
    if (!authLoading && user && profile) {
      router.replace('/dashboard');
    }
  }, [user, profile, authLoading, router]);

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const { getSupabase } = await import('@/lib/supabase');
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (signInError) {
        router.push('/login?registered=true');
        return;
      }

      router.push('/onboarding');
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

              <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="mt-6 space-y-4">
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

                {error && (
                  <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  {step === 2 && (
                    <Button type="button" variant="outline" onClick={() => { setStep(1); setError(''); }} className="h-11 rounded-lg">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}

                  <Button type="submit" disabled={loading} className="h-11 flex-1 rounded-lg bg-[#0b1440] text-white hover:opacity-90">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : step === 1 ? (
                      <>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
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

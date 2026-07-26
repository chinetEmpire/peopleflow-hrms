'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { isSlugAvailable } from '@/lib/organizations';
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
  Globe,
  Sparkles,
} from 'lucide-react';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  // Step 1: Organization
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Step 2: Admin
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

  useEffect(() => {
    if (!orgSlug) {
      setSlugAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSlugChecking(true);
      const available = await isSlugAvailable(orgSlug);
      setSlugAvailable(available);
      setSlugChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [orgSlug]);

  function handleOrgNameChange(value: string) {
    setOrgName(value);
    if (!orgSlug || orgSlug === generateSlug(orgName)) {
      setOrgSlug(generateSlug(value));
    }
  }

  function validateStep1(): boolean {
    if (!orgName.trim()) {
      setError('Organization name is required');
      return false;
    }
    if (!orgSlug.trim()) {
      setError('Organization URL is required');
      return false;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(orgSlug)) {
      setError('URL must contain only lowercase letters, numbers, and hyphens');
      return false;
    }
    if (slugAvailable === false) {
      setError('This URL is already taken');
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
          orgSlug,
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

      // Sign in the user
      const { getSupabase } = await import('@/lib/supabase');
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (signInError) {
        // User was created but sign-in failed — redirect to login
        router.push(`/login?registered=true&org=${orgSlug}`);
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
      <div className="flex h-screen items-center justify-center bg-[#f2e9e9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f2e9e9] via-[#e8e1f0] to-[#f2e9e9] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#032364] shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#032364]">
            Create Your Organization
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your HR platform in minutes
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step >= 1 ? 'bg-[#032364] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : '1'}
          </div>
          <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-[#032364]' : 'bg-gray-200'}`} />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step >= 2 ? 'bg-[#032364] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            2
          </div>
        </div>

        <Card className="border-0 bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.15)] rounded-2xl">
          <CardContent className="p-8">
            <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#032364]">Organization Details</h2>
                    <p className="text-sm text-muted-foreground">
                      Tell us about your organization
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="orgName"
                        required
                        value={orgName}
                        onChange={(e) => handleOrgNameChange(e.target.value)}
                        placeholder="Acme Corporation"
                        className="h-11 rounded-lg border-[#0000004c] pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgSlug">Organization URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="orgSlug"
                        required
                        value={orgSlug}
                        onChange={(e) => {
                          setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                          setSlugAvailable(null);
                        }}
                        placeholder="acme-corp"
                        className="h-11 rounded-lg border-[#0000004c] pl-10"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {slugChecking ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : slugAvailable === true ? (
                        <span className="text-green-600">Available!</span>
                      ) : slugAvailable === false ? (
                        <span className="text-destructive">Already taken</span>
                      ) : (
                        <span className="text-muted-foreground">Your portal URL will be: {orgSlug || 'your-org'}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#032364]">Admin Account</h2>
                    <p className="text-sm text-muted-foreground">
                      Create your administrator account
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="firstName"
                          required
                          value={adminFirstName}
                          onChange={(e) => setAdminFirstName(e.target.value)}
                          placeholder="John"
                          className="h-11 rounded-lg border-[#0000004c] pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        required
                        value={adminLastName}
                        onChange={(e) => setAdminLastName(e.target.value)}
                        placeholder="Doe"
                        className="h-11 rounded-lg border-[#0000004c]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="h-11 rounded-lg border-[#0000004c] pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="h-11 rounded-lg border-[#0000004c] pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="h-11 rounded-lg border-[#0000004c] pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setStep(1); setError(''); }}
                    className="h-11 rounded-lg"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading || (step === 1 && slugAvailable === false)}
                  className="h-11 flex-1 rounded-lg bg-[#032364] text-base font-medium text-white hover:opacity-90"
                >
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
                    'Create Organization'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#032364] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

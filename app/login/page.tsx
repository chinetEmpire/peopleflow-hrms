'use client';

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Loader2, Lock, Mail, UserPlus, Check } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading, signIn } = useAuth();
  const { organization } = useTenant();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace('/dashboard');
    }
  }, [user, profile, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020316]">
        <Loader2 className="h-8 w-8 animate-spin text-[#60a5fa]" />
      </div>
    );
  }

  const orgName = organization?.display_name || organization?.name || 'HR Platform';
  const primaryColor = organization?.primary_color || '#0b1440';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07021a] via-[#0b1440] to-[#30103f] py-16 px-6">
      <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-2 items-center">
        <div className="lg:px-8">
          {organization?.logo_url ? (
            <img src={organization.logo_url} alt={orgName} className="mb-6 h-16 w-16 rounded-2xl object-contain shadow-lg" />
          ) : (
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          )}

          <h1 className="text-4xl font-semibold text-white lg:text-5xl">Welcome Back</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Sign in to access payroll, attendance, and employee management features tailored for Nigerian businesses.
          </p>

          <ul className="mt-8 space-y-5">
            <li className="flex items-start gap-4">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[#60a5fa]">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Secure Login</h4>
                <p className="text-sm text-slate-300">Encrypted sessions and robust authentication.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[#ec4899]">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Fast Access</h4>
                <p className="text-sm text-slate-300">Get to your dashboard in seconds.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[#fbbf24]">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Support</h4>
                <p className="text-sm text-slate-300">We&apos;re here if you need help signing in.</p>
              </div>
            </li>
          </ul>

          <p className="mt-8 text-sm text-slate-400">{orgName} — Human Resources Management Platform</p>
        </div>

        <div className="px-4">
          <Card className="rounded-[1.25rem] bg-white p-6 shadow-2xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-slate-900">Sign In</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your credentials to access the dashboard</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 rounded-lg pl-10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={submitting} className="h-11 w-full rounded-lg bg-[#0b1440] text-white hover:opacity-90">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="flex items-center justify-between">
                  <Link href="/register" className="text-sm text-slate-600 hover:underline">
                    <UserPlus className="mr-2 inline h-4 w-4" />
                    Create a new organization
                  </Link>
                  <Link href="/forgot-password" className="text-sm text-slate-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

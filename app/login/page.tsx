'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading, signIn } = useAuth();
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
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2e9e9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f2e9e9] via-[#e8e1f0] to-[#f2e9e9] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#051536] to-[#042465] shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#051536]">VCGL ONE</h1>
          <p className="mt-1 text-sm text-muted-foreground">HR Management System</p>
        </div>

        <div className="rounded-2xl border-0 bg-white p-8 shadow-[0px_4px_30px_rgba(0,0,0,0.15)]">
          <h2 className="mb-1 text-xl font-semibold text-[#051536]">Sign In</h2>
          <p className="mb-6 text-sm text-muted-foreground">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@vcgl.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-lg border-[#0000004c] pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-lg bg-[#032364] text-base font-medium hover:bg-[#032364]/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          VCGL ONE — Human Resources Management Platform
        </p>
      </div>
    </div>
  );
}

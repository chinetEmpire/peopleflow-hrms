'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { validateInvitationToken, acceptInvite } from '@/lib/invitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Lock, Mail, User, Check, AlertCircle } from 'lucide-react';

export default function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const router = useRouter();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
    org_id: string;
  } | null>(null);
  const [orgName, setOrgName] = useState('');

  // Form fields for new user
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }

    validateInvitationToken(token).then(async (result) => {
      if (!result.valid || !result.invitation) {
        setError(result.error || 'Invalid invitation');
        setLoading(false);
        return;
      }

      setInvitation({
        email: result.invitation.email,
        role: result.invitation.role,
        org_id: result.invitation.org_id,
      });

      // Fetch org name
      const { data: org } = await getSupabase()
        .from('organizations')
        .select('name')
        .eq('id', result.invitation.org_id)
        .single();

      if (org) setOrgName(org.name);
      setLoading(false);
    });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invitation || !token) return;

    if (!firstName.trim() || !lastName.trim()) {
      setError('Full name is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create the user
      const { data: authData, error: authError } = await getSupabase().auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: invitation.role,
            org_id: invitation.org_id,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }

      // Accept the invitation
      if (authData.user) {
        await acceptInvite(token, authData.user.id);
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch {
      setError('An unexpected error occurred');
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

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f2e9e9] via-[#e8e1f0] to-[#f2e9e9] px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-[#032364]">Invalid Invitation</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => router.push('/login')}
            className="mt-6 h-11 rounded-lg bg-[#032364] text-white hover:opacity-90"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f2e9e9] via-[#e8e1f0] to-[#f2e9e9] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <img src="/logo.png" alt="flowHR" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#032364]">
            Join {orgName || 'Organization'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ve been invited to join as{' '}
            <span className="font-medium capitalize">{invitation?.role?.replace('_', ' ')}</span>
          </p>
        </div>

        <Card className="border-0 bg-white shadow-[0px_4px_30px_rgba(0,0,0,0.15)] rounded-2xl">
          <CardContent className="p-8">
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{invitation?.email}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="firstName"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
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
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="h-11 rounded-lg border-[#0000004c]"
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

              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-lg bg-[#032364] text-base font-medium text-white hover:opacity-90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Accept & Join
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {orgName} — Human Resources Management Platform
        </p>
      </div>
    </div>
  );
}

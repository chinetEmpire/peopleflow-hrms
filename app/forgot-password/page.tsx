'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/change-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
      }
    } catch {
      toast.error('Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#07021a] via-[#0b1440] to-[#30103f] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <KeyRound className="h-6 w-6 text-[#60a5fa]" />
          </span>
        </div>
        <Card className="rounded-2xl border-0 bg-white shadow-2xl">
          <CardContent className="p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <h1 className="text-lg font-bold text-[#051536]">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium text-[#051536]">{email}</span>, we&apos;ve sent a
                  password reset link. It expires shortly — use it to set a new password.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="rounded-lg">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-bold text-[#051536]">Forgot your password?</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="space-y-2">
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

                  <Button type="submit" disabled={submitting} className="h-11 w-full rounded-lg bg-[#0b1440] text-white hover:opacity-90">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Link href="/login" className="text-sm text-slate-600 hover:underline">
                    <ArrowLeft className="mr-1 inline h-4 w-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
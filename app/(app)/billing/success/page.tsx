'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  CreditCard,
  Clock,
} from 'lucide-react';

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [txRef, setTxRef] = useState('');
  const fromRegister = searchParams.get('from') === 'register';
  const isNewOrg = fromRegister;

  useEffect(() => {
    // Paystack redirects back with ?trxref=REF&reference=REF.
    const reference = searchParams.get('reference') ?? searchParams.get('trxref');

    if (reference) {
      setTxRef(reference);
    }

    // Paystack doesn't send a status param on redirect — a reference means the
    // user went through checkout. The webhook authorizes fulfillment; abandoned
    // payments stay 'pending' and are surfaced by the app's payment banner.
    if (reference) {
      setStatus('success');
    } else {
      setStatus('failed');
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-[#032364] mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#051536] mb-2">Processing Payment</h1>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your payment...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-[#051536] mb-2">Payment Successful!</h1>
              <p className="text-sm text-muted-foreground mb-2">
                Your subscription has been activated. Thank you for choosing flowHR.
              </p>
              {txRef && (
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Badge variant="outline" className="text-xs">
                    <CreditCard className="mr-1 h-3 w-3" />
                    Ref: {txRef}
                  </Badge>
                </div>
              )}
              <div className="space-y-2">
                {fromRegister ? (
                  <>
                    <Button
                      onClick={() => router.push('/onboarding')}
                      className="w-full rounded-lg bg-[#032364] hover:bg-[#032364]/90"
                    >
                      {isNewOrg ? 'Continue to Organize Setup' : 'Continue to Setup'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                      className="w-full rounded-lg"
                    >
                      Go to Dashboard
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => router.push('/billing')}
                      className="w-full rounded-lg bg-[#032364] hover:bg-[#032364]/90"
                    >
                      View Billing Details
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                      className="w-full rounded-lg"
                    >
                      Go to Dashboard
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-[#051536] mb-2">Payment Failed</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your payment could not be processed. Please try again or contact support.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => router.push('/billing/upgrade')}
                  className="w-full rounded-lg bg-[#032364] hover:bg-[#032364]/90"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/billing')}
                  className="w-full rounded-lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Billing
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

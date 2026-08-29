'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Scale,
  Loader2,
  Building2,
  ExternalLink,
  RefreshCw,
  CircleCheck,
  TriangleAlert,
} from 'lucide-react';

interface UnmatchedPayment {
  id: string;
  org_id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  reconciliation_status: string;
  reconciliation_notes: string | null;
  paid_at: string | null;
  organizations: { id: string; name: string; slug: string; logo_url: string | null; primary_color: string } | null;
}

const reconBadge: Record<string, string> = {
  matched: 'bg-green-100 text-green-700',
  unmatched: 'bg-amber-100 text-amber-700',
  mismatch: 'bg-red-100 text-red-700',
  manual: 'bg-blue-100 text-blue-700',
};

function formatMoney(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount ?? 0);
}

export default function AdminReconcilePage() {
  const { profile, session } = useAuth();
  const [payments, setPayments] = useState<UnmatchedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'unmatched' | 'mismatch' | 'manual'>('unmatched');

  async function loadPayments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?reconciliation_status=${scope}&pageSize=100`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments ?? []);
      }
    } catch (e) {
      console.error('Failed to load unmatched payments', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [session, scope]);

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  const pendingValue = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#051536]">Reconciliation</h1>
          <p className="text-sm text-muted-foreground mt-1">Match payment entries to invoices so the ledger stays accurate</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => toast.info('Auto-match happens during Paystack sync')}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Auto-match runs on sync
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={loadPayments}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TriangleAlert className="h-3 w-3 text-amber-500" /> Unmatched payments
              </p>
              <p className="text-xl font-semibold text-[#051536]">{payments.length}</p>
            </div>
            <Scale className="h-6 w-6 text-amber-500" />
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Value awaiting match</p>
              <p className="text-xl font-semibold text-[#051536]">{formatMoney(pendingValue)}</p>
            </div>
            <Scale className="h-6 w-6 text-[#032364]" />
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CircleCheck className="h-3 w-3 text-green-600" /> Matched overall
              </p>
              <p className="text-xl font-semibold text-[#051536]">Matched during sync</p>
            </div>
            <Building2 className="h-6 w-6 text-green-600" />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        {(['unmatched', 'mismatch', 'manual'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === s ? 'bg-[#032364] text-white' : 'bg-white text-muted-foreground border border-border'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
        </div>
      ) : payments.length === 0 ? (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground text-center">
              Nothing in this bucket. Run a sync or match entries from the payments page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left bg-muted/30">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Organization</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Bucket</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                            style={{ backgroundColor: (p.organizations?.primary_color || '#032364') + '15' }}
                          >
                            {p.organizations?.logo_url ? (
                              <img src={p.organizations.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
                            ) : (
                              <Building2 className="h-4 w-4" style={{ color: p.organizations?.primary_color || '#032364' }} />
                            )}
                          </div>
                          <span className="font-medium text-[#051536]">{p.organizations?.name ?? 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.reference}</td>
                      <td className="px-4 py-3 font-medium text-[#051536]">{formatMoney(p.amount, p.currency)}</td>
                      <td className="px-4 py-3">
                        <Badge className={reconBadge[p.reconciliation_status] ?? 'bg-gray-100 text-gray-700'}>
                          {p.reconciliation_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/payments/${p.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />
                            Open
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Banknote,
  Search,
  Loader2,
  ExternalLink,
  RefreshCw,
  Building2,
  CircleCheck,
  CircleX,
  Clock3,
  Undo2,
} from 'lucide-react';

interface PaymentRow {
  id: string;
  org_id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  channel: string | null;
  paid_at: string | null;
  customer_email: string | null;
  plan_id: string | null;
  billing_cycle: string | null;
  reconciliation_status: string;
  refunded_amount: number;
  organizations: { id: string; name: string; slug: string; logo_url: string | null; primary_color: string } | null;
  invoices: { id: string; amount: number; status: string } | null;
}

interface Summary {
  total: number;
  paidAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  matched: number;
  unmatched: number;
}

const statusBadge: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  partial_refund: 'bg-blue-100 text-blue-700',
  refunded: 'bg-slate-100 text-slate-600',
};

const reconBadge: Record<string, string> = {
  matched: 'bg-green-100 text-green-700',
  unmatched: 'bg-amber-100 text-amber-700',
  mismatch: 'bg-red-100 text-red-700',
  manual: 'bg-blue-100 text-blue-700',
};

function formatMoney(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount ?? 0);
}

export default function AdminPaymentsPage() {
  const { profile, session } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, paidAmount: 0, pendingAmount: 0, refundedAmount: 0, matched: 0, unmatched: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reconFilter, setReconFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadPayments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (reconFilter !== 'all') params.set('reconciliation_status', reconFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments ?? []);
        setSummary(data.summary ?? { total: 0, paidAmount: 0, pendingAmount: 0, refundedAmount: 0, matched: 0, unmatched: 0 });
      }
    } catch (e) {
      console.error('Failed to load payments', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [session, statusFilter, reconFilter]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/payments/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      const data = await res.json();
      if (res.ok) {
        const c = data.counts;
        toast.success(`Synced: ${c.recorded} recorded, ${c.matched} auto-matched, ${c.skippedNoOrg} without org`);
        await loadPayments();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.reference.toLowerCase().includes(q) ||
      (p.organizations?.name ?? '').toLowerCase().includes(q) ||
      (p.customer_email ?? '').toLowerCase().includes(q)
    );
  });

  const netCollected = summary.paidAmount - summary.refundedAmount;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#051536]">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide payment ledger synced from Paystack</p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="rounded-lg bg-[#032364] hover:bg-[#032364]/90">
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sync Last 30 Days
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleCheck className="h-3 w-3 text-green-600" /> Collected</p>
            <p className="text-xl font-semibold text-[#051536] mt-1">{formatMoney(netCollected)}</p>
            <p className="text-xs text-muted-foreground mt-1">{summary.matched} reconciled</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Undo2 className="h-3 w-3 text-slate-500" /> Refunds</p>
            <p className="text-xl font-semibold text-red-600 mt-1">{formatMoney(summary.refundedAmount)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock3 className="h-3 w-3 text-amber-500" /> Pending/Failed</p>
            <p className="text-xl font-semibold text-amber-600 mt-1">{formatMoney(summary.pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleX className="h-3 w-3 text-red-400" /> Unmatched</p>
            <p className="text-xl font-semibold text-[#051536] mt-1">{summary.unmatched}</p>
            <Link href="/admin/reconcile" className="text-xs font-medium text-[#032364] underline hover:text-[#032364]/80">
              Reconcile →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference, org, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="partial_refund">Partial Refund</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={reconFilter}
          onChange={(e) => setReconFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Reconciliation</option>
          <option value="matched">Matched</option>
          <option value="unmatched">Unmatched</option>
          <option value="mismatch">Mismatch</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} payment{filtered.length !== 1 ? 's' : ''} shown
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground text-center">No payments found. Run a sync to pull Paystack transactions.</p>
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
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Recon</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
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
                          <div className="min-w-0">
                            <p className="font-medium text-[#051536] truncate max-w-[160px]">{p.organizations?.name ?? 'Unknown'}</p>
                            {p.plan_id && <p className="text-xs text-muted-foreground">{p.plan_id} • {p.billing_cycle}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">{p.reference}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#051536]">{formatMoney(p.amount, p.currency)}</p>
                        {Number(p.refunded_amount) > 0 && (
                          <p className="text-xs text-red-500">refunded {formatMoney(p.refunded_amount, p.currency)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadge[p.status] ?? 'bg-gray-100 text-gray-700'}>{p.status.replace('_', ' ')}</Badge>
                      </td>
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
                            View
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
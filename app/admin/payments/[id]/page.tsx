'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Building2,
  Undo2,
  Link2,
  Unlink,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

interface PaymentDetail {
  id: string;
  org_id: string;
  reference: string | null;
  paystack_transaction_id: string | null;
  amount: number;
  currency: string;
  status: string;
  channel: string | null;
  paid_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  plan_id: string | null;
  billing_cycle: string | null;
  invoice_id: string | null;
  reconciliation_status: string;
  reconciliation_notes: string | null;
  refunded_amount: number;
  refund_reference: string | null;
  refund_history: any[] | null;
  organizations: { id: string; name: string; slug: string; logo_url: string | null; primary_color: string } | null;
  invoices: { id: string; amount: number; status: string; description: string | null; invoice_date: string; paystack_reference: string | null } | null;
  subscriptions: { id: string; plan_id: string; status: string; billing_cycle: string } | null;
}

interface InvoiceOption {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  invoice_date: string;
}

function formatMoney(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount ?? 0);
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

export default function AdminPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, session } = useAuth();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Reconciliation state
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [reconNote, setReconNote] = useState('');

  // Refund state
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundConfirm, setRefundConfirm] = useState(false);

  async function loadPayment() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?payment_id=${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        const row = data.payments?.[0];
        setPayment(row);
        if (row && row.invoices) setSelectedInvoice(row.invoices.id);
      } else {
        toast.error('Payment not found');
      }
    } catch {
      toast.error('Failed to load payment');
    } finally {
      setLoading(false);
    }
  }

  async function loadInvoices() {
    if (!payment) return;
    setInvoiceLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        const candidates = (data.invoices ?? []).filter(
          (inv: any) =>
            inv.org_id === payment.org_id &&
            (inv.status === 'pending' || inv.status === 'paid') &&
            !inv.paystack_reference,
        );
        setInvoiceOptions(candidates);
      }
    } catch {
      // ignore — matching can proceed without candidates
    } finally {
      setInvoiceLoading(false);
    }
  }

  useEffect(() => {
    loadPayment();
  }, [session, id]);

  useEffect(() => {
    if (payment) loadInvoices();
  }, [payment?.org_id]);

  async function submitReconcile(action: string) {
    setActing(true);
    try {
      const res = await fetch('/api/admin/payments/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          payment_id: id,
          action,
          invoice_id: action === 'match' ? selectedInvoice : undefined,
          note: reconNote || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Reconciliation updated');
        setReconNote('');
        await loadPayment();
      } else {
        toast.error(data.error || 'Failed to update reconciliation');
      }
    } catch {
      toast.error('Failed to update reconciliation');
    } finally {
      setActing(false);
    }
  }

  async function submitRefund() {
    if (!refundAmount || Number(refundAmount) <= 0) {
      toast.error('Enter a valid refund amount');
      return;
    }
    if (refundNote.trim().length < 3) {
      toast.error('Enter a reason (at least 3 characters)');
      return;
    }
    if (!refundConfirm) {
      toast.error('You must confirm the refund');
      return;
    }
    setActing(true);
    try {
      const res = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          payment_id: id,
          amount: Number(refundAmount),
          note: refundNote.trim(),
          confirm: refundConfirm,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Refund of ${formatMoney(data.amount)} initiated`);
        setShowRefund(false);
        setRefundAmount('');
        setRefundNote('');
        setRefundConfirm(false);
        await loadPayment();
      } else {
        toast.error(data.error || 'Refund failed');
      }
    } catch {
      toast.error('Refund failed');
    } finally {
      setActing(false);
    }
  }

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Payment not found.</p>
        <Link href="/admin/payments">
          <Button variant="outline" className="mt-4 rounded-lg">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payments
          </Button>
        </Link>
      </div>
    );
  }

  const paidAmount = Number(payment.amount);
  const refundedAmount = Number(payment.refunded_amount ?? 0);
  const remaining = Math.round((paidAmount - refundedAmount) * 100) / 100;
  const refundable = (payment.status === 'success' || payment.status === 'partial_refund') && remaining > 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/payments">
          <Button variant="ghost" className="rounded-lg -ml-3 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payments
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge className={statusBadge[payment.status] ?? 'bg-gray-100 text-gray-700'}>
            {payment.status.replace('_', ' ')}
          </Badge>
          <Badge className={reconBadge[payment.reconciliation_status] ?? 'bg-gray-100 text-gray-700'}>
            {payment.reconciliation_status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Org + payment details */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow lg:col-span-1">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                style={{ backgroundColor: (payment.organizations?.primary_color || '#032364') + '15' }}
              >
                {payment.organizations?.logo_url ? (
                  <img src={payment.organizations.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                ) : (
                  <Building2 className="h-5 w-5" style={{ color: payment.organizations?.primary_color || '#032364' }} />
                )}
              </div>
              <div>
                <p className="font-semibold text-[#051536]">{payment.organizations?.name ?? 'Unknown org'}</p>
                <Link href={`/admin/organizations/${payment.org_id}`} className="text-xs text-[#032364] underline">
                  View organization
                </Link>
              </div>
            </div>
            <hr className="border-border/50" />
            <div className="space-y-2 text-sm">
              <Row label="Reference" value={payment.reference ?? '—'} mono />
              <Row label="Transaction ID" value={payment.paystack_transaction_id ?? '—'} mono />
              <Row label="Channel" value={payment.channel ?? '—'} />
              <Row label="Customer" value={[payment.customer_name, payment.customer_email].filter(Boolean).join(' · ') || '—'} />
              <Row
                label="Date"
                value={payment.paid_at ? new Date(payment.paid_at).toLocaleString() : '—'}
              />
              {payment.plan_id && <Row label="Plan" value={`${payment.plan_id}${payment.billing_cycle ? ` (${payment.billing_cycle})` : ''}`} />}
            </div>
          </CardContent>
        </Card>

        {/* Money + actions */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="text-lg font-semibold text-[#051536]">{formatMoney(paidAmount, payment.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Refunded</p>
                <p className="text-lg font-semibold text-red-600">{formatMoney(refundedAmount, payment.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-semibold text-green-600">{formatMoney(remaining, payment.currency)}</p>
              </div>
            </div>

            {payment.reconciliation_notes && (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                Note: {payment.reconciliation_notes}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {refundable && (
                <Button
                  variant="outline"
                  className="rounded-lg text-red-600 hover:text-red-700"
                  onClick={() => setShowRefund(!showRefund)}
                >
                  <Undo2 className="mr-2 h-4 w-4" /> Refund via Paystack
                </Button>
              )}
              {payment.reference && (
                <a
                  href={`https://dashboard.paystack.com/#/transactions?ref=${payment.reference}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" className="rounded-lg text-[#032364]">
                    <ExternalLink className="mr-2 h-4 w-4" /> Paystack Dashboard
                  </Button>
                </a>
              )}
            </div>

            {showRefund && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-red-700">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>A real refund will be sent back to the customer&apos;s card via Paystack. This cannot be undone.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Amount (max {formatMoney(remaining, payment.currency)})</label>
                    <Input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder={String(remaining)}
                      className="rounded-lg"
                      min={0}
                      max={remaining}
                      step={0.01}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Reason</label>
                    <Input
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      placeholder="Required — reason for refund"
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={refundConfirm}
                    onChange={(e) => setRefundConfirm(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  I confirm this refund and understand it issues a real payment reversal
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setShowRefund(false)} disabled={acting}>
                    Cancel
                  </Button>
                  <Button size="sm" className="rounded-lg bg-red-600 hover:bg-red-700" onClick={submitRefund} disabled={acting}>
                    {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                    Refund {refundAmount ? formatMoney(Number(refundAmount), payment.currency) : ''}
                  </Button>
                </div>
              </div>
            )}

            {/* Refund history */}
            {Array.isArray(payment.refund_history) && payment.refund_history.length > 0 && (
              <div className="space-y-2 border-t border-border/50 pt-3">
                <p className="text-sm font-medium text-[#051536]">Refund History</p>
                {payment.refund_history.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-muted-foreground">
                        {formatMoney(Number(r.amount), r.currency ?? payment.currency)} · {r.status}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.note ?? ''}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {r.applied_at ? new Date(r.applied_at).toLocaleString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#051536]">Reconciliation</h2>
            {payment.invoices && (
              <div className="text-sm text-muted-foreground">
                Currently linked to invoice{' '}
                <span className="font-medium text-[#051536]">#{payment.invoices.id.slice(0, 8).toUpperCase()}</span>{' '}
                ({formatMoney(payment.invoices.amount)} · {payment.invoices.status})
                <Badge className="ml-2 bg-green-100 text-green-700">
                  <Link2 className="h-3 w-3 mr-1" /> Matched
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Link to invoice</label>
              <select
                value={selectedInvoice}
                onChange={(e) => setSelectedInvoice(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                disabled={payment.reconciliation_status === 'matched'}
              >
                <option value="">Select invoice…</option>
                {invoiceLoading ? (
                  <option disabled>Loading…</option>
                ) : (
                  invoiceOptions.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.id.slice(0, 8).toUpperCase()} · {formatMoney(inv.amount)} · {inv.status}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Note</label>
              <Input
                value={reconNote}
                onChange={(e) => setReconNote(e.target.value)}
                placeholder="Optional note"
                className="rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="rounded-lg bg-[#032364] hover:bg-[#032364]/90 flex-1"
                onClick={() => submitReconcile('match')}
                disabled={acting || !selectedInvoice || payment.reconciliation_status === 'matched'}
              >
                {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Match
              </Button>
              <Button
                variant="outline"
                className="rounded-lg flex-1"
                onClick={() => submitReconcile('ignore')}
                disabled={acting || payment.reconciliation_status === 'matched'}
              >
                Ignore
              </Button>
              <Button
                variant="ghost"
                className="rounded-lg text-muted-foreground"
                onClick={() => submitReconcile('unlink')}
                disabled={acting || !payment.invoices}
              >
                <Unlink className="mr-2 h-4 w-4" /> Unlink
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-medium text-[#051536] ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
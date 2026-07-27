'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Users,
  Calendar,
  Clock,
  Loader2,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Timer,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface SubscriptionDetail {
  id: string;
  org_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  canceled_at: string | null;
  payment_provider: string | null;
  created_at: string;
  updated_at: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    logo_url: string | null;
    primary_color: string;
    max_employees: number;
    billing_email: string | null;
  } | null;
  employee_count: number;
  invoice_count: number;
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
    invoice_date: string;
    paid_at: string | null;
  }>;
}

interface OrgAuditLog {
  id: string;
  action: string;
  entity: string;
  details: any;
  created_at: string;
  profiles: { first_name: string; last_name: string } | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  paused: 'bg-gray-100 text-gray-700',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle,
  trialing: Timer,
  past_due: AlertCircle,
  canceled: XCircle,
  paused: Pause,
};

export default function AdminSubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, session } = useAuth();
  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<OrgAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => {
    loadSubscription();
  }, [id]);

  async function loadSubscription() {
    if (!id) return;
    try {
      const token = session?.access_token ?? '';
      const res = await fetch(`/api/admin/subscriptions?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSub(data.subscription ?? null);
        setAuditLogs(data.audit_logs ?? []);
      }
    } catch (e) {
      console.error('Failed to load subscription', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string, extra?: Record<string, any>) {
    if (!sub) return;
    setActing(true);
    try {
      const token = session?.access_token ?? '';
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription_id: sub.id, action, ...extra }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Subscription ${action}d successfully`);
        await loadSubscription();
      } else {
        toast.error(data.error || `Failed to ${action}`);
      }
    } catch {
      toast.error(`Failed to ${action} subscription`);
    } finally {
      setActing(false);
    }
  }

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Subscription not found.</p>
        <Link href="/admin/subscriptions">
          <Button variant="outline" className="mt-4 rounded-lg">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subscriptions
          </Button>
        </Link>
      </div>
    );
  }

  const org = sub.organizations;
  const StatusIcon = statusIcons[sub.status] ?? CheckCircle;
  const daysUntilRenewal = Math.ceil(
    (new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isActive = sub.status === 'active' || sub.status === 'trialing';
  const isPaused = sub.status === 'paused';
  const isCanceled = sub.status === 'canceled';

  const invoiceStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/subscriptions">
          <Button variant="ghost" size="sm" className="rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#051536]">
            {org?.name ?? 'Unknown Organization'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Subscription management &amp; history
          </p>
        </div>
        {org && (
          <Link href={`/admin/organizations/${org.id}`}>
            <Button variant="outline" size="sm" className="rounded-lg">
              <Building2 className="mr-2 h-4 w-4" />
              View Org
            </Button>
          </Link>
        )}
      </div>

      {/* Status + Quick Actions */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Status Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive ? 'bg-green-100' : isPaused ? 'bg-gray-100' : isCanceled ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  <StatusIcon className={`h-5 w-5 ${
                    isActive ? 'text-green-600' : isPaused ? 'text-gray-600' : isCanceled ? 'text-red-600' : 'text-amber-600'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-[#051536] capitalize">{sub.status}</span>
                    <Badge className={statusColors[sub.status]}>{sub.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sub.billing_cycle === 'yearly' ? 'Annual' : 'Monthly'} billing
                    {sub.payment_provider && ` via ${sub.payment_provider}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Period</p>
                  <p className="font-medium text-[#051536]">
                    {new Date(sub.current_period_start).toLocaleDateString()} — {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days Until Renewal</p>
                  <p className={`font-medium ${daysUntilRenewal <= 7 ? 'text-orange-600' : 'text-[#051536]'}`}>
                    {daysUntilRenewal > 0 ? `${daysUntilRenewal} days` : 'Expired'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Users</p>
                  <p className="font-medium text-[#051536]">{sub.employee_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoices</p>
                  <p className="font-medium text-[#051536]">{sub.invoice_count}</p>
                </div>
              </div>

              {sub.trial_ends_at && sub.status === 'trialing' && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <Timer className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Trial ends on {new Date(sub.trial_ends_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {sub.canceled_at && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-xs text-red-700">
                    Canceled on {new Date(sub.canceled_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 shrink-0">
              <p className="text-sm font-medium text-[#051536]">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {isPaused && (
                  <Button
                    size="sm"
                    className="rounded-lg bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('reactivate')}
                    disabled={acting}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Reactivate
                  </Button>
                )}
                {isCanceled && (
                  <Button
                    size="sm"
                    className="rounded-lg bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('reactivate')}
                    disabled={acting}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Reinstate
                  </Button>
                )}
                {isActive && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => handleAction('suspend')}
                      disabled={acting}
                    >
                      <Pause className="mr-1 h-3 w-3" />
                      Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleAction('cancel')}
                      disabled={acting}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </>
                )}
                {!isCanceled && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => handleAction('change_cycle', { billing_cycle: sub.billing_cycle === 'monthly' ? 'yearly' : 'monthly' })}
                      disabled={acting}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Switch to {sub.billing_cycle === 'monthly' ? 'Yearly' : 'Monthly'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Extend Trial */}
              {(sub.status === 'trialing' || sub.status === 'paused') && !isCanceled && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={trialDays}
                    onChange={(e) => setTrialDays(parseInt(e.target.value) || 14)}
                    className="w-20 rounded-lg"
                    min={1}
                    max={90}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => handleAction('extend_trial', { trial_days: trialDays })}
                    disabled={acting}
                  >
                    <Timer className="mr-1 h-3 w-3" />
                    Extend Trial
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#051536]">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {sub.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 font-medium text-muted-foreground">Description</th>
                    <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/30">
                      <td className="py-3 text-[#051536]">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                      <td className="py-3 text-muted-foreground">{inv.description ?? '—'}</td>
                      <td className="py-3 font-medium text-[#051536]">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: inv.currency, minimumFractionDigits: 0 }).format(inv.amount)}
                      </td>
                      <td className="py-3">
                        <Badge className={invoiceStatusColors[inv.status] ?? 'bg-gray-100 text-gray-700'}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#051536]">Subscription Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#032364]/10 shrink-0 mt-0.5">
                    <CreditCard className="h-4 w-4 text-[#032364]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#051536]">
                      {log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'System'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.action.replace(/_/g, ' ')} • {log.entity}
                      {log.details?.status_before && log.details?.status_after && (
                        <>: {log.details.status_before} → {log.details.status_after}</>
                      )}
                      {log.details?.billing_cycle_before && log.details?.billing_cycle_after && (
                        <>: {log.details.billing_cycle_before} → {log.details.billing_cycle_after}</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

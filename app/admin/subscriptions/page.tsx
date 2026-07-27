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
  CreditCard,
  Search,
  Building2,
  Users,
  ExternalLink,
  Loader2,
  Calendar,
  ArrowUpDown,
  Filter,
  ShieldCheck,
} from 'lucide-react';

interface SubscriptionRow {
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
  invoice_count: number;
  employee_count: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  paused: 'bg-gray-100 text-gray-700',
};

const planBadge: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

export default function AdminSubscriptionsPage() {
  const { profile, session } = useAuth();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [enforcing, setEnforcing] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function handleEnforce() {
    setEnforcing(true);
    try {
      const token = session?.access_token ?? '';
      const res = await fetch('/api/admin/subscriptions/enforce', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const r = data.result;
        toast.success(
          `Enforced: ${r.expired_active} expired, ${r.expired_trial} trial expired, ${r.auto_paused} auto-paused`
        );
        await loadSubscriptions();
      } else {
        toast.error(data.error || 'Enforcement failed');
      }
    } catch {
      toast.error('Failed to run enforcement');
    } finally {
      setEnforcing(false);
    }
  }

  async function loadSubscriptions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);

      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions ?? []);
      }
    } catch (e) {
      console.error('Failed to load subscriptions', e);
    } finally {
      setLoading(false);
    }
  }

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  const filtered = subs.filter((sub) => {
    const q = search.toLowerCase();
    const orgName = sub.organizations?.name ?? '';
    const orgSlug = sub.organizations?.slug ?? '';
    return orgName.toLowerCase().includes(q) || orgSlug.toLowerCase().includes(q) || sub.plan_id.toLowerCase().includes(q);
  });

  // Summary stats
  const totalActive = subs.filter(s => s.status === 'active').length;
  const totalTrialing = subs.filter(s => s.status === 'trialing').length;
  const totalCanceled = subs.filter(s => s.status === 'canceled').length;
  const totalPaused = subs.filter(s => s.status === 'paused').length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor and manage all tenant subscriptions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold text-[#051536]">{subs.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold text-green-600">{totalActive}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Trialing</p>
            <p className="text-2xl font-semibold text-blue-600">{totalTrialing}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paused</p>
            <p className="text-2xl font-semibold text-amber-600">{totalPaused}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Canceled</p>
            <p className="text-2xl font-semibold text-red-600">{totalCanceled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by org name or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="paused">Paused</option>
            <option value="canceled">Canceled</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); }}
            className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={loadSubscriptions}>
            <ArrowUpDown className="mr-1 h-3 w-3" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={handleEnforce}
            disabled={enforcing}
          >
            {enforcing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-1 h-3 w-3" />}
            Enforce Expiry
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} subscription{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground text-center">No subscriptions found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const org = sub.organizations;
            const daysUntilRenewal = Math.ceil(
              (new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            const isExpiringSoon = daysUntilRenewal <= 7 && daysUntilRenewal > 0 && sub.status === 'active';

            return (
              <Card key={sub.id} className="rounded-xl border-0 bg-white vcgl-shadow hover:shadow-lg transition">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
                        style={{ backgroundColor: (org?.primary_color || '#032364') + '15' }}
                      >
                        {org?.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded object-contain" />
                        ) : (
                          <Building2 className="h-6 w-6" style={{ color: org?.primary_color || '#032364' }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-[#051536]">
                            {org?.name ?? 'Unknown Org'}
                          </h3>
                          <Badge className={statusColors[sub.status] ?? 'bg-gray-100 text-gray-700'}>
                            {sub.status}
                          </Badge>
                          <Badge className={planBadge[sub.plan_id] ?? 'bg-gray-100 text-gray-700'}>
                            {sub.plan_id}
                          </Badge>
                          {isExpiringSoon && (
                            <Badge className="bg-orange-100 text-orange-700">
                              Renews in {daysUntilRenewal}d
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {sub.billing_cycle}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {sub.employee_count} users
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {sub.invoice_count} invoice{sub.invoice_count !== 1 ? 's' : ''}
                          </span>
                          <span>
                            Renews {new Date(sub.current_period_end).toLocaleDateString()}
                          </span>
                          {sub.trial_ends_at && sub.status === 'trialing' && (
                            <span className="text-blue-600 font-medium">
                              Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link href={`/admin/subscriptions/${sub.id}`}>
                      <Button variant="outline" size="sm" className="rounded-lg">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

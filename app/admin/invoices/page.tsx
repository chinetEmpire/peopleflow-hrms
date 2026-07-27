'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Search,
  Building2,
  Loader2,
  Filter,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  ArrowUpDown,
} from 'lucide-react';

interface InvoiceRow {
  id: string;
  org_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  invoice_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_provider: string | null;
  created_at: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
  } | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
  void: 'bg-gray-100 text-gray-500',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  paid: CheckCircle,
  failed: XCircle,
  refunded: RefreshCw,
  void: XCircle,
};

export default function AdminInvoicesPage() {
  const { profile, session } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Create invoice dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [createOrgId, setCreateOrgId] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOptions, setOrgOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/invoices?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices ?? []);
      }
    } catch (e) {
      console.error('Failed to load invoices', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(invoiceId: string, action: string) {
    setActing(invoiceId);
    try {
      const token = session?.access_token ?? '';
      const res = await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoice_id: invoiceId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Invoice ${action.replace('_', ' ')} successfully`);
        await loadInvoices();
      } else {
        toast.error(data.error || `Failed to ${action}`);
      }
    } catch {
      toast.error(`Failed to update invoice`);
    } finally {
      setActing(null);
    }
  }

  async function searchOrgs(query: string) {
    setOrgSearch(query);
    if (query.length < 2) { setOrgOptions([]); return; }
    try {
      const token = session?.access_token ?? '';
      const res = await fetch('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.organizations ?? []).filter((o: any) =>
          o.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
        setOrgOptions(filtered.map((o: any) => ({ id: o.id, name: o.name })));
      }
    } catch {}
  }

  async function handleCreateInvoice() {
    if (!createOrgId || !createAmount) {
      toast.error('Select an organization and enter an amount');
      return;
    }
    setCreating(true);
    try {
      const token = session?.access_token ?? '';
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          org_id: createOrgId,
          amount: parseFloat(createAmount),
          description: createDescription || 'Manual invoice',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Invoice created');
        setShowCreate(false);
        setCreateOrgId('');
        setCreateAmount('');
        setCreateDescription('');
        setOrgSearch('');
        setOrgOptions([]);
        await loadInvoices();
      } else {
        toast.error(data.error || 'Failed to create invoice');
      }
    } catch {
      toast.error('Failed to create invoice');
    } finally {
      setCreating(false);
    }
  }

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const orgName = inv.organizations?.name ?? '';
    return (
      orgName.toLowerCase().includes(q) ||
      (inv.description ?? '').toLowerCase().includes(q) ||
      inv.currency.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalAmount = filtered.reduce((sum, i) => sum + (i.status !== 'void' && i.status !== 'refunded' ? i.amount : 0), 0);
  const pendingAmount = filtered.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = filtered.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const failedAmount = filtered.filter(i => i.status === 'failed').reduce((sum, i) => sum + i.amount, 0);

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#051536]">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all invoices across organizations</p>
        </div>
        <Button
          className="rounded-lg bg-[#032364] hover:bg-[#032364]/90"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Create Invoice Form */}
      {showCreate && (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow border-l-4 border-l-[#032364]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#051536]">New Manual Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2 relative">
                <Label>Organization</Label>
                <Input
                  placeholder="Search organization..."
                  value={orgSearch}
                  onChange={(e) => searchOrgs(e.target.value)}
                  className="rounded-lg"
                />
                {orgOptions.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {orgOptions.map((org) => (
                      <button
                        key={org.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setCreateOrgId(org.id);
                          setOrgSearch(org.name);
                          setOrgOptions([]);
                        }}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                  className="rounded-lg"
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Invoice description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" className="rounded-lg" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-lg bg-[#032364] hover:bg-[#032364]/90"
                onClick={handleCreateInvoice}
                disabled={creating}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold text-[#051536]">{formatAmount(totalAmount, 'NGN')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-2xl font-semibold text-green-600">{formatAmount(paidAmount, 'NGN')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold text-amber-600">{formatAmount(pendingAmount, 'NGN')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-semibold text-red-600">{formatAmount(failedAmount, 'NGN')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by org, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="void">Void</option>
          </select>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={loadInvoices}>
            <ArrowUpDown className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground text-center">No invoices found.</p>
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
                    <th className="px-4 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Due</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const StatusIcon = statusIcons[inv.status] ?? Clock;
                    const isOverdue = inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < new Date();

                    return (
                      <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                              style={{ backgroundColor: (inv.organizations?.primary_color || '#032364') + '15' }}
                            >
                              {inv.organizations?.logo_url ? (
                                <img src={inv.organizations.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
                              ) : (
                                <Building2 className="h-4 w-4" style={{ color: inv.organizations?.primary_color || '#032364' }} />
                              )}
                            </div>
                            <span className="font-medium text-[#051536]">{inv.organizations?.name ?? 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{inv.description ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-[#051536]">{formatAmount(inv.amount, inv.currency)}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusColors[inv.status] ?? 'bg-gray-100 text-gray-700'}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {inv.due_date ? (
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {new Date(inv.due_date).toLocaleDateString()}
                              {isOverdue && ' (overdue)'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {inv.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-green-600 hover:text-green-700"
                                onClick={() => handleAction(inv.id, 'mark_paid')}
                                disabled={acting === inv.id}
                              >
                                {acting === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                Pay
                              </Button>
                            )}
                            {inv.status === 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-blue-600 hover:text-blue-700"
                                onClick={() => handleAction(inv.id, 'refund')}
                                disabled={acting === inv.id}
                              >
                                {acting === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                Refund
                              </Button>
                            )}
                            {inv.status !== 'paid' && inv.status !== 'void' && inv.status !== 'refunded' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-gray-500 hover:text-gray-700"
                                onClick={() => handleAction(inv.id, 'void')}
                                disabled={acting === inv.id}
                              >
                                {acting === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                                Void
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

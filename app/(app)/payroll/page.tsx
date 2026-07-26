'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getPayrollRuns,
  formatCurrency,
} from '@/lib/payroll';
import { getOrgUsage } from '@/lib/billing';
import type { PayrollRun } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ArrowRight,
  DollarSign,
  Users,
  TrendingUp,
} from 'lucide-react';

export default function PayrollPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace('/login');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!profile?.org_id) return;

    async function loadData() {
      setLoadingData(true);
      const [runsData, usage] = await Promise.all([
        getPayrollRuns(profile!.org_id),
        getOrgUsage(profile!.org_id),
      ]);
      setRuns(runsData);
      setEmployeeCount(usage?.employee_count || 0);
      setLoadingData(false);
    }

    loadData();
  }, [profile?.org_id]);

  if (loading || loadingData) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  const latestRun = runs[0];
  const totalPaid = runs
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.total_net), 0);
  const pendingRuns = runs.filter((r) => r.status === 'draft' || r.status === 'processing').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#051536]">Payroll</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage payroll runs and payslips
          </p>
        </div>
        <Button
          onClick={() => router.push('/payroll/runs/new')}
          className="rounded-lg bg-[#032364] hover:bg-[#032364]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Payroll Run
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
                <Users className="h-5 w-5 text-[#032364]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Employees</p>
                <p className="text-xl font-bold text-[#051536]">{employeeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-[#051536]">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Runs</p>
                <p className="text-xl font-bold text-[#051536]">{pendingRuns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Run Summary */}
      {latestRun && (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
                <TrendingUp className="h-4 w-4 text-[#032364]" />
              </div>
              <h2 className="text-sm font-semibold text-[#051536]">Latest Payroll Run</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#051536]">
                  {new Date(latestRun.period_start).toLocaleDateString()} — {new Date(latestRun.period_end).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{latestRun.employee_count} employees</span>
                  <span>Gross: {formatCurrency(Number(latestRun.total_gross))}</span>
                  <span>Net: {formatCurrency(Number(latestRun.total_net))}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    latestRun.status === 'paid' ? 'default' :
                    latestRun.status === 'completed' ? 'secondary' :
                    latestRun.status === 'draft' ? 'outline' : 'destructive'
                  }
                >
                  {latestRun.status === 'paid' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {latestRun.status === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {latestRun.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/payroll/runs/${latestRun.id}`)}
                >
                  View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Runs History */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
              <FileText className="h-4 w-4 text-[#032364]" />
            </div>
            <h2 className="text-sm font-semibold text-[#051536]">Payroll History</h2>
          </div>

          {runs.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payroll runs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first payroll run to get started
              </p>
              <Button
                onClick={() => router.push('/payroll/runs/new')}
                className="mt-4 rounded-lg bg-[#032364] hover:bg-[#032364]/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Payroll Run
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-[#e2e8f0] hover:bg-[#f8fafc] cursor-pointer transition-colors"
                  onClick={() => router.push(`/payroll/runs/${run.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/5">
                      <Banknote className="h-5 w-5 text-[#032364]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#051536]">
                        {new Date(run.period_start).toLocaleDateString()} — {new Date(run.period_end).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {run.employee_count} employees · Gross: {formatCurrency(Number(run.total_gross))} · Net: {formatCurrency(Number(run.total_net))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        run.status === 'paid' ? 'default' :
                        run.status === 'completed' ? 'secondary' :
                        run.status === 'draft' ? 'outline' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {run.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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

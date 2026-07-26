'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getPayrollRunById,
  getPayslipsByRun,
  updatePayrollRunStatus,
  formatCurrency,
} from '@/lib/payroll';
import type { PayrollRun, Payslip, Profile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  Send,
  Banknote,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

type PayslipWithProfile = Payslip & { profiles?: Profile };

export default function PayrollRunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params.id as string;
  const { user, profile, loading } = useAuth();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [payslips, setPayslips] = useState<(Payslip & { profiles?: Profile })[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace('/login');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      const [runData, slipsData] = await Promise.all([
        getPayrollRunById(runId),
        getPayslipsByRun(runId),
      ]);
      setRun(runData);
      setPayslips(slipsData);
      setLoadingData(false);
    }
    if (runId) loadData();
  }, [runId]);

  async function handleApprove() {
    if (!user) return;
    setActionLoading(true);
    const success = await updatePayrollRunStatus(runId, 'completed', user.id);
    if (success) {
      toast.success('Payroll run approved!');
      setRun((prev) => prev ? { ...prev, status: 'completed', approved_by: user.id, approved_at: new Date().toISOString() } : prev);
    } else {
      toast.error('Failed to approve payroll run');
    }
    setActionLoading(false);
  }

  async function handleMarkPaid() {
    setActionLoading(true);
    const success = await updatePayrollRunStatus(runId, 'paid');
    if (success) {
      toast.success('Payroll run marked as paid!');
      setRun((prev) => prev ? { ...prev, status: 'paid', paid_at: new Date().toISOString() } : prev);
    } else {
      toast.error('Failed to mark as paid');
    }
    setActionLoading(false);
  }

  if (loading || loadingData) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Payroll run not found</p>
        <Button variant="ghost" onClick={() => router.push('/payroll')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
    canceled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push('/payroll')}
          className="rounded-lg px-2 hover:bg-secondary shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-[#051536]">
            Payroll Run
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            {new Date(run.period_start).toLocaleDateString()} — {new Date(run.period_end).toLocaleDateString()}
          </p>
        </div>
        <Badge className={statusColors[run.status] || ''}>
          {run.status}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Employees</p>
            <p className="text-xl font-bold text-[#051536]">{run.employee_count}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Gross Pay</p>
            <p className="text-xl font-bold text-[#051536]">{formatCurrency(Number(run.total_gross))}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Deductions</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(Number(run.total_deductions))}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Net Pay</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(Number(run.total_net))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {run.status === 'draft' && (
        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={actionLoading}
            className="rounded-lg bg-[#032364] hover:bg-[#032364]/90"
          >
            {actionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve Payroll
          </Button>
        </div>
      )}

      {run.status === 'completed' && (
        <div className="flex gap-3">
          <Button
            onClick={handleMarkPaid}
            disabled={actionLoading}
            className="rounded-lg bg-green-600 hover:bg-green-700"
          >
            {actionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Mark as Paid
          </Button>
        </div>
      )}

      {/* Payslips Table */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
              <FileText className="h-4 w-4 text-[#032364]" />
            </div>
            <h2 className="text-sm font-semibold text-[#051536]">
              Payslips ({payslips.length})
            </h2>
          </div>

          {payslips.length === 0 ? (
            <div className="text-center py-8">
              <Banknote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payslips generated</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0]">
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Employee</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">Base Pay</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">Overtime</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">Gross</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">Deductions</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">Net Pay</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">Days</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((slip) => (
                    <tr key={slip.id} className="border-b border-[#e2e8f0] last:border-0">
                      <td className="py-3 px-2">
                        <p className="font-medium text-[#051536]">
                          {slip.profiles?.first_name} {slip.profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slip.profiles?.employee_id || slip.profiles?.email}
                        </p>
                      </td>
                      <td className="text-right py-3 px-2 text-[#051536]">
                        {formatCurrency(Number(slip.base_pay))}
                      </td>
                      <td className="text-right py-3 px-2 text-[#051536]">
                        {Number(slip.overtime_hours) > 0 ? (
                          <span>
                            {formatCurrency(Number(slip.overtime_pay))}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({Number(slip.overtime_hours).toFixed(1)}h)
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-[#051536]">
                        {formatCurrency(Number(slip.gross_pay))}
                      </td>
                      <td className="text-right py-3 px-2 text-red-600">
                        -{formatCurrency(Number(slip.total_deductions))}
                      </td>
                      <td className="text-right py-3 px-2 font-semibold text-green-600">
                        {formatCurrency(Number(slip.net_pay))}
                      </td>
                      <td className="text-right py-3 px-2 text-muted-foreground">
                        {slip.days_present}/{slip.days_worked}
                      </td>
                      <td className="text-center py-3 px-2">
                        <Badge
                          variant={
                            slip.status === 'paid' ? 'default' :
                            slip.status === 'approved' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {slip.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  createPayrollRun,
  generatePayslips,
  getAllCompensation,
  formatCurrency,
  getPayFrequencyLabel,
} from '@/lib/payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Loader2,
  Play,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function NewPayrollRunPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingComp, setLoadingComp] = useState(true);
  const [employeesWithoutComp, setEmployeesWithoutComp] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace('/login');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!profile?.org_id) return;

    async function loadCompensation() {
      setLoadingComp(true);
      const comp = await getAllCompensation(profile!.org_id);
      // Check employees without compensation
      const { getSupabase } = await import('@/lib/supabase');
      const { count } = await getSupabase()
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile!.org_id)
        .eq('is_active', true);

      const totalEmployees = count || 0;
      const withComp = comp.length;
      setEmployeesWithoutComp(Math.max(0, totalEmployees - withComp));
      setLoadingComp(false);
    }

    loadCompensation();
  }, [profile?.org_id]);

  // Set default dates (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setPeriodStart(firstDay.toISOString().split('T')[0]);
    setPeriodEnd(lastDay.toISOString().split('T')[0]);
  }, []);

  async function handleCreate() {
    if (!periodStart || !periodEnd || !profile?.org_id || !user) return;

    if (new Date(periodStart) > new Date(periodEnd)) {
      toast.error('Period start must be before period end');
      return;
    }

    setSubmitting(true);
    try {
      const run = await createPayrollRun(profile.org_id, periodStart, periodEnd, user.id, notes);
      if (!run) {
        toast.error('Failed to create payroll run');
        return;
      }

      toast.success('Payroll run created! Generating payslips...');

      const result = await generatePayslips(run.id, profile.org_id);

      if (result.success) {
        toast.success(`Generated ${result.count} payslips successfully!`);
      } else {
        toast.warning(`Generated ${result.count} payslips with ${result.errors.length} warnings`);
      }

      router.push(`/payroll/runs/${run.id}`);
    } catch {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push('/payroll')}
          className="rounded-lg px-2 hover:bg-secondary shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-[#051536]">New Payroll Run</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Create a new payroll run and generate payslips
          </p>
        </div>
      </div>

      {/* Warning */}
      {employeesWithoutComp > 0 && (
        <Card className="rounded-xl border-0 bg-amber-50 border border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {employeesWithoutComp} employee(s) don&apos;t have compensation set
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  These employees will be skipped during payslip generation. Set their
                  compensation in Settings &gt; Compensation first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Start *</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Period End *</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., July 2026 monthly payroll"
              className="rounded-lg resize-none"
              rows={2}
            />
          </div>

          <div className="p-4 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
            <h3 className="text-sm font-medium text-[#051536] mb-2">What will happen:</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Attendance records will be counted for each employee
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Overtime hours will be calculated from check-in/out times
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Deductions (tax, pension, insurance) will be auto-calculated
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Payslips will be generated in draft status for review
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/payroll')}
          className="rounded-lg px-6"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={submitting || !periodStart || !periodEnd}
          className="rounded-lg bg-[#032364] px-6 hover:bg-[#032364]/90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Create & Generate Payslips
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

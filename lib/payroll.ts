import { getSupabase, PayrollRun, Payslip, EmployeeCompensation, WorkSchedule, Profile } from './supabase';

// ─── Work Schedule ───────────────────────────────────────────────────────────

export async function getWorkSchedule(orgId: string): Promise<WorkSchedule | null> {
  const { data, error } = await getSupabase()
    .from('work_schedules')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching work schedule:', error);
    return null;
  }

  return data;
}

export async function updateWorkSchedule(
  orgId: string,
  updates: Partial<Pick<WorkSchedule, 'start_time' | 'end_time' | 'grace_minutes' | 'work_hours' | 'break_minutes'>>
): Promise<WorkSchedule | null> {
  const { data: existing } = await getSupabase()
    .from('work_schedules')
    .select('id')
    .eq('org_id', orgId)
    .eq('is_default', true)
    .maybeSingle();

  if (existing) {
    const { data, error } = await getSupabase()
      .from('work_schedules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating work schedule:', error);
      return null;
    }
    return data;
  }

  // Create default schedule if none exists
  const { data, error } = await getSupabase()
    .from('work_schedules')
    .insert({
      org_id: orgId,
      name: 'Standard',
      is_default: true,
      ...updates,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating work schedule:', error);
    return null;
  }

  return data;
}

// ─── Employee Compensation ───────────────────────────────────────────────────

export async function getEmployeeCompensation(employeeId: string, orgId: string): Promise<EmployeeCompensation | null> {
  const { data, error } = await getSupabase()
    .from('employee_compensation')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .is('end_date', null)
    .order('effective_date', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('Error fetching compensation:', error);
    return null;
  }

  return data;
}

export async function getAllCompensation(orgId: string): Promise<(EmployeeCompensation & { profiles?: Profile })[]> {
  const { data, error } = await getSupabase()
    .from('employee_compensation')
    .select('*, profiles!employee_compensation_employee_id_fkey(id, first_name, last_name, email, employee_id, department)')
    .eq('org_id', orgId)
    .is('end_date', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching compensation list:', error);
    return [];
  }

  return data as (EmployeeCompensation & { profiles?: Profile })[];
}

export async function upsertCompensation(
  employeeId: string,
  orgId: string,
  baseSalary: number,
  currency: string,
  payFrequency: EmployeeCompensation['pay_frequency']
): Promise<EmployeeCompensation | null> {
  // End any existing active compensation
  await getSupabase()
    .from('employee_compensation')
    .update({ end_date: new Date().toISOString().split('T')[0] })
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .is('end_date', null);

  const { data, error } = await getSupabase()
    .from('employee_compensation')
    .insert({
      employee_id: employeeId,
      org_id: orgId,
      base_salary: baseSalary,
      currency,
      pay_frequency: payFrequency,
      effective_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting compensation:', error);
    return null;
  }

  return data;
}

// ─── Payroll Runs ────────────────────────────────────────────────────────────

export async function getPayrollRuns(orgId: string): Promise<PayrollRun[]> {
  const { data, error } = await getSupabase()
    .from('payroll_runs')
    .select('*')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false });

  if (error) {
    console.error('Error fetching payroll runs:', error);
    return [];
  }

  return data as PayrollRun[];
}

export async function getPayrollRunById(id: string): Promise<PayrollRun | null> {
  const { data, error } = await getSupabase()
    .from('payroll_runs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching payroll run:', error);
    return null;
  }

  return data;
}

export async function createPayrollRun(
  orgId: string,
  periodStart: string,
  periodEnd: string,
  createdBy: string,
  notes?: string
): Promise<PayrollRun | null> {
  const { data, error } = await getSupabase()
    .from('payroll_runs')
    .insert({
      org_id: orgId,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'draft',
      created_by: createdBy,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payroll run:', error);
    return null;
  }

  return data;
}

export async function updatePayrollRunStatus(
  id: string,
  status: PayrollRun['status'],
  userId?: string
): Promise<boolean> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed' || status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }
  if (userId && (status === 'completed' || status === 'paid')) {
    updates.approved_by = userId;
    updates.approved_at = new Date().toISOString();
  }

  const { error } = await getSupabase()
    .from('payroll_runs')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating payroll run:', error);
    return false;
  }

  return true;
}

// ─── Payslips ────────────────────────────────────────────────────────────────

export async function getPayslipsByRun(payrollRunId: string): Promise<(Payslip & { profiles?: Profile })[]> {
  const { data, error } = await getSupabase()
    .from('payslips')
    .select('*, profiles!payslips_employee_id_fkey(id, first_name, last_name, email, employee_id, department)')
    .eq('payroll_run_id', payrollRunId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching payslips:', error);
    return [];
  }

  return data as (Payslip & { profiles?: Profile })[];
}

export async function getPayslipsByEmployee(employeeId: string): Promise<Payslip[]> {
  const { data, error } = await getSupabase()
    .from('payslips')
    .select('*')
    .eq('employee_id', employeeId)
    .order('period_start', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error fetching employee payslips:', error);
    return [];
  }

  return data as Payslip[];
}

export async function generatePayslips(
  payrollRunId: string,
  orgId: string
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  // Get the payroll run
  const run = await getPayrollRunById(payrollRunId);
  if (!run) return { success: false, count: 0, errors: ['Payroll run not found'] };

  // Get active employees with compensation
  const { data: employees, error: empErr } = await getSupabase()
    .from('profiles')
    .select('id, first_name, last_name, employee_id, department')
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (empErr || !employees) {
    return { success: false, count: 0, errors: ['Failed to fetch employees'] };
  }

  for (const emp of employees) {
    try {
      // Get compensation
      const { data: comp } = await getSupabase()
        .from('employee_compensation')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('org_id', orgId)
        .is('end_date', null)
        .maybeSingle();

      if (!comp) {
        errors.push(`${emp.first_name} ${emp.last_name}: No compensation set`);
        continue;
      }

      // Get attendance for the period
      const { data: attendance } = await getSupabase()
        .from('attendance_records')
        .select('status, check_in, check_out')
        .eq('employee_id', emp.id)
        .eq('org_id', orgId)
        .gte('date', run.period_start)
        .lte('date', run.period_end);

      const records = attendance || [];
      const daysPresent = records.filter((r) => r.status === 'present' || r.status === 'late').length;
      const daysLate = records.filter((r) => r.status === 'late').length;
      const daysAbsent = records.filter((r) => r.status === 'absent').length;
      const totalDays = Math.max(1, Math.ceil(
        (new Date(run.period_end).getTime() - new Date(run.period_start).getTime()) / 86400000
      ) + 1);
      const daysWorked = Math.max(1, daysPresent + daysLate);

      // Calculate base pay based on pay frequency
      let basePay = comp.base_salary;
      if (comp.pay_frequency === 'hourly') {
        // For hourly, calculate from hours worked
        const totalHours = records.reduce((sum, r) => {
          if (r.check_in && r.check_out) {
            return sum + (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 3600000;
          }
          return sum;
        }, 0);
        basePay = totalHours * comp.base_salary;
      } else if (comp.pay_frequency === 'weekly') {
        basePay = (comp.base_salary * 52) / 52;
      } else if (comp.pay_frequency === 'biweekly') {
        basePay = (comp.base_salary * 26) / 26;
      }
      // monthly stays as-is

      // Pro-rate if not full period
      const periodRatio = daysWorked / totalDays;
      const proRatedBase = comp.pay_frequency === 'hourly' ? basePay : basePay * periodRatio;

      // Calculate overtime (simplified: assume any hours over 8/day are overtime at 1.5x)
      let overtimeHours = 0;
      for (const r of records) {
        if (r.check_in && r.check_out) {
          const hours = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 3600000;
          if (hours > 8) overtimeHours += hours - 8;
        }
      }
      const hourlyRate = comp.pay_frequency === 'hourly' ? comp.base_salary : comp.base_salary / (8 * 22);
      const overtimePay = overtimeHours * hourlyRate * 1.5;

      // Gross pay
      const grossPay = proRatedBase + overtimePay;

      // Deductions (simplified: 10% tax, 8% pension, 5% insurance)
      const taxDeduction = grossPay * 0.10;
      const pensionDeduction = grossPay * 0.08;
      const insuranceDeduction = grossPay * 0.05;
      const totalDeductions = taxDeduction + pensionDeduction + insuranceDeduction;
      const netPay = grossPay - totalDeductions;

      // Insert payslip
      const { error: slipErr } = await getSupabase()
        .from('payslips')
        .insert({
          payroll_run_id: payrollRunId,
          employee_id: emp.id,
          org_id: orgId,
          period_start: run.period_start,
          period_end: run.period_end,
          base_pay: proRatedBase,
          overtime_hours: overtimeHours,
          overtime_pay: overtimePay,
          gross_pay: grossPay,
          tax_deduction: taxDeduction,
          insurance_deduction: insuranceDeduction,
          pension_deduction: pensionDeduction,
          total_deductions: totalDeductions,
          net_pay: netPay,
          days_worked: daysWorked,
          days_present: daysPresent,
          days_absent: daysAbsent,
          days_late: daysLate,
          hours_worked: records.reduce((sum, r) => {
            if (r.check_in && r.check_out) {
              return sum + (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 3600000;
            }
            return sum;
          }, 0),
          status: 'draft',
        });

      if (slipErr) {
        errors.push(`${emp.first_name} ${emp.last_name}: ${slipErr.message}`);
      } else {
        count++;
      }
    } catch (err) {
      errors.push(`${emp.first_name} ${emp.last_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Update payroll run totals
  if (count > 0) {
    const { data: slips } = await getSupabase()
      .from('payslips')
      .select('gross_pay, total_deductions, net_pay')
      .eq('payroll_run_id', payrollRunId);

    if (slips) {
      const totals = slips.reduce(
        (acc, s) => ({
          gross: acc.gross + Number(s.gross_pay),
          deductions: acc.deductions + Number(s.total_deductions),
          net: acc.net + Number(s.net_pay),
        }),
        { gross: 0, deductions: 0, net: 0 }
      );

      await getSupabase()
        .from('payroll_runs')
        .update({
          total_gross: totals.gross,
          total_deductions: totals.deductions,
          total_net: totals.net,
          employee_count: count,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payrollRunId);
    }
  }

  return { success: errors.length === 0, count, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getPayFrequencyLabel(freq: string): string {
  switch (freq) {
    case 'hourly': return 'Hourly';
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Bi-weekly';
    case 'monthly': return 'Monthly';
    default: return freq;
  }
}

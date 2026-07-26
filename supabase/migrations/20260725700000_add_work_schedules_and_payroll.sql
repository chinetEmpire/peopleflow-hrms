-- ============================================================
-- Phase 7: Work Schedules & Payroll
-- ============================================================

-- Work schedule configuration per org
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Standard',
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  grace_minutes INT NOT NULL DEFAULT 15,
  work_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  break_minutes INT NOT NULL DEFAULT 60,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee compensation records
CREATE TABLE IF NOT EXISTS employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  pay_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (pay_frequency IN ('hourly', 'weekly', 'biweekly', 'monthly')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, org_id, effective_date)
);

-- Payroll runs (batch processing)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'paid', 'canceled')),
  total_gross NUMERIC(14, 2) DEFAULT 0,
  total_deductions NUMERIC(14, 2) DEFAULT 0,
  total_net NUMERIC(14, 2) DEFAULT 0,
  employee_count INT DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual payslips
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6, 2) DEFAULT 0,
  overtime_pay NUMERIC(12, 2) DEFAULT 0,
  bonuses NUMERIC(12, 2) DEFAULT 0,
  allowances NUMERIC(12, 2) DEFAULT 0,
  gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_deduction NUMERIC(12, 2) DEFAULT 0,
  insurance_deduction NUMERIC(12, 2) DEFAULT 0,
  pension_deduction NUMERIC(12, 2) DEFAULT 0,
  other_deductions NUMERIC(12, 2) DEFAULT 0,
  total_deductions NUMERIC(12, 2) DEFAULT 0,
  net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  days_worked INT DEFAULT 0,
  days_present INT DEFAULT 0,
  days_absent INT DEFAULT 0,
  days_late INT DEFAULT 0,
  hours_worked NUMERIC(6, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'void')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- Work schedules: org members read, hr_admin manage
CREATE POLICY "Org members can view work schedules" ON work_schedules
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "HR admins can manage work schedules" ON work_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = work_schedules.org_id AND role IN ('hr_admin', 'super_admin'))
  );

-- Employee compensation: hr_admin can manage, employees can view own
CREATE POLICY "HR admins can manage compensation" ON employee_compensation
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = employee_compensation.org_id AND role IN ('hr_admin', 'super_admin'))
  );

CREATE POLICY "Employees can view own compensation" ON employee_compensation
  FOR SELECT USING (employee_id = auth.uid());

-- Payroll runs: hr_admin manage, org members view
CREATE POLICY "Org members can view payroll runs" ON payroll_runs
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "HR admins can manage payroll runs" ON payroll_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = payroll_runs.org_id AND role IN ('hr_admin', 'super_admin'))
  );

-- Payslips: employees view own, hr_admin view all org, manage
CREATE POLICY "HR admins can manage payslips" ON payslips
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = payslips.org_id AND role IN ('hr_admin', 'super_admin'))
  );

CREATE POLICY "Employees can view own payslips" ON payslips
  FOR SELECT USING (employee_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_schedules_org ON work_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_compensation_employee ON employee_compensation(employee_id, org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id, org_id);

-- Seed a default work schedule for existing orgs
INSERT INTO work_schedules (org_id, name, start_time, end_time, grace_minutes, work_hours, is_default)
SELECT id, 'Standard', '09:00', '17:00', 15, 8.0, true
FROM organizations
ON CONFLICT DO NOTHING;

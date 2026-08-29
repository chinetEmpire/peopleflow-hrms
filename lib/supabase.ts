import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See SUPABASE_SETUP.md.',
      );
    }

    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

export type Role = 'employee' | 'manager' | 'hr_admin' | 'super_admin';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  logo_url: string | null;
  primary_color: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  max_employees: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  employee_id: string | null;
  first_name: string;
  last_name: string;
  nick_name: string | null;
  email: string;
  role: Role;
  org_id: string;
  job_title: string | null;
  phone: string | null;
  avatar_url: string | null;
  hire_date: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  gender: string | null;
  date_of_birth: string | null;
  marital_status: string | null;
  nationality: string | null;
  home_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  employment_type: string | null;
  employment_status: string | null;
  department: string | null;
  work_experience: WorkExperience[] | null;
  education_details: EducationDetail[] | null;
  dependents: Dependent[] | null;
  organization?: Organization;
}

export interface WorkExperience {
  company: string;
  job_title: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface EducationDetail {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  grade: string;
}

export interface Dependent {
  name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_in_location: string | null;
  check_out_location: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes: string | null;
}

export interface LeaveType {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  days_allowed: number;
  color: string;
  is_active: boolean;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  org_id: string;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  leave_types?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  org_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  profiles?: Profile;
  leave_types?: LeaveType;
  approver?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  org_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  profiles?: Profile;
}

export type NotificationType =
  | 'check_in_reminder'
  | 'check_out_reminder'
  | 'leave_approved'
  | 'leave_rejected';

export interface NotificationRecord {
  id: string;
  user_id: string;
  org_id: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: Role;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  invited_by_name?: string;
}

// ─── Payroll & Work Schedule Types ──────────────────────────────────────────

export interface WorkSchedule {
  id: string;
  org_id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  work_hours: number;
  break_minutes: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCompensation {
  id: string;
  employee_id: string;
  org_id: string;
  base_salary: number;
  currency: string;
  pay_frequency: 'hourly' | 'weekly' | 'biweekly' | 'monthly';
  effective_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  org_id: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'processing' | 'completed' | 'paid' | 'canceled';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  org_id: string;
  period_start: string;
  period_end: string;
  base_pay: number;
  overtime_hours: number;
  overtime_pay: number;
  bonuses: number;
  allowances: number;
  gross_pay: number;
  tax_deduction: number;
  insurance_deduction: number;
  pension_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  days_worked: number;
  days_present: number;
  days_absent: number;
  days_late: number;
  hours_worked: number;
  status: 'draft' | 'approved' | 'paid' | 'void';
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See SUPABASE_SETUP.md.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Role = 'employee' | 'manager' | 'hr_admin' | 'super_admin';

export interface Profile {
  id: string;
  employee_id: string | null;
  first_name: string;
  last_name: string;
  nick_name: string | null;
  email: string;
  role: Role;
  department: string | null;
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
  work_experience: WorkExperience[] | null;
  education_details: EducationDetail[] | null;
  dependents: Dependent[] | null;
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
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes: string | null;
}

export interface LeaveType {
  id: string;
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
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  profiles?: Profile;
}

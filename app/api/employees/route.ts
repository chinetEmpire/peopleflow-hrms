import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyHrAdmin } from '@/lib/supabase-admin';
import { isValidRole, isValidPassword, pick } from '@/lib/validation';

const ALLOWED_UPDATE_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'job_title',
  'department_id', 'manager_id', 'hire_date', 'is_active',
  'nick_name', 'avatar_url', 'employee_id',
] as const;

export async function POST(req: Request) {
  try {
    const auth = await verifyHrAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Only HR admins or super admins can manage employees' }, { status: 403 });

    const { user, profile } = auth;
    const orgId = profile.org_id;
    if (!orgId) {
      return NextResponse.json({ error: 'User is not associated with an organization' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const action = body.action;

    if (action === 'create') {
      const {
        email, password, first_name, last_name, role: requestedRole, employee_id,
        job_title, phone, hire_date, manager_id, nick_name,
        gender, date_of_birth, marital_status, nationality, home_address,
        emergency_contact_name, emergency_contact_phone,
        bank_name, bank_account_number,
        employment_type, employment_status, department,
        work_experience, education_details, dependents,
      } = body;

      if (!email || !password || !first_name || !last_name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const pwCheck = isValidPassword(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }

      const role = requestedRole || 'employee';
      if (!isValidRole(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      if ((role === 'hr_admin' || role === 'super_admin') && profile.role !== 'super_admin') {
        return NextResponse.json({ error: 'You cannot assign hr_admin or super_admin roles' }, { status: 403 });
      }

      const { data: subCheck } = await supabaseAdmin.rpc('check_subscription_active', { org_uuid: orgId });
      if (subCheck === false) {
        return NextResponse.json({
          error: 'Your subscription is not active. Please renew or contact support to continue adding employees.',
          subscriptionInactive: true,
        }, { status: 403 });
      }

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('plan, max_employees')
        .eq('id', orgId)
        .single();

      if (org && org.max_employees !== -1) {
        const { count } = await supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('is_active', true);

        if (count !== null && count >= org.max_employees) {
          return NextResponse.json({
            error: `Employee limit reached. Your ${org.plan} plan allows ${org.max_employees} employees. Please upgrade to add more.`,
            limitReached: true,
            current: count,
            max: org.max_employees,
            plan: org.plan,
          }, { status: 403 });
        }
      }

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, role, org_id: orgId },
      });

      if (authErr) throw authErr;

      const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        org_id: orgId,
        employee_id: employee_id || null,
        first_name,
        last_name,
        nick_name: nick_name || null,
        email,
        role,
        job_title: job_title || null,
        phone: phone || null,
        hire_date: hire_date || null,
        manager_id: manager_id || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        marital_status: marital_status || null,
        nationality: nationality || null,
        home_address: home_address || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        bank_name: bank_name || null,
        bank_account_number: bank_account_number || null,
        employment_type: employment_type || 'full_time',
        employment_status: employment_status || 'active',
        department: department || null,
        work_experience: work_experience || [],
        education_details: education_details || [],
        dependents: dependents || [],
      });

      if (profErr) throw profErr;

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
        org_id: orgId,
        action: 'create',
        entity: 'employee',
        entity_id: authData.user.id,
        details: { name: `${first_name} ${last_name}`, email },
      });

      return NextResponse.json({ success: true, userId: authData.user.id });
    }

    if (action === 'update') {
      const { id, password, action: _action, ...rest } = body;
      if (!id) return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });

      if (password) {
        const pwCheck = isValidPassword(password);
        if (!pwCheck.valid) {
          return NextResponse.json({ error: pwCheck.error }, { status: 400 });
        }
      }

      const profileUpdates = pick(rest, ALLOWED_UPDATE_FIELDS as unknown as (keyof typeof rest)[]);

      const { error: profErr } = await supabaseAdmin
        .from('profiles')
        .update({ ...profileUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId);

      if (profErr) throw profErr;

      if (password) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
        if (pwErr) throw pwErr;
      }

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
        org_id: orgId,
        action: 'update',
        entity: 'employee',
        entity_id: id,
        details: { fields: Object.keys(profileUpdates) },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('id', id)
        .maybeSingle();

      if (!targetProfile || targetProfile.org_id !== orgId) {
        return NextResponse.json({ error: 'Employee not found in your organization' }, { status: 404 });
      }

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (delErr) throw delErr;

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
        org_id: orgId,
        action: 'delete',
        entity: 'employee',
        entity_id: id,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[employees] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}

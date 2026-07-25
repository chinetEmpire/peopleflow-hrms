import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}

async function verifyUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'hr_admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Only HR admins or super admins can manage employees' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action;

    if (action === 'create') {
      const {
        email, password, first_name, last_name, role, employee_id,
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

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, role: role || 'employee' },
      });

      if (authErr) throw authErr;

      const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        employee_id: employee_id || null,
        first_name,
        last_name,
        nick_name: nick_name || null,
        email,
        role: role || 'employee',
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
        action: 'create',
        entity: 'employee',
        entity_id: authData.user.id,
        details: { name: `${first_name} ${last_name}`, email },
      });

      return NextResponse.json({ success: true, userId: authData.user.id });
    }

    if (action === 'update') {
      const { id, ...updates } = body;
      if (!id) return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });

      const { password, action: _action, ...profileUpdates } = updates;

      const { error: profErr } = await supabaseAdmin
        .from('profiles')
        .update({ ...profileUpdates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (profErr) throw profErr;

      if (password) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
        if (pwErr) throw pwErr;
      }

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
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

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (delErr) throw delErr;

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: user.id,
        action: 'delete',
        entity: 'employee',
        entity_id: id,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { isValidPlan, isValidMaxEmployees, isValidBillingCycle } from '@/lib/validation';

export async function GET(req: Request) {
  try {
    const authResult = await verifySuperAdmin(req);
    if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user } = authResult;

    const supabase = getSupabaseAdmin();

    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!orgs) return NextResponse.json({ organizations: [] });

    const results = await Promise.all(
      orgs.map(async (org: any) => {
        const [
          { count: userCount },
          { count: deptCount },
          { data: sub },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
          supabase.from('departments').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
          supabase.from('subscriptions').select('plan_id, status, billing_cycle, current_period_end').eq('org_id', org.id).maybeSingle(),
        ]);

        return {
          ...org,
          user_count: userCount ?? 0,
          department_count: deptCount ?? 0,
          subscription: sub,
        };
      })
    );

    return NextResponse.json({ organizations: results });
  } catch (err) {
    console.error('GET /api/admin/organizations', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authResult = await verifySuperAdmin(req);
    if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user } = authResult;

    const body = await req.json();
    const { id, name, plan, max_employees, billing_cycle } = body;
    if (!id) return NextResponse.json({ error: 'Missing organization id' }, { status: 400 });

    if (plan !== undefined && !isValidPlan(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (max_employees !== undefined && !isValidMaxEmployees(max_employees)) {
      return NextResponse.json({ error: 'Invalid max_employees' }, { status: 400 });
    }
    if (billing_cycle !== undefined && !isValidBillingCycle(billing_cycle)) {
      return NextResponse.json({ error: 'Invalid billing_cycle' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // If plan is changing, use the atomic RPC to keep subscriptions in sync
    if (plan !== undefined) {
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('plan')
        .eq('id', id)
        .maybeSingle();

      const planChanged = currentOrg && currentOrg.plan !== plan;
      const cycleChanged = billing_cycle !== undefined;

      if (planChanged || cycleChanged) {
        // Call the RPC via the user's session (it's SECURITY DEFINER)
        const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
        const userClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } },
        );
        await userClient.auth.setSession({ access_token: token, refresh_token: '' });

        const { data: rpcResult, error: rpcError } = await userClient.rpc('admin_change_org_plan', {
          p_org_id: id,
          p_plan_id: plan,
          p_billing_cycle: billing_cycle || 'monthly',
        });

        if (rpcError) throw rpcError;

        // Update name if also changed
        if (name) {
          await supabase.from('organizations').update({ name }).eq('id', id);
        }

        // Audit log with full context
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          org_id: id,
          action: 'update',
          entity: 'organization',
          entity_id: id,
          details: {
            fields: ['plan', 'billing_cycle', ...(name ? ['name'] : [])],
            plan_before: currentOrg?.plan,
            plan_after: plan,
            billing_cycle,
            rpc_result: rpcResult,
          },
        });

        return NextResponse.json({ success: true, subscription_updated: true });
      }
    }

    // Non-plan changes: just update the org record
    const updates: Record<string, any> = {};
    if (name) updates.name = name;
    if (max_employees !== undefined) updates.max_employees = max_employees;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    }

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      org_id: id,
      action: 'update',
      entity: 'organization',
      entity_id: id,
      details: { fields: Object.keys(updates) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/admin/organizations', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

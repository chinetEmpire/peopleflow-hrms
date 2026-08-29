import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, verifyToken } from '@/lib/supabase-admin';
import { isValidPassword, isValidPlan, isValidBillingCycle } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

function generateSlug(name: string): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  if (!slug) {
    slug = 'org';
  }

  return slug;
}

async function makeUniqueSlug(supabaseAdmin: SupabaseClient, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { count } = await supabaseAdmin
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug);

    if (!count || count === 0) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, 'auth');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const body = await req.json();
    const { orgName, adminEmail, adminFirstName, adminLastName, adminPassword, plan, billing_cycle } = body;

    if (!orgName || !adminEmail || !adminFirstName || !adminLastName || !adminPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const passwordCheck = isValidPassword(adminPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const selectedPlan = isValidPlan(plan) ? plan : 'free';
    const billingCycle = isValidBillingCycle(billing_cycle) ? billing_cycle : 'monthly';

    const supabaseAdmin = getSupabaseAdmin();

    // Load the selected plan so org limits + subscription can be created correctly
    const { data: planRow, error: planErr } = await supabaseAdmin
      .from('plans')
      .select('id, name, price_monthly, price_yearly, max_employees')
      .eq('id', selectedPlan)
      .single();

    if (planErr || !planRow) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Verify caller — self-registration always gets hr_admin only
    // Never allow super_admin via self-registration
    const authUser = await verifyToken(req);
    const role = 'hr_admin';

    // Auto-generate slug from org name and ensure uniqueness
    const baseSlug = generateSlug(orgName);
    const orgSlug = await makeUniqueSlug(supabaseAdmin, baseSlug);

    // Check if admin email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === adminEmail);

    if (userExists) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    // Create the organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
        plan: planRow.id,
        max_employees: planRow.max_employees,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Create a subscription row — 'active' for free, 'pending' for paid plans
    // so the org is locked until payment clears (see check_subscription_active)
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const isPaidPlan = planRow.price_monthly > 0 || planRow.price_yearly > 0;

    const { error: subError } = await supabaseAdmin.from('subscriptions').insert({
      org_id: orgData.id,
      plan_id: planRow.id,
      status: isPaidPlan ? 'pending' : 'active',
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: isPaidPlan ? null : 'manual',
    });

    if (subError) {
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      throw subError;
    }

    // Create the admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: adminFirstName,
        last_name: adminLastName,
        role,
        org_id: orgData.id,
      },
    });

    if (authError) {
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      throw authError;
    }

    // Upsert the profile (trigger may have already created it)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      org_id: orgData.id,
      first_name: adminFirstName,
      last_name: adminLastName,
      email: adminEmail,
      role,
    }, { onConflict: 'id' });

    if (profileError) throw profileError;

    // Log the registration
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: authData.user.id,
      org_id: orgData.id,
      action: 'create',
      entity: 'organization',
      entity_id: orgData.id,
      details: { name: orgName, slug: orgSlug, admin_email: adminEmail },
    });

    return NextResponse.json({
      success: true,
      orgId: orgData.id,
      userId: authData.user.id,
      plan: planRow.id,
      requires_payment: isPaidPlan,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

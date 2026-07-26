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
    const body = await req.json();
    const { orgName, adminEmail, adminFirstName, adminLastName, adminPassword } = body;

    if (!orgName || !adminEmail || !adminFirstName || !adminLastName || !adminPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (adminPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

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
        plan: 'free',
        max_employees: 10,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Create the admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'super_admin',
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
      role: 'super_admin',
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
    });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

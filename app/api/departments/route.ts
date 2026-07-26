import { NextResponse } from 'next/server';
import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

async function verifyUserAndGetOrg(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('org_id')
    .eq('id', data.user.id)
    .maybeSingle();

  return profile?.org_id || null;
}

export async function GET(req: Request) {
  try {
    const orgId = await verifyUserAndGetOrg(req);
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getPool().query(
      'SELECT name FROM departments WHERE org_id = $1 ORDER BY name',
      [orgId]
    );
    return NextResponse.json({ departments: result.rows.map((r) => r.name) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await verifyUserAndGetOrg(req);
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const trimmed = name.trim();
    const existing = await getPool().query(
      'SELECT name FROM departments WHERE name = $1 AND org_id = $2',
      [trimmed, orgId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ name: existing.rows[0].name });
    }

    const inserted = await getPool().query(
      'INSERT INTO departments (name, org_id) VALUES ($1, $2) ON CONFLICT (org_id, name) DO UPDATE SET name = $1 RETURNING name',
      [trimmed, orgId]
    );
    return NextResponse.json({ name: inserted.rows[0]?.name ?? trimmed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 },
    );
  }
}

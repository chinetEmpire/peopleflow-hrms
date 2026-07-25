import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    const result = await pool.query('SELECT name FROM departments ORDER BY name');
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
    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const trimmed = name.trim();
    const existing = await pool.query('SELECT name FROM departments WHERE name = $1', [trimmed]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ name: existing.rows[0].name });
    }

    const inserted = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING name',
      [trimmed],
    );
    return NextResponse.json({ name: inserted.rows[0]?.name ?? trimmed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 },
    );
  }
}

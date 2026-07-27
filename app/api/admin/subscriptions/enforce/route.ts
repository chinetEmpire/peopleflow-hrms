import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    // Call the enforcement RPC via the user's session
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    await userClient.auth.setSession({ access_token: token, refresh_token: '' });

    const { data: result, error: rpcError } = await userClient.rpc('enforce_expired_subscriptions');

    if (rpcError) throw rpcError;

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error('Failed to enforce subscriptions:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

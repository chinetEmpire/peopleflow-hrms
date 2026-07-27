import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Shared service-role Supabase client for server-side API routes.
 * Bypasses RLS — use only in trusted server contexts.
 * Verify user authorization at the application layer before using.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase server configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

/**
 * Verify a Bearer token and return the authenticated user.
 * Returns null if token is missing or invalid.
 */
export async function verifyToken(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Verify token and confirm the user has the required role.
 * Returns { user, profile } or null if unauthorized.
 */
export async function verifyRole(req: Request, allowedRoles: string[]) {
  const user = await verifyToken(req);
  if (!user) return null;

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !allowedRoles.includes(profile.role)) return null;
  return { user, profile };
}

/**
 * Verify token and confirm user is a super_admin.
 */
export async function verifySuperAdmin(req: Request) {
  return verifyRole(req, ['super_admin']);
}

/**
 * Verify token and confirm user is hr_admin or super_admin.
 */
export async function verifyHrAdmin(req: Request) {
  return verifyRole(req, ['hr_admin', 'super_admin']);
}

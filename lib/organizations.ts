import { getSupabase, Organization } from './supabase';

/**
 * Get organization by slug (for subdomain routing)
 */
export async function getOrganization(slug: string): Promise<Organization | null> {
  const { data, error } = await getSupabase()
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
  const { data, error } = await getSupabase()
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data;
}

/**
 * Get current user's organization
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  const { data: { user } } = await getSupabase().auth.getUser();
  if (!user) return null;

  const { data, error } = await getSupabase()
    .rpc('get_current_organization')
    .single();

  if (error) {
    console.error('Error fetching current organization:', error);
    return null;
  }

  return data as unknown as Organization;
}

/**
 * Create a new organization (for registration)
 */
export async function createOrganization(
  name: string,
  slug: string,
  createdBy: string,
  plan: Organization['plan'] = 'free',
  maxEmployees: number = 10
): Promise<Organization | null> {
  const { data, error } = await getSupabase()
    .from('organizations')
    .insert({
      name,
      slug,
      created_by: createdBy,
      plan,
      max_employees: maxEmployees
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating organization:', error);
    return null;
  }

  return data;
}

/**
 * Update organization settings (branding, plan, etc.)
 */
export async function updateOrganization(
  id: string,
  updates: Partial<Pick<Organization, 'name' | 'display_name' | 'logo_url' | 'primary_color' | 'plan' | 'max_employees'>>
): Promise<Organization | null> {
  const { data, error } = await getSupabase()
    .from('organizations')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating organization:', error);
    return null;
  }

  return data;
}

/**
 * Check if slug is available for new organization
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { count, error } = await getSupabase()
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  if (error) {
    console.error('Error checking slug availability:', error);
    return false;
  }

  return count === 0;
}

/**
 * Get organization member count
 */
export async function getOrganizationMemberCount(orgId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (error) {
    console.error('Error getting member count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if organization can add more employees based on plan
 */
export async function canAddEmployee(orgId: string): Promise<boolean> {
  const org = await getOrganizationById(orgId);
  if (!org) return false;

  // Enterprise plan has unlimited employees
  if (org.max_employees === -1) return true;

  const memberCount = await getOrganizationMemberCount(orgId);
  return memberCount < org.max_employees;
}

/**
 * Extract organization slug from hostname
 * Example: acme.hrapp.com -> acme
 */
export function extractOrgSlugFromHostname(hostname: string): string | null {
  // For development (localhost), return null
  if (hostname === 'localhost' || hostname.startsWith('127.')) {
    return null;
  }

  // Split by dots and get the first part as slug
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    // e.g., acme.hrapp.com -> acme
    return parts[0];
  }

  return null;
}

/**
 * Build organization portal URL
 */
export function buildOrgUrl(slug: string, basePath: string = ''): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(base);

  // For development, use path-based routing
  if (url.hostname === 'localhost') {
    return `/org/${slug}${basePath}`;
  }

  // For production, use subdomain
  url.hostname = `${slug}.${url.hostname}`;
  return `${url.toString()}${basePath}`;
}

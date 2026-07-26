import { useAuth } from '@/lib/auth-context';

/**
 * Hook to get the current user's organization ID.
 * Returns org_id from the user's profile, or null if not available.
 */
export function useOrganization(): string | null {
  const { profile } = useAuth();
  return profile?.org_id ?? null;
}

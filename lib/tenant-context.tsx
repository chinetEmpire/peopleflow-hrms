'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase, Organization } from './supabase';

interface TenantContextType {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

/**
 * Extracts the org slug from the hostname or cookie.
 *
 * Production: acme.hrapp.com → "acme"
 * Development: localhost:3000 → null (falls back to profile org)
 */
function extractSlugFromHostname(): string | null {
  if (typeof window === 'undefined') return null;

  const { hostname } = window.location;

  // Development — check cookie first (set by middleware)
  if (hostname === 'localhost' || hostname.startsWith('127.')) {
    const match = document.cookie.match(/(?:^|;\s*)org_slug=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  // Production — extract from subdomain
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async (orgId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const slug = extractSlugFromHostname();

      if (slug) {
        // Production: fetch org by subdomain slug
        const { data, error: fetchError } = await getSupabase()
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .single();

        if (fetchError || !data) {
          setError(`Organization "${slug}" not found`);
          setOrganization(null);
        } else {
          setOrganization(data);
        }
      } else if (orgId) {
        // Development: fetch org by ID from profile
        const { data, error: fetchError } = await getSupabase()
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();

        if (fetchError || !data) {
          setError('Organization not found');
          setOrganization(null);
        } else {
          setOrganization(data);
        }
      } else {
        // No slug, no orgId — use RPC as fallback
        const { data, error: rpcError } = await getSupabase()
          .rpc('get_current_organization')
          .single();

        if (rpcError || !data) {
          setOrganization(null);
        } else {
          setOrganization(data as unknown as Organization);
        }
      }
    } catch (err) {
      console.error('Failed to load organization:', err);
      setError('Failed to load organization');
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const refreshOrganization = useCallback(async () => {
    await loadOrganization(organization?.id);
  }, [loadOrganization, organization?.id]);

  return (
    <TenantContext.Provider value={{ organization, loading, error, refreshOrganization }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}

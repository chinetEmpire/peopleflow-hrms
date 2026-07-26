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

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await getSupabase()
        .rpc('get_current_organization')
        .single();

      if (rpcError || !data) {
        setOrganization(null);
      } else {
        setOrganization(data as unknown as Organization);
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
    await loadOrganization();
  }, [loadOrganization]);

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

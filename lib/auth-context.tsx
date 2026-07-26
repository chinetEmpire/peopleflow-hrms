'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, Profile, Organization } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      // Load profile WITHOUT join to avoid RLS deadlock between profiles and organizations
      const { data: profileData, error: profileError } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile load error:', profileError.message);
        setProfile(null);
        setOrganization(null);
        return;
      }

      if (!profileData) {
        console.warn('No profile found for user:', userId);
        setProfile(null);
        setOrganization(null);
        return;
      }

      setProfile(profileData as Profile);

      // Load organization separately to avoid RLS cross-table issues
      if (profileData.org_id) {
        const { data: orgData, error: orgError } = await getSupabase()
          .from('organizations')
          .select('*')
          .eq('id', profileData.org_id)
          .maybeSingle();

        if (orgError) {
          console.error('Organization load error:', orgError.message);
          setOrganization(null);
        } else {
          setOrganization(orgData as Organization | null);
        }
      } else {
        setOrganization(null);
      }
    } catch (err) {
      console.error('loadProfile exception:', err);
      setProfile(null);
      setOrganization(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign-in error:', error.message);
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      console.error('Sign-in exception:', err);
      return { error: err instanceof Error ? err.message : 'Network error. Please check your connection.' };
    }
  }

  async function signOut() {
    await getSupabase().auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, organization, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

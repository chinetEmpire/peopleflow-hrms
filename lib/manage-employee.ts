'use client';

import { supabase } from './supabase';

export async function callManageEmployee(action: string, data: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-employee`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ action, ...data }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}

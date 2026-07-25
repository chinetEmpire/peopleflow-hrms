'use client';

import { getSupabase } from './supabase';

export async function callManageEmployee(action: string, data: Record<string, unknown>) {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...data }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json;
}

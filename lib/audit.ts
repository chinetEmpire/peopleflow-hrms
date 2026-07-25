'use client';

import { getSupabase } from './supabase';

export async function logAction(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    await getSupabase().from('audit_logs').insert({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId,
      details: details ?? {},
    });
  } catch {
    // Silent fail - audit logging should not block operations
  }
}

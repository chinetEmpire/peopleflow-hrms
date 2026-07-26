'use client';

import { getSupabase } from './supabase';

export async function logAction(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>,
  orgId?: string
) {
  try {
    await getSupabase().from('audit_logs').insert({
      actor_id: actorId,
      org_id: orgId,
      action,
      entity,
      entity_id: entityId,
      details: details ?? {},
    });
  } catch {
    // Silent fail - audit logging should not block operations
  }
}

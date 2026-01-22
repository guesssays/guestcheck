import { supabase } from './supabase';

export async function logAudit(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId?: string,
  payload?: any
) {
  try {
    await supabase.from('audit_log').insert({
      actor_user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      payload: payload || {},
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

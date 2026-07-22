import { supabase } from './supabase/client';

interface LogAuditParams {
  hospitalId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

// Best-effort audit trail. Failures here should never block the actual
// action the user was performing, so errors are swallowed.
export async function logAudit({ hospitalId, userId, action, entityType, entityId, metadata }: LogAuditParams) {
  try {
    await supabase.from('AuditLog').insert({
      hospitalId: hospitalId || null,
      userId: userId || null,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      metadata: metadata || null,
    });
  } catch {
    // non-fatal
  }
}

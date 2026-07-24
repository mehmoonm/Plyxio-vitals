import { supabase } from './supabase/client';

interface NotifyParams {
  hospitalId?: string;
  userId?: string;      // notify a specific person
  targetRole?: string;  // or broadcast to everyone with this role
  type: string;
  title: string;
  message?: string;
  link?: string;
}

// Fire-and-forget: notification failures shouldn't block the action that
// triggered them (e.g. a leave request should still submit even if the
// notification insert fails for some reason).
export async function notify(params: NotifyParams) {
  try {
    await supabase.from('Notification').insert({
      hospitalId: params.hospitalId,
      userId: params.userId || null,
      targetRole: params.targetRole || null,
      type: params.type,
      title: params.title,
      message: params.message || null,
      link: params.link || null,
    });
  } catch {
    // Swallow -- notifications are best-effort
  }
}

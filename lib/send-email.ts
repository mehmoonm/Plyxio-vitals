import { supabase } from './supabase/client';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-reminder-email', {
      body: { to, subject, html },
    });
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

export function appointmentReminderEmail(params: {
  hospitalName: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  reason?: string | null;
}) {
  const { hospitalName, patientName, doctorName, scheduledAt, reason } = params;
  const dateStr = new Date(scheduledAt).toLocaleString();
  return {
    subject: `Appointment Reminder — ${hospitalName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #4f46e5;">${hospitalName}</h2>
        <p>Hi ${patientName},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 0; color: #64748b;">Doctor</td><td style="padding: 6px 0; font-weight: 600;">Dr. ${doctorName}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Date & Time</td><td style="padding: 6px 0; font-weight: 600;">${dateStr}</td></tr>
          ${reason ? `<tr><td style="padding: 6px 0; color: #64748b;">Reason</td><td style="padding: 6px 0;">${reason}</td></tr>` : ''}
        </table>
        <p style="color: #64748b; font-size: 13px;">Please arrive 10–15 minutes early. If you need to reschedule, contact the hospital directly.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Sent by ${hospitalName} via PLYXIO Vitals</p>
      </div>
    `,
  };
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { canManageAppointments } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';

export default function EditAppointmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ date: '', time: '', reason: '' });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('Appointment').select('scheduledAt, reason').eq('id', params.id).single();
      if (data) {
        const dt = new Date(data.scheduledAt);
        setForm({
          date: dt.toISOString().slice(0, 10),
          time: dt.toISOString().slice(11, 16),
          reason: data.reason || '',
        });
      }
      setFetching(false);
    })();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    const { error: updateError } = await supabase
      .from('Appointment')
      .update({ scheduledAt, reason: form.reason || null })
      .eq('id', params.id);
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.push(`/dashboard/appointments/${params.id}`);
  };

  if (fetching) return <div className="text-gray-500">Loading…</div>;

  return (
    <RoleGuard allowed={canManageAppointments(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reschedule Appointment</h1>
        </div>
        <Link href={`/dashboard/appointments/${params.id}`}>
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-2xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Date</label>
            <Input type="date" name="date" value={form.date} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Time</label>
            <Input type="time" name="time" value={form.time} onChange={handleChange} required />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Reason</label>
          <textarea name="reason" value={form.reason} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-300 resize-none" />
        </div>
        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
    </RoleGuard>
  );
}

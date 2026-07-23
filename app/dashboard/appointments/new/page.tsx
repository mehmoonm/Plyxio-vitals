'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { DbPatient, DbUser } from '@/lib/supabase/types';
import { generateDaySlots, isSlotInPast } from '@/lib/appointment-slots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { canManageAppointments } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';

export default function NewAppointmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<DbPatient[]>([]);
  const [doctors, setDoctors] = useState<DbUser[]>([]);
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    patientId: '', doctorId: '', date: '', time: '', reason: '',
  });

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([
        supabase.from('Patient').select('id, fullName, mrn').order('fullName'),
        supabase.from('User').select('id, fullName, specialty').eq('role', 'DOCTOR'),
      ]);
      setPatients((p.data as any) || []);
      setDoctors((d.data as any) || []);
    })();
  }, []);

  useEffect(() => {
    if (!form.doctorId || !form.date) { setBookedTimes(new Set()); return; }
    (async () => {
      setLoadingSlots(true);
      const dayStart = new Date(`${form.date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${form.date}T23:59:59`).toISOString();
      const { data } = await supabase
        .from('Appointment')
        .select('scheduledAt')
        .eq('doctorId', form.doctorId)
        .in('status', ['SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION'])
        .gte('scheduledAt', dayStart)
        .lte('scheduledAt', dayEnd);

      setBookedTimes(new Set((data || []).map((a) => new Date(a.scheduledAt).toTimeString().slice(0, 5))));
      setForm((f) => ({ ...f, time: '' }));
      setLoadingSlots(false);
    })();
  }, [form.doctorId, form.date]);

  const slots = generateDaySlots();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.patientId || !form.doctorId || !form.date || !form.time) {
      setError('Patient, doctor, date, and time are required.');
      setLoading(false);
      return;
    }

    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    const { error: insertError } = await supabase.from('Appointment').insert({
      hospitalId: user?.hospitalId,
      patientId: form.patientId,
      doctorId: form.doctorId,
      scheduledAt,
      reason: form.reason || null,
      status: 'SCHEDULED',
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.code === '23505' ? 'That time was just booked by someone else — please pick another slot.' : insertError.message);
      return;
    }
    router.push('/dashboard/appointments');
  };

  return (
    <RoleGuard allowed={canManageAppointments(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Appointment</h1>
          <p className="text-gray-500 mt-2">Schedule a patient visit with a doctor</p>
        </div>
        <Link href="/dashboard/appointments">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-2xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Patient *</label>
          <select name="patientId" value={form.patientId} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300" required>
            <option value="">Select a patient</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Doctor *</label>
          <select name="doctorId" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value, time: '' })} className="w-full px-4 py-3 rounded-lg border border-gray-300" required>
            <option value="">Select a doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName} {d.specialty ? `— ${d.specialty}` : ''}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Date *</label>
          <Input type="date" name="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })} required />
        </div>

        {form.doctorId && form.date && (
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Available Times *</label>
            {loadingSlots ? (
              <p className="text-sm text-gray-500">Checking availability…</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map((slot) => {
                  const taken = bookedTimes.has(slot);
                  const past = isSlotInPast(form.date, slot);
                  const disabled = taken || past;
                  const selected = form.time === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={disabled}
                      onClick={() => setForm({ ...form, time: slot })}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        selected ? 'bg-indigo-600 text-white border-indigo-600' :
                        disabled ? 'bg-gray-50 text-gray-400 line-through cursor-not-allowed border-gray-200' :
                        'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Reason for Visit</label>
          <textarea name="reason" value={form.reason} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-300 resize-none" />
        </div>

        <Button type="submit" disabled={loading || !form.time} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Scheduling...' : 'Schedule Appointment'}
        </Button>
      </form>
    </div>
    </RoleGuard>
  );
}

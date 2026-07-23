'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/lib/patient-auth-context';
import { supabase } from '@/lib/supabase/client';
import { generateDaySlots, isSlotInPast } from '@/lib/appointment-slots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';

export default function BookAppointmentPage() {
  const router = useRouter();
  const { patient } = usePatientAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ doctorId: '', date: '', time: '', reason: '' });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('User').select('id, fullName, specialty').eq('role', 'DOCTOR').eq('isActive', true);
      setDoctors(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    if (!form.doctorId || !form.date || !form.time) {
      setError('Please select a doctor, date, and time.');
      return;
    }
    setLoading(true);
    setError('');
    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    const { error: insertError } = await supabase.from('Appointment').insert({
      hospitalId: patient.hospitalId,
      patientId: patient.id,
      doctorId: form.doctorId,
      scheduledAt,
      reason: form.reason || null,
      status: 'SCHEDULED',
    });
    setLoading(false);
    if (insertError) {
      // 23505 = unique violation — the DB's own double-booking safety net,
      // in case this exact slot got taken between loading the page and submitting
      setError(insertError.code === '23505' ? 'That time was just booked by someone else — please pick another slot.' : insertError.message);
      return;
    }
    router.push('/portal/appointments');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Book an Appointment</h1>
        <Link href="/portal/appointments">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-5 max-w-xl">
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Doctor *</label>
          <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value, time: '' })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="" className="text-black">Select a doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.id} className="text-black">{d.fullName} — {d.specialty || 'General'}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Date *</label>
          <Input type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
        </div>

        {form.doctorId && form.date && (
          <div>
            <label className="text-sm font-semibold text-gray-200 block mb-2">Available Times *</label>
            {loadingSlots ? (
              <p className="text-sm text-gray-400">Checking availability…</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
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
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selected ? 'bg-indigo-600 text-white' :
                        disabled ? 'bg-white/5 text-gray-500 line-through cursor-not-allowed' :
                        'bg-white/10 text-gray-200 hover:bg-white/20'
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
          <label className="text-sm font-semibold text-gray-200 block mb-2">Reason for Visit</label>
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
        </div>

        <Button type="submit" disabled={loading || !form.time} className="gap-2 gradient-primary">
          <Save className="w-4 h-4" />{loading ? 'Booking...' : 'Book Appointment'}
        </Button>
      </form>
    </div>
  );
}

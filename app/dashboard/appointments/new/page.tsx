'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { DbPatient, DbUser } from '@/lib/supabase/types';
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
      setError(insertError.message);
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
          <select name="doctorId" value={form.doctorId} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300" required>
            <option value="">Select a doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName} {d.specialty ? `— ${d.specialty}` : ''}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Date *</label>
            <Input type="date" name="date" value={form.date} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Time *</label>
            <Input type="time" name="time" value={form.time} onChange={handleChange} required />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Reason for Visit</label>
          <textarea name="reason" value={form.reason} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-300 resize-none" />
        </div>

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Scheduling...' : 'Schedule Appointment'}
        </Button>
      </form>
    </div>
    </RoleGuard>
  );
}

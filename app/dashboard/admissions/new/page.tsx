'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { canManageBeds } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';
import { QuickAddPatientModal } from '@/components/dashboard/quick-add-patient-modal';

export default function NewAdmissionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ patientId: '', bedId: '', attendingDoctorId: '', reasonForAdmission: '' });

  useEffect(() => {
    (async () => {
      const [p, b, d] = await Promise.all([
        supabase.from('Patient').select('id, fullName, mrn').order('fullName'),
        supabase.from('Bed').select('id, bedNumber, Ward(name)').eq('status', 'AVAILABLE'),
        supabase.from('User').select('id, fullName, specialty').eq('role', 'DOCTOR').eq('isActive', true),
      ]);
      setPatients(p.data || []);
      setBeds(b.data || []);
      setDoctors(d.data || []);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.bedId || !form.attendingDoctorId) {
      setError('Patient, bed, and attending doctor are all required.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: admitError } = await supabase.from('Admission').insert({
      hospitalId: user?.hospitalId,
      patientId: form.patientId,
      bedId: form.bedId,
      attendingDoctorId: form.attendingDoctorId,
      admittedAt: new Date().toISOString(),
      reasonForAdmission: form.reasonForAdmission || null,
      status: 'ADMITTED',
    });

    if (admitError) { setError(admitError.message); setLoading(false); return; }

    const { error: bedError } = await supabase.from('Bed').update({ status: 'OCCUPIED' }).eq('id', form.bedId);
    if (bedError) { setError(`Admission created, but failed to update bed status: ${bedError.message}`); setLoading(false); return; }

    setLoading(false);
    router.push('/dashboard/admissions');
  };

  return (
    <RoleGuard allowed={canManageBeds(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-gradient">Admit Patient</h1>
          <p className="text-gray-400 mt-2">Assign a bed and attending doctor</p>
        </div>
        <Link href="/dashboard/admissions">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-5 max-w-xl">
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-200">Patient *</label>
            <button type="button" onClick={() => setShowQuickAdd(true)} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
              <Plus className="w-3 h-3" />New Patient
            </button>
          </div>
          <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="" className="text-black">Select a patient</option>
            {patients.map((p) => <option key={p.id} value={p.id} className="text-black">{p.fullName} ({p.mrn})</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Available Bed *</label>
          <select value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="" className="text-black">Select a bed</option>
            {beds.map((b) => <option key={b.id} value={b.id} className="text-black">{b.Ward?.name} — Bed {b.bedNumber}</option>)}
          </select>
          {beds.length === 0 && <p className="text-xs text-amber-300 mt-1">No available beds right now.</p>}
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Attending Doctor *</label>
          <select value={form.attendingDoctorId} onChange={(e) => setForm({ ...form, attendingDoctorId: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="" className="text-black">Select a doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.id} className="text-black">{d.fullName} — {d.specialty || 'General'}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Reason for Admission</label>
          <textarea value={form.reasonForAdmission} onChange={(e) => setForm({ ...form, reasonForAdmission: e.target.value })} rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
        </div>

        <Button type="submit" disabled={loading} className="gap-2 gradient-primary">
          <Save className="w-4 h-4" />{loading ? 'Admitting...' : 'Admit Patient'}
        </Button>
      </form>

      {showQuickAdd && (
        <QuickAddPatientModal
          onClose={() => setShowQuickAdd(false)}
          onCreated={(newPatient) => {
            setPatients((prev) => [...prev, newPatient as any]);
            setForm((f) => ({ ...f, patientId: newPatient.id }));
            setShowQuickAdd(false);
          }}
        />
      )}
    </div>
    </RoleGuard>
  );
}

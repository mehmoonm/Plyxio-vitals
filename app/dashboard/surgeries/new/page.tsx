'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageSurgery } from '@/lib/permissions';
import { QuickAddPatientModal } from '@/components/dashboard/quick-add-patient-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { RoleGuard } from '@/components/dashboard/role-guard';

export default function NewSurgeryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    surgeonId: '',
    theatreId: '',
    procedureName: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '11:00',
    anesthesiaType: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [p, d, t] = await Promise.all([
        supabase.from('Patient').select('id, fullName, mrn').order('fullName'),
        supabase.from('User').select('id, fullName').eq('role', 'DOCTOR').eq('isActive', true).order('fullName'),
        supabase.from('OperationTheatre').select('id, name').eq('isActive', true).order('name'),
      ]);
      setPatients(p.data || []);
      setDoctors(d.data || []);
      setTheatres(t.data || []);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.surgeonId || !form.theatreId || !form.procedureName.trim() || !form.scheduledDate) {
      setError('Patient, surgeon, theatre, procedure, and date are required.');
      return;
    }
    const scheduledStart = `${form.scheduledDate}T${form.startTime}:00`;
    const scheduledEnd = `${form.scheduledDate}T${form.endTime}:00`;
    if (scheduledStart >= scheduledEnd) { setError('End time must be after start time.'); return; }

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('Surgery').insert({
      hospitalId: user?.hospitalId,
      patientId: form.patientId,
      surgeonId: form.surgeonId,
      theatreId: form.theatreId,
      procedureName: form.procedureName.trim(),
      scheduledStart,
      scheduledEnd,
      status: 'SCHEDULED',
      anesthesiaType: form.anesthesiaType || null,
      notes: form.notes || null,
      createdById: user?.id,
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    router.push('/dashboard/surgeries');
  };

  return (
    <RoleGuard allowed={canManageSurgery(user?.role)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold heading-gradient">Schedule Surgery</h1>
          <Link href="/dashboard/surgeries">
            <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-5 max-w-2xl">
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

          {theatres.length === 0 && (
            <div className="bg-amber-500/20 border border-amber-500/50 text-amber-200 p-3 rounded-lg text-sm">
              No operation theatres set up yet. Ask a hospital admin to add one from the Operation Theatre page.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Patient *</label>
              <button type="button" onClick={() => setShowQuickAdd(true)} className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
                <Plus className="w-3 h-3" />New Patient
              </button>
            </div>
            <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
              <option value="" className="text-black">Select a patient</option>
              {patients.map((p) => <option key={p.id} value={p.id} className="text-black">{p.fullName} ({p.mrn})</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-300 block mb-2">Procedure *</label>
            <Input value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} placeholder="e.g. Appendectomy" className="glass-input px-4 py-3 rounded-lg text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Surgeon *</label>
              <select value={form.surgeonId} onChange={(e) => setForm({ ...form, surgeonId: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
                <option value="" className="text-black">Select a doctor</option>
                {doctors.map((d) => <option key={d.id} value={d.id} className="text-black">Dr. {d.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Theatre *</label>
              <select value={form.theatreId} onChange={(e) => setForm({ ...form, theatreId: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
                <option value="" className="text-black">Select a theatre</option>
                {theatres.map((t) => <option key={t.id} value={t.id} className="text-black">{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Date *</label>
              <Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Start Time</label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">End Time</label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-300 block mb-2">Anesthesia Type</label>
            <Input value={form.anesthesiaType} onChange={(e) => setForm({ ...form, anesthesiaType: e.target.value })} placeholder="e.g. General, Local, Spinal" className="glass-input px-4 py-3 rounded-lg text-white" />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-300 block mb-2">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
          </div>

          <Button type="submit" disabled={loading} className="gap-2 gradient-primary">
            <Save className="w-4 h-4" />{loading ? 'Scheduling...' : 'Schedule Surgery'}
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

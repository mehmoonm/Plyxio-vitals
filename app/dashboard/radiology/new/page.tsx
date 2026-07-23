'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { canManageRadiology } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';
import { QuickAddPatientModal } from '@/components/dashboard/quick-add-patient-modal';

const STUDY_TYPES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography'];

export default function NewRadiologyOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({ patientId: '', studyType: 'X-Ray', bodyPart: '', priority: 'ROUTINE' });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('Patient').select('id, fullName, mrn').order('fullName');
      setPatients(data || []);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { setError('Select a patient.'); return; }
    setLoading(true);
    setError('');

    const { data: order, error: orderError } = await supabase
      .from('RadiologyOrder')
      .insert({
        hospitalId: user?.hospitalId,
        patientId: form.patientId,
        orderedById: user?.id,
        studyType: form.studyType,
        bodyPart: form.bodyPart || null,
        status: 'ORDERED',
        priority: form.priority,
        orderedAt: new Date().toISOString(),
      })
      .select()
      .single();

    setLoading(false);
    if (orderError || !order) { setError(orderError?.message || 'Failed to create order'); return; }
    router.push(`/dashboard/radiology/${order.id}`);
  };

  return (
    <RoleGuard allowed={canManageRadiology(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-gradient">New Radiology Order</h1>
          <p className="text-gray-400 mt-2">Order an imaging study for a patient</p>
        </div>
        <Link href="/dashboard/radiology">
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
          <label className="text-sm font-semibold text-gray-200 block mb-2">Study Type *</label>
          <select value={form.studyType} onChange={(e) => setForm({ ...form, studyType: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            {STUDY_TYPES.map((s) => <option key={s} value={s} className="text-black">{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Body Part</label>
          <Input value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })} placeholder="e.g. Chest, Left Knee" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Priority</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="ROUTINE" className="text-black">Routine</option>
            <option value="URGENT" className="text-black">Urgent</option>
            <option value="STAT" className="text-black">STAT</option>
          </select>
        </div>

        <Button type="submit" disabled={loading} className="gap-2 gradient-primary">
          <Save className="w-4 h-4" />{loading ? 'Ordering...' : 'Place Order'}
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

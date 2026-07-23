'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

export interface QuickPatient {
  id: string;
  fullName: string;
  mrn: string;
}

export function QuickAddPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (patient: QuickPatient) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', gender: 'MALE', cnic: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    setSaving(true);
    setError('');

    const mrn = `MRN-${Date.now().toString().slice(-8)}`;
    const { data, error: insertError } = await supabase
      .from('Patient')
      .insert({
        hospitalId: user?.hospitalId,
        mrn,
        fullName: form.fullName.trim(),
        phone: form.phone || null,
        gender: form.gender,
        cnic: form.cnic || null,
      })
      .select('id, fullName, mrn')
      .single();

    setSaving(false);
    if (insertError || !data) { setError(insertError?.message || 'Failed to create patient'); return; }
    onCreated(data as QuickPatient);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Quick Add Patient</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Just the basics for now — you can fill in the rest from the patient's profile later.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          <Input placeholder="Full name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoFocus required />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <Input placeholder="CNIC (optional)" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Creating...' : 'Create & Select'}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

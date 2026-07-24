'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageConsent } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { RoleGuard } from '@/components/dashboard/role-guard';
import { SignaturePad } from '@/components/dashboard/signature-pad';

const TEMPLATES: Record<string, string> = {
  SURGERY: 'I hereby give my consent for the surgical procedure described above to be performed. I understand the nature, risks, and expected benefits of this procedure, as well as available alternatives, and have had the opportunity to ask questions which have been answered to my satisfaction.',
  PROCEDURE: 'I hereby give my consent for the medical procedure described above. I understand the nature, risks, and expected benefits, and have had the opportunity to ask questions.',
  ADMISSION: 'I hereby give my consent for admission to this hospital for evaluation and treatment. I understand that routine and emergency care may be provided during my stay.',
  ANESTHESIA: 'I hereby give my consent for the administration of anesthesia as deemed necessary by the anesthesiologist. I understand the risks associated with anesthesia and have had the opportunity to ask questions.',
  GENERAL: '',
};

export default function NewConsentFormPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({
    patientId: '',
    type: 'GENERAL',
    title: '',
    content: TEMPLATES.GENERAL,
    signedByName: '',
    relationToPatient: 'SELF',
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('Patient').select('id, fullName, mrn').order('fullName');
      setPatients(data || []);
    })();
  }, []);

  const handleTypeChange = (type: string) => {
    setForm({ ...form, type, content: TEMPLATES[type] || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.title.trim() || !form.content.trim()) { setError('Patient, title, and consent text are required.'); return; }
    if (!signature) { setError('A signature is required before saving.'); return; }
    if (!form.signedByName.trim()) { setError("Enter the signer's name."); return; }

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('ConsentForm').insert({
      hospitalId: user?.hospitalId,
      patientId: form.patientId,
      type: form.type,
      title: form.title.trim(),
      content: form.content.trim(),
      signedByName: form.signedByName.trim(),
      relationToPatient: form.relationToPatient,
      signature,
      witnessedById: user?.id,
      createdById: user?.id,
      signedAt: new Date().toISOString(),
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    router.push('/dashboard/consent-forms');
  };

  return (
    <RoleGuard allowed={canManageConsent(user?.role)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold heading-gradient">New Consent Form</h1>
          <Link href="/dashboard/consent-forms">
            <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-5 max-w-2xl">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Patient *</label>
            <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300">
              <option value="">Select a patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Consent Type</label>
            <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300">
              <option value="GENERAL">General</option>
              <option value="SURGERY">Surgery</option>
              <option value="PROCEDURE">Procedure</option>
              <option value="ADMISSION">Admission</option>
              <option value="ANESTHESIA">Anesthesia</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Title *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Consent for Appendectomy" />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Consent Text *</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} className="w-full px-4 py-3 rounded-lg border border-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Signed By (Name) *</label>
              <Input value={form.signedByName} onChange={(e) => setForm({ ...form, signedByName: e.target.value })} placeholder="Patient's or guardian's name" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Relation to Patient</label>
              <select value={form.relationToPatient} onChange={(e) => setForm({ ...form, relationToPatient: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300">
                <option value="SELF">Self</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="SPOUSE">Spouse</option>
                <option value="PARENT">Parent</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Signature *</label>
            <SignaturePad onChange={setSignature} />
          </div>

          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Signed Consent'}
          </Button>
        </form>
      </div>
    </RoleGuard>
  );
}

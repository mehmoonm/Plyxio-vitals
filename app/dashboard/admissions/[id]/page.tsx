'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageAdmissions, canManageBeds } from '@/lib/permissions';
import { logAudit } from '@/lib/audit-log';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, LogOut, NotebookPen } from 'lucide-react';

export default function AdmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [admission, setAdmission] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({ dischargeDiagnosis: '', dischargeSummary: '', followUpInstructions: '' });
  const [discharging, setDischarging] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [adm, notesRes] = await Promise.all([
      supabase.from('Admission').select('*, Patient(*), User(fullName, specialty), Bed(bedNumber, Ward(name))').eq('id', params.id).single(),
      supabase.from('NursingNote').select('*, User(fullName)').eq('admissionId', params.id).order('recordedAt', { ascending: false }),
    ]);
    setAdmission(adm.data);
    setNotes(notesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { error: noteError } = await supabase.from('NursingNote').insert({
      admissionId: params.id,
      note: newNote.trim(),
      recordedById: user?.id,
      recordedAt: new Date().toISOString(),
    });
    setSavingNote(false);
    if (noteError) { setError(noteError.message); return; }
    setNewNote('');
    await load();
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    setDischarging(true);
    setError('');

    const { error: dischargeError } = await supabase
      .from('Admission')
      .update({
        status: 'DISCHARGED',
        dischargedAt: new Date().toISOString(),
        ...dischargeForm,
      })
      .eq('id', params.id);

    if (dischargeError) { setError(dischargeError.message); setDischarging(false); return; }

    const { error: bedError } = await supabase.from('Bed').update({ status: 'CLEANING' }).eq('id', admission.bedId);
    if (bedError) { setError(`Discharged, but failed to free the bed: ${bedError.message}`); setDischarging(false); return; }

    logAudit({
      hospitalId: user?.hospitalId,
      userId: user?.id,
      action: 'PATIENT_DISCHARGED',
      entityType: 'Admission',
      entityId: params.id as string,
      metadata: { patientName: admission.Patient?.fullName },
    });

    setDischarging(false);
    await load();
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!admission) return <p className="text-gray-400">Admission not found</p>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/admissions">
        <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Admissions</Button>
      </Link>

      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{admission.Patient?.fullName}</h1>
            <p className="text-gray-400 mt-1">MRN: {admission.Patient?.mrn} • {admission.Bed?.Ward?.name} Bed {admission.Bed?.bedNumber}</p>
            <p className="text-gray-400 text-sm mt-1">Attending: Dr. {admission.User?.fullName} ({admission.User?.specialty})</p>
          </div>
          <Badge className={admission.status === 'ADMITTED' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>{admission.status}</Badge>
        </div>

        <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-400">Admitted</p><p className="text-white">{new Date(admission.admittedAt).toLocaleString()}</p></div>
          {admission.dischargedAt && <div><p className="text-gray-400">Discharged</p><p className="text-white">{new Date(admission.dischargedAt).toLocaleString()}</p></div>}
        </div>

        {admission.reasonForAdmission && (
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400">Reason for Admission</p>
            <p className="text-white">{admission.reasonForAdmission}</p>
          </div>
        )}

        {admission.status === 'DISCHARGED' && (
          <div className="pt-4 border-t border-white/10 space-y-2">
            {admission.dischargeDiagnosis && <div><p className="text-sm text-gray-400">Discharge Diagnosis</p><p className="text-white">{admission.dischargeDiagnosis}</p></div>}
            {admission.dischargeSummary && <div><p className="text-sm text-gray-400">Discharge Summary</p><p className="text-white">{admission.dischargeSummary}</p></div>}
            {admission.followUpInstructions && <div><p className="text-sm text-gray-400">Follow-up Instructions</p><p className="text-white">{admission.followUpInstructions}</p></div>}
          </div>
        )}

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        {canManageBeds(user?.role) && admission.status === 'ADMITTED' && !showDischarge && (
          <Button onClick={() => setShowDischarge(true)} variant="outline" className="gap-2 text-amber-300 border-amber-400/50 hover:bg-amber-500/10">
            <LogOut className="w-4 h-4" />Discharge Patient
          </Button>
        )}

        {showDischarge && (
          <form onSubmit={handleDischarge} className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="font-semibold text-white">Discharge Details</h3>
            <textarea placeholder="Discharge diagnosis" value={dischargeForm.dischargeDiagnosis} onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDiagnosis: e.target.value })} rows={2} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
            <textarea placeholder="Discharge summary" value={dischargeForm.dischargeSummary} onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeSummary: e.target.value })} rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
            <textarea placeholder="Follow-up instructions" value={dischargeForm.followUpInstructions} onChange={(e) => setDischargeForm({ ...dischargeForm, followUpInstructions: e.target.value })} rows={2} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
            <div className="flex gap-2">
              <Button type="submit" disabled={discharging} className="gap-2 gradient-primary"><LogOut className="w-4 h-4" />{discharging ? 'Discharging...' : 'Confirm Discharge'}</Button>
              <Button type="button" variant="outline" onClick={() => setShowDischarge(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><NotebookPen className="w-5 h-5 text-cyan-400" />Nursing Notes</h2>

        {canManageAdmissions(user?.role) && (
          <form onSubmit={addNote} className="flex gap-2">
            <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a nursing note…" className="glass-input flex-1 px-4 py-3 rounded-lg text-white" />
            <Button type="submit" disabled={savingNote} className="gradient-primary">{savingNote ? 'Saving...' : 'Add'}</Button>
          </form>
        )}

        {notes.length === 0 ? (
          <p className="text-gray-400 text-sm">No notes recorded yet</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="bg-white/5 rounded-lg px-4 py-3">
                <p className="text-white text-sm">{n.note}</p>
                <p className="text-xs text-gray-400 mt-1">{n.User?.fullName} • {new Date(n.recordedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

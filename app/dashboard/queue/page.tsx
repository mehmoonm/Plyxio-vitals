'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageQueue } from '@/lib/permissions';
import { QuickAddPatientModal } from '@/components/dashboard/quick-add-patient-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, PhoneCall, CheckCircle2, XCircle, Monitor } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  WAITING: 'bg-amber-100 text-amber-800',
  CALLED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  DONE: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-gray-200 text-gray-700',
};

export default function QueuePage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [form, setForm] = useState({ patientId: '', walkInName: '', doctorId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const [t, p, d] = await Promise.all([
      supabase.from('QueueToken').select('*, Patient(fullName, mrn), User(fullName)').eq('queueDate', today).order('tokenNumber'),
      supabase.from('Patient').select('id, fullName, mrn').order('fullName'),
      supabase.from('User').select('id, fullName').eq('role', 'DOCTOR').eq('isActive', true),
    ]);
    setTokens(t.data || []);
    setPatients(p.data || []);
    setDoctors(d.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId && !form.walkInName.trim()) { setError('Select a patient or enter a walk-in name.'); return; }
    setSaving(true);
    setError('');

    const nextTokenNumber = (tokens[tokens.length - 1]?.tokenNumber || 0) + 1;

    const { error: insertError } = await supabase.from('QueueToken').insert({
      hospitalId: user?.hospitalId,
      patientId: form.patientId || null,
      walkInName: form.patientId ? null : form.walkInName.trim(),
      doctorId: form.doctorId || null,
      tokenNumber: nextTokenNumber,
      status: 'WAITING',
    });

    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setForm({ patientId: '', walkInName: '', doctorId: '' });
    setShowCheckIn(false);
    await load();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'CALLED') updates.calledAt = new Date().toISOString();
    if (status === 'DONE') updates.completedAt = new Date().toISOString();
    await supabase.from('QueueToken').update(updates).eq('id', id);
    await load();
  };

  if (!canManageQueue(user?.role)) {
    return <div className="text-gray-400">This page is only available to admins, receptionists, doctors, and nurses.</div>;
  }

  const waiting = tokens.filter((t) => t.status === 'WAITING');
  const nowServing = tokens.filter((t) => t.status === 'CALLED' || t.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-300" />Walk-in Queue
          </h1>
          <p className="text-gray-400 mt-2">Today's token queue — {waiting.length} waiting</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/queue-display?hospitalId=${user?.hospitalId}`} target="_blank">
            <Button variant="outline" className="gap-2"><Monitor className="w-4 h-4" />Open Display Screen</Button>
          </Link>
          <Button onClick={() => setShowCheckIn((v) => !v)} className="gap-2 gradient-primary"><Plus className="w-4 h-4" />Check In</Button>
        </div>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

      {showCheckIn && (
        <form onSubmit={handleCheckIn} className="glass-card rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-gray-300">Existing Patient</label>
            <button type="button" onClick={() => setShowQuickAdd(true)} className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
              <Plus className="w-3 h-3" />New Patient
            </button>
          </div>
          <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value, walkInName: '' })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="" className="text-black">— or enter a walk-in name below —</option>
            {patients.map((p) => <option key={p.id} value={p.id} className="text-black">{p.fullName} ({p.mrn})</option>)}
          </select>
          <Input placeholder="Walk-in name (if not a registered patient)" value={form.walkInName} onChange={(e) => setForm({ ...form, walkInName: e.target.value, patientId: '' })} className="glass-input px-4 py-3 rounded-lg text-white" disabled={!!form.patientId} />
          <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="" className="text-black">Any available doctor</option>
            {doctors.map((d) => <option key={d.id} value={d.id} className="text-black">Dr. {d.fullName}</option>)}
          </select>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="gradient-primary">{saving ? 'Checking in...' : 'Check In'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowCheckIn(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Now Serving</h2>
          </div>
          {nowServing.length === 0 ? (
            <p className="text-gray-400 p-6 text-sm">No one currently being served</p>
          ) : (
            <div className="divide-y divide-white/10">
              {nowServing.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">#{t.tokenNumber} — {t.Patient?.fullName || t.walkInName}</p>
                    <p className="text-xs text-gray-400">{t.User?.fullName ? `Dr. ${t.User.fullName}` : 'Any doctor'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[t.status]}>{t.status.replace('_', ' ')}</Badge>
                    <Button size="sm" onClick={() => updateStatus(t.id, 'DONE')} className="gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Done</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Waiting</h2>
          </div>
          {loading ? (
            <p className="text-gray-400 p-6 text-sm">Loading…</p>
          ) : waiting.length === 0 ? (
            <p className="text-gray-400 p-6 text-sm">No one waiting</p>
          ) : (
            <div className="divide-y divide-white/10">
              {waiting.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">#{t.tokenNumber} — {t.Patient?.fullName || t.walkInName}</p>
                    <p className="text-xs text-gray-400">{t.User?.fullName ? `Dr. ${t.User.fullName}` : 'Any doctor'} • Checked in {new Date(t.checkedInAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, 'CALLED')} className="gap-1"><PhoneCall className="w-3.5 h-3.5" />Call</Button>
                    <button onClick={() => updateStatus(t.id, 'SKIPPED')} className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showQuickAdd && (
        <QuickAddPatientModal
          onClose={() => setShowQuickAdd(false)}
          onCreated={(newPatient) => {
            setPatients((prev) => [...prev, newPatient as any]);
            setForm((f) => ({ ...f, patientId: newPatient.id, walkInName: '' }));
            setShowQuickAdd(false);
          }}
        />
      )}
    </div>
  );
}

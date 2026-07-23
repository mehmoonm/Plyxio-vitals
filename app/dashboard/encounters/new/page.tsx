'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { DbPatient, DbDrug } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { canDoEncounters } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';

interface RxItem {
  drugId: string;
  dose: string;
  frequency: string;
  route: string;
  durationDays: number;
  quantity: number;
  instructions: string;
}

export default function NewEncounterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const appointmentId = params.get('appointmentId');
  const patientId = params.get('patientId');
  const doctorId = params.get('doctorId') || user?.id;

  const [patient, setPatient] = useState<DbPatient | null>(null);
  const [drugs, setDrugs] = useState<DbDrug[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [notes, setNotes] = useState({
    chiefComplaint: '', historyOfPresentIllness: '', examinationFindings: '',
    diagnosis: '', plan: '',
  });

  const [vitals, setVitals] = useState({
    temperatureC: '', pulseBpm: '', respRateBpm: '', bloodPressureSys: '', bloodPressureDia: '',
    spo2Percent: '', heightCm: '', weightKg: '', painScore: '',
  });

  const [rxItems, setRxItems] = useState<RxItem[]>([]);
  const [existingEncounterId, setExistingEncounterId] = useState<string | null>(null);
  const [existingVitalsId, setExistingVitalsId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (patientId) {
        const { data } = await supabase.from('Patient').select('*').eq('id', patientId).single();
        setPatient(data as any);
      }
      const { data: drugData } = await supabase.from('Drug').select('*').order('name');
      setDrugs((drugData as DbDrug[]) || []);

      // If a nurse already started this visit (e.g. recorded vitals at
      // check-in), reuse that same Encounter instead of creating a
      // duplicate one when the doctor opens this form.
      if (appointmentId) {
        const { data: existing } = await supabase
          .from('Encounter')
          .select('*, Vitals(*)')
          .eq('appointmentId', appointmentId)
          .maybeSingle();
        if (existing) {
          setExistingEncounterId(existing.id);
          setNotes({
            chiefComplaint: existing.chiefComplaint || '',
            historyOfPresentIllness: existing.historyOfPresentIllness || '',
            examinationFindings: existing.examinationFindings || '',
            diagnosis: existing.diagnosis || '',
            plan: existing.plan || '',
          });
          const v = existing.Vitals?.[0];
          if (v) {
            setExistingVitalsId(v.id);
            setVitals({
              temperatureC: v.temperatureC?.toString() || '',
              pulseBpm: v.pulseBpm?.toString() || '',
              respRateBpm: v.respRateBpm?.toString() || '',
              bloodPressureSys: v.bloodPressureSys?.toString() || '',
              bloodPressureDia: v.bloodPressureDia?.toString() || '',
              spo2Percent: v.spo2Percent?.toString() || '',
              heightCm: v.heightCm?.toString() || '',
              weightKg: v.weightKg?.toString() || '',
              painScore: v.painScore?.toString() || '',
            });
          }
        }
      }
    })();
  }, [patientId, appointmentId]);

  const addRxItem = () => setRxItems([...rxItems, { drugId: '', dose: '', frequency: '', route: 'Oral', durationDays: 5, quantity: 10, instructions: '' }]);
  const updateRxItem = (i: number, field: keyof RxItem, value: string | number) => {
    const next = [...rxItems];
    (next[i] as any)[field] = value;
    setRxItems(next);
  };
  const removeRxItem = (i: number) => setRxItems(rxItems.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!patientId || !doctorId) {
      setError('Missing patient or doctor context.');
      return;
    }

    setLoading(true);

    let encounter: any;
    if (existingEncounterId) {
      const { data, error: encError } = await supabase
        .from('Encounter')
        .update({ ...notes, signedAt: new Date().toISOString() })
        .eq('id', existingEncounterId)
        .select()
        .single();
      if (encError || !data) {
        setError(encError?.message || 'Failed to update encounter');
        setLoading(false);
        return;
      }
      encounter = data;
    } else {
      const { data, error: encError } = await supabase
        .from('Encounter')
        .insert({
          hospitalId: user?.hospitalId,
          patientId,
          doctorId,
          appointmentId: appointmentId || null,
          encounterType: 'OPD',
          ...notes,
          signedAt: new Date().toISOString(),
        })
        .select()
        .single();
      if (encError || !data) {
        setError(encError?.message || 'Failed to create encounter');
        setLoading(false);
        return;
      }
      encounter = data;
    }

    const hasVitals = Object.values(vitals).some((v) => v !== '');
    if (hasVitals) {
      const heightM = vitals.heightCm ? Number(vitals.heightCm) / 100 : null;
      const bmi = heightM && vitals.weightKg ? Number(vitals.weightKg) / (heightM * heightM) : null;
      const vitalsPayload = {
        temperatureC: vitals.temperatureC ? Number(vitals.temperatureC) : null,
        pulseBpm: vitals.pulseBpm ? Number(vitals.pulseBpm) : null,
        respRateBpm: vitals.respRateBpm ? Number(vitals.respRateBpm) : null,
        bloodPressureSys: vitals.bloodPressureSys ? Number(vitals.bloodPressureSys) : null,
        bloodPressureDia: vitals.bloodPressureDia ? Number(vitals.bloodPressureDia) : null,
        spo2Percent: vitals.spo2Percent ? Number(vitals.spo2Percent) : null,
        heightCm: vitals.heightCm ? Number(vitals.heightCm) : null,
        weightKg: vitals.weightKg ? Number(vitals.weightKg) : null,
        bmi,
        painScore: vitals.painScore ? Number(vitals.painScore) : null,
        recordedById: user?.id,
      };
      if (existingVitalsId) {
        await supabase.from('Vitals').update(vitalsPayload).eq('id', existingVitalsId);
      } else {
        await supabase.from('Vitals').insert({ encounterId: encounter.id, ...vitalsPayload });
      }
    }

    if (rxItems.length > 0 && rxItems.every((it) => it.drugId)) {
      const { data: existingRx } = await supabase.from('Prescription').select('id').eq('encounterId', encounter.id).maybeSingle();
      if (!existingRx) {
        const { data: prescription, error: rxError } = await supabase
          .from('Prescription')
          .insert({ encounterId: encounter.id })
          .select()
          .single();

        if (!rxError && prescription) {
          await supabase.from('PrescriptionItem').insert(
            rxItems.map((it) => ({
              prescriptionId: prescription.id,
              drugId: it.drugId,
              dose: it.dose || null,
              frequency: it.frequency || null,
              route: it.route || null,
              durationDays: it.durationDays || null,
              quantity: it.quantity || null,
              instructions: it.instructions || null,
            }))
          );
        }
      }
    }

    if (appointmentId) {
      await supabase.from('Appointment').update({ status: 'COMPLETED' }).eq('id', appointmentId);
    }

    setLoading(false);
    router.push(`/dashboard/encounters/${encounter.id}`);
  };

  return (
    <RoleGuard allowed={canDoEncounters(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Encounter</h1>
          {patient && <p className="text-gray-500 mt-2">{patient.fullName} ({patient.mrn})</p>}
        </div>
        <Link href={appointmentId ? `/dashboard/appointments/${appointmentId}` : '/dashboard/appointments'}>
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Vitals</h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <Input placeholder="Temp (°C)" type="number" step="0.1" value={vitals.temperatureC} onChange={(e) => setVitals({ ...vitals, temperatureC: e.target.value })} />
            <Input placeholder="Pulse (bpm)" type="number" value={vitals.pulseBpm} onChange={(e) => setVitals({ ...vitals, pulseBpm: e.target.value })} />
            <Input placeholder="Resp Rate" type="number" value={vitals.respRateBpm} onChange={(e) => setVitals({ ...vitals, respRateBpm: e.target.value })} />
            <Input placeholder="BP Sys" type="number" value={vitals.bloodPressureSys} onChange={(e) => setVitals({ ...vitals, bloodPressureSys: e.target.value })} />
            <Input placeholder="BP Dia" type="number" value={vitals.bloodPressureDia} onChange={(e) => setVitals({ ...vitals, bloodPressureDia: e.target.value })} />
            <Input placeholder="SpO2 (%)" type="number" value={vitals.spo2Percent} onChange={(e) => setVitals({ ...vitals, spo2Percent: e.target.value })} />
            <Input placeholder="Height (cm)" type="number" value={vitals.heightCm} onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })} />
            <Input placeholder="Weight (kg)" type="number" value={vitals.weightKg} onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })} />
            <Input placeholder="Pain Score (0-10)" type="number" min={0} max={10} value={vitals.painScore} onChange={(e) => setVitals({ ...vitals, painScore: e.target.value })} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Clinical Notes</h2>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Chief Complaint</label>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 resize-none" value={notes.chiefComplaint} onChange={(e) => setNotes({ ...notes, chiefComplaint: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">History of Present Illness</label>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 resize-none" value={notes.historyOfPresentIllness} onChange={(e) => setNotes({ ...notes, historyOfPresentIllness: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Examination Findings</label>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 resize-none" value={notes.examinationFindings} onChange={(e) => setNotes({ ...notes, examinationFindings: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Diagnosis</label>
            <Input value={notes.diagnosis} onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Plan</label>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 resize-none" value={notes.plan} onChange={(e) => setNotes({ ...notes, plan: e.target.value })} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Prescription</h2>
            <Button type="button" variant="outline" size="sm" onClick={addRxItem} className="gap-1"><Plus className="w-3 h-3" />Add Drug</Button>
          </div>
          {rxItems.length === 0 && <p className="text-sm text-gray-400">No medications added</p>}
          <div className="overflow-x-auto space-y-2 pb-1">
            {rxItems.map((it, i) => (
              <div key={i} className="min-w-[700px] grid grid-cols-12 gap-2 items-center">
                <select className="col-span-3 px-2 py-2 rounded-lg border border-gray-300 text-sm" value={it.drugId} onChange={(e) => updateRxItem(i, 'drugId', e.target.value)}>
                  <option value="">Select drug</option>
                  {drugs.map((d) => <option key={d.id} value={d.id}>{d.name} {d.strength}</option>)}
                </select>
                <Input className="col-span-2" placeholder="Dose" value={it.dose} onChange={(e) => updateRxItem(i, 'dose', e.target.value)} />
                <Input className="col-span-2" placeholder="Frequency" value={it.frequency} onChange={(e) => updateRxItem(i, 'frequency', e.target.value)} />
                <Input className="col-span-2" placeholder="Route" value={it.route} onChange={(e) => updateRxItem(i, 'route', e.target.value)} />
                <Input className="col-span-1" type="number" placeholder="Days" value={it.durationDays} onChange={(e) => updateRxItem(i, 'durationDays', Number(e.target.value))} />
                <Input className="col-span-1" type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateRxItem(i, 'quantity', Number(e.target.value))} />
                <button type="button" onClick={() => removeRxItem(i)} className="col-span-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Saving encounter...' : 'Sign & Complete Encounter'}
        </Button>
      </form>
    </div>
    </RoleGuard>
  );
}

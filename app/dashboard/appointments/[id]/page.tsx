'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { sendEmail, appointmentReminderEmail } from '@/lib/send-email';
import type { DbAppointment } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { canCheckIn, canDoEncounters, canManageAppointments, canRecordVitals } from '@/lib/permissions';
import { ArrowLeft, Edit, Calendar, UserCheck, Stethoscope, XCircle, Mail, Activity } from 'lucide-react';

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [apt, setApt] = useState<DbAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [vitalsRecorded, setVitalsRecorded] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    temperatureC: '', pulseBpm: '', respRateBpm: '', bloodPressureSys: '', bloodPressureDia: '',
    spo2Percent: '', heightCm: '', weightKg: '', painScore: '',
  });
  const [vitalsSaving, setVitalsSaving] = useState(false);
  const [vitalsError, setVitalsError] = useState('');

  const checkVitalsStatus = async () => {
    const { data } = await supabase.from('Encounter').select('id, Vitals(id)').eq('appointmentId', params.id).maybeSingle();
    setVitalsRecorded(!!data?.Vitals?.length);
  };

  const load = async () => {
    const { data } = await supabase
      .from('Appointment')
      .select('*, Patient(*), User(*)')
      .eq('id', params.id)
      .single();
    setApt(data as any);
    setLoading(false);
    await checkVitalsStatus();
  };

  useEffect(() => { load(); }, [params.id]);

  const updateStatus = async (status: string, extra: Record<string, any> = {}) => {
    setBusy(true);
    await supabase.from('Appointment').update({ status, ...extra }).eq('id', params.id);
    await load();
    setBusy(false);
  };

  const handleCheckIn = () => updateStatus('CHECKED_IN', { checkedInAt: new Date().toISOString() });
  const handleCancel = () => updateStatus('CANCELLED');

  const startEncounter = () => {
    router.push(`/dashboard/encounters/new?appointmentId=${params.id}&patientId=${apt?.patientId}&doctorId=${apt?.doctorId}`);
  };

  const saveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apt) return;
    setVitalsSaving(true);
    setVitalsError('');

    // Find (or create) the Encounter tied to this appointment so the
    // doctor's later "Start Encounter" step picks up these same vitals
    // instead of the nurse's reading being lost or duplicated.
    let encounterId: string;
    const { data: existing } = await supabase.from('Encounter').select('id').eq('appointmentId', params.id).maybeSingle();

    if (existing) {
      encounterId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from('Encounter')
        .insert({
          hospitalId: user?.hospitalId,
          patientId: apt.patientId,
          doctorId: apt.doctorId,
          appointmentId: params.id,
          encounterType: 'OPD',
        })
        .select('id')
        .single();
      if (createError || !created) { setVitalsError(createError?.message || 'Failed to start visit record'); setVitalsSaving(false); return; }
      encounterId = created.id;
    }

    const heightM = vitalsForm.heightCm ? Number(vitalsForm.heightCm) / 100 : null;
    const bmi = heightM && vitalsForm.weightKg ? Number(vitalsForm.weightKg) / (heightM * heightM) : null;
    const { error: vitalsInsertError } = await supabase.from('Vitals').insert({
      encounterId,
      temperatureC: vitalsForm.temperatureC ? Number(vitalsForm.temperatureC) : null,
      pulseBpm: vitalsForm.pulseBpm ? Number(vitalsForm.pulseBpm) : null,
      respRateBpm: vitalsForm.respRateBpm ? Number(vitalsForm.respRateBpm) : null,
      bloodPressureSys: vitalsForm.bloodPressureSys ? Number(vitalsForm.bloodPressureSys) : null,
      bloodPressureDia: vitalsForm.bloodPressureDia ? Number(vitalsForm.bloodPressureDia) : null,
      spo2Percent: vitalsForm.spo2Percent ? Number(vitalsForm.spo2Percent) : null,
      heightCm: vitalsForm.heightCm ? Number(vitalsForm.heightCm) : null,
      weightKg: vitalsForm.weightKg ? Number(vitalsForm.weightKg) : null,
      bmi,
      painScore: vitalsForm.painScore ? Number(vitalsForm.painScore) : null,
      recordedById: user?.id,
    });

    setVitalsSaving(false);
    if (vitalsInsertError) { setVitalsError(vitalsInsertError.message); return; }
    setShowVitalsForm(false);
    await checkVitalsStatus();
  };

  const sendReminderEmail = async () => {
    if (!apt?.Patient?.email) return;
    setBusy(true);
    setEmailStatus('');
    const { subject, html } = appointmentReminderEmail({
      hospitalName: settings.hospitalName,
      patientName: apt.Patient.fullName,
      doctorName: apt.User?.fullName || 'your doctor',
      scheduledAt: apt.scheduledAt,
      reason: apt.reason,
    });
    const result = await sendEmail({ to: apt.Patient.email, subject, html });
    setEmailStatus(result.success ? 'Reminder email sent.' : `Failed to send: ${result.error}`);
    setBusy(false);
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!apt) return <div className="text-gray-500">Appointment not found</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN': return 'bg-yellow-100 text-yellow-800';
      case 'IN_CONSULTATION': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/appointments">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
        </Link>
        {canManageAppointments(user?.role) && apt.status === 'SCHEDULED' && (
          <Link href={`/dashboard/appointments/${apt.id}/edit`}>
            <Button className="gap-2"><Edit className="w-4 h-4" />Edit</Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{apt.Patient?.fullName || 'Unknown Patient'}</h1>
            <p className="text-gray-500 mt-1">with {apt.User?.fullName || 'Unassigned doctor'}</p>
          </div>
          <Badge className={getStatusColor(apt.status)}>{apt.status.replace('_', ' ')}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-5 h-5 text-gray-400" />
            {new Date(apt.scheduledAt).toLocaleString()}
          </div>
          {apt.tokenNumber && <div className="text-gray-700">Token #{apt.tokenNumber}</div>}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-500 mb-1">Reason for Visit</p>
          <p className="text-gray-900">{apt.reason || 'Not specified'}</p>
        </div>

        <div className="pt-6 border-t flex flex-wrap gap-3">
          {canCheckIn(user?.role) && apt.status === 'SCHEDULED' && (
            <Button onClick={handleCheckIn} disabled={busy} className="gap-2">
              <UserCheck className="w-4 h-4" />Check In Patient
            </Button>
          )}
          {canRecordVitals(user?.role) && ['CHECKED_IN', 'IN_CONSULTATION'].includes(apt.status) && !showVitalsForm && (
            <Button onClick={() => setShowVitalsForm(true)} variant="outline" className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
              <Activity className="w-4 h-4" />{vitalsRecorded ? 'Update Vitals' : 'Record Vitals'}
            </Button>
          )}
          {canDoEncounters(user?.role) && (apt.status === 'CHECKED_IN' || apt.status === 'IN_CONSULTATION') && (
            <Button onClick={startEncounter} className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Stethoscope className="w-4 h-4" />Start Encounter
            </Button>
          )}
          {canManageAppointments(user?.role) && !['COMPLETED', 'CANCELLED'].includes(apt.status) && (
            <Button onClick={handleCancel} disabled={busy} variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
              <XCircle className="w-4 h-4" />Cancel Appointment
            </Button>
          )}
          {canManageAppointments(user?.role) && !['COMPLETED', 'CANCELLED'].includes(apt.status) && apt.Patient?.email && (
            <Button onClick={sendReminderEmail} disabled={busy} variant="outline" className="gap-2 text-indigo-600 border-indigo-300 hover:bg-indigo-50">
              <Mail className="w-4 h-4" />Send Reminder Email
            </Button>
          )}
        </div>
        {vitalsRecorded && !showVitalsForm && (
          <p className="text-sm text-emerald-600 flex items-center gap-1"><Activity className="w-4 h-4" />Vitals recorded for this visit</p>
        )}
        {emailStatus && <p className="text-sm text-gray-500">{emailStatus}</p>}

        {showVitalsForm && (
          <form onSubmit={saveVitals} className="pt-4 border-t space-y-3">
            <h3 className="font-semibold text-gray-900">Record Vitals</h3>
            {vitalsError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{vitalsError}</div>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input placeholder="Temp (°C)" type="number" step="0.1" value={vitalsForm.temperatureC} onChange={(e) => setVitalsForm({ ...vitalsForm, temperatureC: e.target.value })} />
              <Input placeholder="Pulse (bpm)" type="number" value={vitalsForm.pulseBpm} onChange={(e) => setVitalsForm({ ...vitalsForm, pulseBpm: e.target.value })} />
              <Input placeholder="Resp Rate" type="number" value={vitalsForm.respRateBpm} onChange={(e) => setVitalsForm({ ...vitalsForm, respRateBpm: e.target.value })} />
              <Input placeholder="BP Sys" type="number" value={vitalsForm.bloodPressureSys} onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureSys: e.target.value })} />
              <Input placeholder="BP Dia" type="number" value={vitalsForm.bloodPressureDia} onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureDia: e.target.value })} />
              <Input placeholder="SpO2 (%)" type="number" value={vitalsForm.spo2Percent} onChange={(e) => setVitalsForm({ ...vitalsForm, spo2Percent: e.target.value })} />
              <Input placeholder="Height (cm)" type="number" value={vitalsForm.heightCm} onChange={(e) => setVitalsForm({ ...vitalsForm, heightCm: e.target.value })} />
              <Input placeholder="Weight (kg)" type="number" value={vitalsForm.weightKg} onChange={(e) => setVitalsForm({ ...vitalsForm, weightKg: e.target.value })} />
              <Input placeholder="Pain (0-10)" type="number" min={0} max={10} value={vitalsForm.painScore} onChange={(e) => setVitalsForm({ ...vitalsForm, painScore: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={vitalsSaving} className="gap-2"><Activity className="w-4 h-4" />{vitalsSaving ? 'Saving...' : 'Save Vitals'}</Button>
              <Button type="button" variant="outline" onClick={() => setShowVitalsForm(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

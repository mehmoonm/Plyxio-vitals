'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EncounterDetailPage() {
  const params = useParams<{ id: string }>();
  const [encounter, setEncounter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('Encounter')
        .select('*, Patient(fullName, mrn), User(fullName), Vitals(*), Prescription(*, PrescriptionItem(*, Drug(name, strength)))')
        .eq('id', params.id)
        .single();
      setEncounter(data);
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!encounter) return <div className="text-gray-500">Encounter not found</div>;

  const vitals = encounter.Vitals?.[0];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/appointments">
        <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
      </Link>

      <div className="bg-white rounded-2xl border p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{encounter.Patient?.fullName}</h1>
          <p className="text-gray-500">MRN: {encounter.Patient?.mrn} • Seen by {encounter.User?.fullName} • {new Date(encounter.createdAt).toLocaleString()}</p>
        </div>

        {vitals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4 text-sm">
            {vitals.temperatureC && <div><p className="text-gray-500">Temp</p><p className="font-semibold">{vitals.temperatureC}°C</p></div>}
            {vitals.pulseBpm && <div><p className="text-gray-500">Pulse</p><p className="font-semibold">{vitals.pulseBpm} bpm</p></div>}
            {(vitals.bloodPressureSys || vitals.bloodPressureDia) && <div><p className="text-gray-500">BP</p><p className="font-semibold">{vitals.bloodPressureSys}/{vitals.bloodPressureDia}</p></div>}
            {vitals.spo2Percent && <div><p className="text-gray-500">SpO2</p><p className="font-semibold">{vitals.spo2Percent}%</p></div>}
            {vitals.bmi && <div><p className="text-gray-500">BMI</p><p className="font-semibold">{vitals.bmi.toFixed(1)}</p></div>}
            {vitals.painScore != null && <div><p className="text-gray-500">Pain</p><p className="font-semibold">{vitals.painScore}/10</p></div>}
          </div>
        )}

        <div className="space-y-3 pt-4 border-t">
          {encounter.chiefComplaint && <div><p className="text-sm font-semibold text-gray-700">Chief Complaint</p><p className="text-gray-600">{encounter.chiefComplaint}</p></div>}
          {encounter.historyOfPresentIllness && <div><p className="text-sm font-semibold text-gray-700">History</p><p className="text-gray-600">{encounter.historyOfPresentIllness}</p></div>}
          {encounter.examinationFindings && <div><p className="text-sm font-semibold text-gray-700">Examination</p><p className="text-gray-600">{encounter.examinationFindings}</p></div>}
          {encounter.diagnosis && <div><p className="text-sm font-semibold text-gray-700">Diagnosis</p><p className="text-gray-600">{encounter.diagnosis}</p></div>}
          {encounter.plan && <div><p className="text-sm font-semibold text-gray-700">Plan</p><p className="text-gray-600">{encounter.plan}</p></div>}
        </div>

        {encounter.Prescription?.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-2">Prescription</p>
            <div className="space-y-2">
              {encounter.Prescription.flatMap((rx: any) => rx.PrescriptionItem || []).map((item: any) => (
                <div key={item.id} className="bg-gray-50 rounded-lg px-4 py-2 text-sm flex justify-between">
                  <span className="font-medium">{item.Drug?.name} {item.Drug?.strength}</span>
                  <span className="text-gray-600">{item.dose} • {item.frequency} • {item.durationDays} days</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

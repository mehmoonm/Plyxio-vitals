'use client';

import { useEffect, useState } from 'react';
import { usePatientAuth } from '@/lib/patient-auth-context';
import { useSettings } from '@/lib/settings-context';
import { supabase } from '@/lib/supabase/client';
import { generatePrescriptionPdf } from '@/lib/pdf/prescription-pdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function PortalPrescriptionsPage() {
  const { patient } = usePatientAuth();
  const { settings } = useSettings();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient) return;
    (async () => {
      const { data } = await supabase
        .from('Encounter')
        .select('id, createdAt, diagnosis, chiefComplaint, plan, User(fullName, specialty), Prescription(id, PrescriptionItem(*, Drug(name, strength, form)))')
        .eq('patientId', patient.id)
        .order('createdAt', { ascending: false });
      setPrescriptions((data || []).filter((e: any) => e.Prescription?.length > 0));
      setLoading(false);
    })();
  }, [patient]);

  const downloadPdf = (enc: any) => {
    const items = enc.Prescription.flatMap((rx: any) => rx.PrescriptionItem || []).map((item: any) => ({
      drugName: item.Drug?.name || 'Unknown',
      strength: item.Drug?.strength,
      dose: item.dose,
      frequency: item.frequency,
      durationDays: item.durationDays,
      quantity: item.quantity,
      instructions: item.instructions,
    }));

    generatePrescriptionPdf({
      hospitalName: settings.hospitalName,
      patientName: patient?.fullName || 'Unknown',
      patientMrn: patient?.mrn || '',
      doctorName: enc.User?.fullName || 'Unknown',
      doctorSpecialty: enc.User?.specialty,
      date: enc.createdAt,
      diagnosis: enc.diagnosis,
      chiefComplaint: enc.chiefComplaint,
      plan: enc.plan,
      items,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Prescriptions</h1>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : prescriptions.length === 0 ? (
        <div className="glass-card rounded-2xl p-6"><p className="text-gray-400">No prescriptions yet</p></div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((enc) => (
            <div key={enc.id} className="glass-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{enc.diagnosis || 'Prescription'}</p>
                  <p className="text-xs text-gray-400">Dr. {enc.User?.fullName} • {new Date(enc.createdAt).toLocaleDateString()}</p>
                </div>
                <Button onClick={() => downloadPdf(enc)} variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />PDF</Button>
              </div>
              <div className="space-y-2">
                {enc.Prescription.flatMap((rx: any) => rx.PrescriptionItem || []).map((item: any) => (
                  <div key={item.id} className="bg-white/5 rounded-lg px-4 py-2 flex justify-between text-sm">
                    <span className="text-white font-medium">{item.Drug?.name} {item.Drug?.strength}</span>
                    <span className="text-gray-400">{item.dose} • {item.frequency} • {item.durationDays} days</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

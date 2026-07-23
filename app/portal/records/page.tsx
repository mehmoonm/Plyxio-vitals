'use client';

import { useEffect, useState } from 'react';
import { usePatientAuth } from '@/lib/patient-auth-context';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

export default function PortalRecordsPage() {
  const { patient } = usePatientAuth();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient) return;
    (async () => {
      const [encRes, allergyRes] = await Promise.all([
        supabase.from('Encounter').select('*, User(fullName), Vitals(*)').eq('patientId', patient.id).order('createdAt', { ascending: false }),
        supabase.from('Allergy').select('*').eq('patientId', patient.id).order('notedAt', { ascending: false }),
      ]);
      setEncounters(encRes.data || []);
      setAllergies(allergyRes.data || []);
      setLoading(false);
    })();
  }, [patient]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Medical Records</h1>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-orange-400" />
          Allergies
        </h2>
        {allergies.length === 0 ? (
          <p className="text-gray-400 text-sm">No known allergies on file</p>
        ) : (
          <div className="space-y-2">
            {allergies.map((a) => (
              <div key={a.id} className="bg-white/5 rounded-lg px-4 py-2 flex items-center justify-between">
                <div>
                  <span className="text-white text-sm font-medium">{a.substance}</span>
                  {a.reaction && <span className="text-xs text-gray-400 ml-2">— {a.reaction}</span>}
                </div>
                {a.severity && (
                  <Badge className={a.severity === 'SEVERE' ? 'bg-red-100 text-red-800' : a.severity === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                    {a.severity}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : encounters.length === 0 ? (
        <div className="glass-card rounded-2xl p-6"><p className="text-gray-400">No visit records yet</p></div>
      ) : (
        <div className="space-y-4">
          {encounters.map((enc) => {
            const vitals = enc.Vitals?.[0];
            return (
              <div key={enc.id} className="glass-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{enc.diagnosis || enc.chiefComplaint || 'Visit'}</p>
                    <p className="text-xs text-gray-400">Dr. {enc.User?.fullName} • {new Date(enc.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {vitals && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 rounded-lg p-3 text-xs">
                    {vitals.temperatureC && <div><p className="text-gray-400">Temp</p><p className="text-white font-semibold">{vitals.temperatureC}°C</p></div>}
                    {vitals.pulseBpm && <div><p className="text-gray-400">Pulse</p><p className="text-white font-semibold">{vitals.pulseBpm} bpm</p></div>}
                    {(vitals.bloodPressureSys || vitals.bloodPressureDia) && <div><p className="text-gray-400">BP</p><p className="text-white font-semibold">{vitals.bloodPressureSys}/{vitals.bloodPressureDia}</p></div>}
                    {vitals.bmi && <div><p className="text-gray-400">BMI</p><p className="text-white font-semibold">{Number(vitals.bmi).toFixed(1)}</p></div>}
                  </div>
                )}
                {enc.plan && <p className="text-sm text-gray-300">{enc.plan}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

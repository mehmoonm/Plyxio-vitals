'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Pill } from 'lucide-react';

export default function PharmacyQueuePage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'dispensed'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('Prescription')
        .select('*, Encounter(patientId, Patient(fullName, mrn)), PrescriptionItem(*, Drug(name, strength)), Dispense(id, dispensedAt)')
        .order('createdAt', { ascending: false });
      setPrescriptions(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = prescriptions.filter((p) =>
    filter === 'pending' ? (p.Dispense || []).length === 0 : (p.Dispense || []).length > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold heading-gradient">Pharmacy</h1>
        <p className="text-gray-400 mt-2">Dispense prescriptions and track stock movement</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300'}`}>Pending</button>
        <button onClick={() => setFilter('dispensed')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'dispensed' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300'}`}>Dispensed</button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 p-6 flex items-center gap-2"><Pill className="w-4 h-4" />No {filter} prescriptions</p>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => router.push(`/dashboard/pharmacy/${p.id}`)} className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                <div>
                  <p className="text-white font-medium">{p.Encounter?.Patient?.fullName} <span className="text-gray-400 text-xs">({p.Encounter?.Patient?.mrn})</span></p>
                  <p className="text-xs text-gray-400">
                    {(p.PrescriptionItem || []).map((i: any) => i.Drug?.name).join(', ')} • {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={p.Dispense?.length > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {p.Dispense?.length > 0 ? 'Dispensed' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

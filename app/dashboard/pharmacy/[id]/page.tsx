'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canDispense } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save } from 'lucide-react';

export default function DispensePrescriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState<any>(null);
  const [batchOptions, setBatchOptions] = useState<Record<string, any[]>>({});
  const [selections, setSelections] = useState<Record<string, { inventoryItemId: string; quantity: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const { data, error: fetchError } = await supabase
      .from('Prescription')
      .select('*, Encounter(patientId, Patient(fullName, mrn)), PrescriptionItem(*, Drug(name, strength)), Dispense(*, User(fullName), DispenseItem(*, InventoryItem(*, Drug(name, strength))))')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setPrescription(data);

    if (data && (!data.Dispense || data.Dispense.length === 0)) {
      const drugIds = (data.PrescriptionItem || []).map((i: any) => i.drugId);
      const { data: inventory } = await supabase
        .from('InventoryItem')
        .select('*, Drug(name, strength)')
        .in('drugId', drugIds)
        .gt('quantityOnHand', 0);

      const byDrug: Record<string, any[]> = {};
      for (const item of inventory || []) {
        byDrug[item.drugId] = [...(byDrug[item.drugId] || []), item];
      }
      setBatchOptions(byDrug);

      const initialSelections: Record<string, any> = {};
      for (const item of data.PrescriptionItem || []) {
        const firstBatch = byDrug[item.drugId]?.[0];
        initialSelections[item.id] = {
          inventoryItemId: firstBatch?.id || '',
          quantity: item.quantity || 1,
        };
      }
      setSelections(initialSelections);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { data: dispense, error: dispenseError } = await supabase
      .from('Dispense')
      .insert({ prescriptionId: params.id, dispensedById: user?.id, dispensedAt: new Date().toISOString() })
      .select()
      .single();

    if (dispenseError || !dispense) { setError(dispenseError?.message || 'Failed to create dispense record'); setSaving(false); return; }

    for (const item of prescription.PrescriptionItem) {
      const sel = selections[item.id];
      if (!sel?.inventoryItemId || !sel.quantity) continue;

      const { error: itemError } = await supabase.from('DispenseItem').insert({
        dispenseId: dispense.id,
        inventoryItemId: sel.inventoryItemId,
        quantity: sel.quantity,
      });
      if (itemError) { setError(itemError.message); setSaving(false); return; }

      const batch = (batchOptions[item.drugId] || []).find((b) => b.id === sel.inventoryItemId);
      const newQty = (batch?.quantityOnHand || 0) - sel.quantity;
      await supabase.from('InventoryItem').update({ quantityOnHand: newQty }).eq('id', sel.inventoryItemId);

      await supabase.from('StockTransaction').insert({
        inventoryItemId: sel.inventoryItemId,
        type: 'DISPENSE',
        quantity: sel.quantity,
        reference: `Prescription ${params.id}`,
        performedById: user?.id,
      });
    }

    setSaving(false);
    await load();
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!prescription) return <p className="text-gray-400">{error || 'Prescription not found'}</p>;

  const alreadyDispensed = prescription.Dispense?.length > 0;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/pharmacy">
        <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Pharmacy</Button>
      </Link>

      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{prescription.Encounter?.Patient?.fullName}</h1>
            <p className="text-gray-400 mt-1">MRN: {prescription.Encounter?.Patient?.mrn}</p>
          </div>
          <Badge className={alreadyDispensed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
            {alreadyDispensed ? 'Dispensed' : 'Pending'}
          </Badge>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        {!alreadyDispensed && canDispense(user?.role) && (
          <form onSubmit={handleDispense} className="space-y-4">
            <h3 className="font-semibold text-white">Select Stock to Dispense</h3>
            {prescription.PrescriptionItem.map((item: any) => {
              const batches = batchOptions[item.drugId] || [];
              return (
                <div key={item.id} className="bg-white/5 rounded-lg p-4 space-y-2">
                  <p className="text-white font-medium text-sm">{item.Drug?.name} {item.Drug?.strength}</p>
                  <p className="text-xs text-gray-400">Prescribed: {item.dose} • {item.frequency} • {item.durationDays} days • Qty {item.quantity}</p>
                  {batches.length === 0 ? (
                    <p className="text-xs text-red-300">No stock available for this drug.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={selections[item.id]?.inventoryItemId || ''}
                        onChange={(e) => setSelections({ ...selections, [item.id]: { ...selections[item.id], inventoryItemId: e.target.value } })}
                        className="glass-input px-3 py-2 rounded-lg text-white text-sm"
                      >
                        {batches.map((b) => <option key={b.id} value={b.id} className="text-black">Batch {b.batchNo || b.id.slice(0, 6)} ({b.quantityOnHand} in stock)</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={selections[item.id]?.quantity || 1}
                        onChange={(e) => setSelections({ ...selections, [item.id]: { ...selections[item.id], quantity: Number(e.target.value) } })}
                        className="glass-input px-3 py-2 rounded-lg text-white text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <Button type="submit" disabled={saving} className="gap-2 gradient-primary"><Save className="w-4 h-4" />{saving ? 'Dispensing...' : 'Confirm Dispense'}</Button>
          </form>
        )}

        {alreadyDispensed && (
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Dispensed Items</h3>
            {prescription.Dispense.map((d: any) => (
              <div key={d.id} className="space-y-2">
                <p className="text-xs text-gray-400">By {d.User?.fullName} • {new Date(d.dispensedAt).toLocaleString()}</p>
                {(d.DispenseItem || []).map((di: any) => (
                  <div key={di.id} className="bg-white/5 rounded-lg px-4 py-3 flex justify-between text-sm">
                    <span className="text-white">{di.InventoryItem?.Drug?.name} {di.InventoryItem?.Drug?.strength}</span>
                    <span className="text-gray-400">Qty {di.quantity}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

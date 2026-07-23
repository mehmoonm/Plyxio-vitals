'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { DbDrug } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { canManageInventory } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';

export default function NewInventoryItemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [drugs, setDrugs] = useState<DbDrug[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [drugId, setDrugId] = useState('');
  const [newDrug, setNewDrug] = useState({ name: '', genericName: '', form: '', strength: '' });
  const [item, setItem] = useState({ batchNo: '', expiryDate: '', quantityOnHand: 0, reorderLevel: 10, unitCost: 0, unitPrice: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('Drug').select('*').order('name');
      setDrugs((data as DbDrug[]) || []);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let finalDrugId = drugId;

    if (mode === 'new') {
      if (!newDrug.name) { setError('Drug name is required.'); setLoading(false); return; }
      const { data: createdDrug, error: drugError } = await supabase
        .from('Drug')
        .insert({ hospitalId: user?.hospitalId, ...newDrug })
        .select()
        .single();
      if (drugError || !createdDrug) { setError(drugError?.message || 'Failed to create drug'); setLoading(false); return; }
      finalDrugId = createdDrug.id;
    }

    if (!finalDrugId) { setError('Select or create a drug.'); setLoading(false); return; }

    const { error: insertError } = await supabase.from('InventoryItem').insert({
      hospitalId: user?.hospitalId,
      drugId: finalDrugId,
      batchNo: item.batchNo || null,
      expiryDate: item.expiryDate || null,
      quantityOnHand: item.quantityOnHand,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    router.push('/dashboard/inventory');
  };

  return (
    <RoleGuard allowed={canManageInventory(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Inventory Item</h1>
          <p className="text-gray-500 mt-2">Add stock for an existing or new drug</p>
        </div>
        <Link href="/dashboard/inventory">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-2xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('existing')} className={`px-4 py-2 rounded-lg text-sm ${mode === 'existing' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Existing Drug</button>
          <button type="button" onClick={() => setMode('new')} className={`px-4 py-2 rounded-lg text-sm ${mode === 'new' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>New Drug</button>
        </div>

        {mode === 'existing' ? (
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Drug *</label>
            <select value={drugId} onChange={(e) => setDrugId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300">
              <option value="">Select a drug</option>
              {drugs.map((d) => <option key={d.id} value={d.id}>{d.name} {d.strength ? `(${d.strength})` : ''}</option>)}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input placeholder="Drug name *" value={newDrug.name} onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })} />
            <Input placeholder="Generic name" value={newDrug.genericName} onChange={(e) => setNewDrug({ ...newDrug, genericName: e.target.value })} />
            <Input placeholder="Form (tablet, syrup...)" value={newDrug.form} onChange={(e) => setNewDrug({ ...newDrug, form: e.target.value })} />
            <Input placeholder="Strength (500mg...)" value={newDrug.strength} onChange={(e) => setNewDrug({ ...newDrug, strength: e.target.value })} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Batch Number</label>
            <Input value={item.batchNo} onChange={(e) => setItem({ ...item, batchNo: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Expiry Date</label>
            <Input type="date" value={item.expiryDate} onChange={(e) => setItem({ ...item, expiryDate: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Quantity on Hand</label>
            <Input type="number" min={0} value={item.quantityOnHand} onChange={(e) => setItem({ ...item, quantityOnHand: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Reorder Level</label>
            <Input type="number" min={0} value={item.reorderLevel} onChange={(e) => setItem({ ...item, reorderLevel: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Unit Cost (Rs)</label>
            <Input type="number" min={0} value={item.unitCost} onChange={(e) => setItem({ ...item, unitCost: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Unit Price (Rs)</label>
            <Input type="number" min={0} value={item.unitPrice} onChange={(e) => setItem({ ...item, unitPrice: Number(e.target.value) })} />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Adding...' : 'Add to Inventory'}
        </Button>
      </form>
    </div>
    </RoleGuard>
  );
}

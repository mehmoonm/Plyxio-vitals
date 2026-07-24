'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageInventory } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { RoleGuard } from '@/components/dashboard/role-guard';

export default function EditInventoryItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [drug, setDrug] = useState<any>(null);
  const [item, setItem] = useState({ batchNo: '', expiryDate: '', quantityOnHand: 0, reorderLevel: 10, unitCost: 0, unitPrice: 0 });
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('InventoryItem').select('*, Drug(name, genericName, form, strength)').eq('id', params.id).single();
      if (data) {
        setDrug(data.Drug);
        setItem({
          batchNo: data.batchNo || '',
          expiryDate: data.expiryDate ? data.expiryDate.slice(0, 10) : '',
          quantityOnHand: data.quantityOnHand,
          reorderLevel: data.reorderLevel,
          unitCost: Number(data.unitCost || 0),
          unitPrice: Number(data.unitPrice || 0),
        });
      }
      setFetching(false);
    })();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.from('InventoryItem').update({
      batchNo: item.batchNo || null,
      expiryDate: item.expiryDate || null,
      quantityOnHand: item.quantityOnHand,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
    }).eq('id', params.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.push('/dashboard/inventory');
  };

  const handleDelete = async () => {
    if (!confirm('Remove this batch from inventory? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('InventoryItem').delete().eq('id', params.id);
    if (deleteError) { setError(deleteError.message); return; }
    router.push('/dashboard/inventory');
  };

  if (fetching) return <div className="text-gray-500">Loading…</div>;
  if (!drug) return <div className="text-gray-500">Inventory item not found</div>;

  return (
    <RoleGuard allowed={canManageInventory(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Inventory Item</h1>
          <p className="text-gray-500 mt-2">{drug.name} {drug.strength ? `(${drug.strength})` : ''}</p>
        </div>
        <Link href="/dashboard/inventory">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-2xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
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
            <label className="text-sm font-semibold text-gray-700 block mb-2">Unit Cost</label>
            <Input type="number" min={0} value={item.unitCost} onChange={(e) => setItem({ ...item, unitCost: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Unit Price</label>
            <Input type="number" min={0} value={item.unitPrice} onChange={(e) => setItem({ ...item, unitPrice: Number(e.target.value) })} />
            <p className="text-xs text-gray-500 mt-1">Used when dispensing this drug to a patient's invoice.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={handleDelete} className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />Remove Batch
          </Button>
        </div>
      </form>
    </div>
    </RoleGuard>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { RoleGuard } from '@/components/dashboard/role-guard';

interface LineItem {
  drugId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
}

function canManageVendors(role?: string | null) {
  return role === 'HOSPITAL_ADMIN' || role === 'PHARMACIST';
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);
  const [vendors, setVendors] = useState<any[]>([]);
  const [drugs, setDrugs] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ drugId: '', itemName: '', quantity: 1, unitCost: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [v, d] = await Promise.all([
        supabase.from('Vendor').select('id, name').eq('isActive', true).order('name'),
        supabase.from('Drug').select('id, name, strength').order('name'),
      ]);
      setVendors(v.data || []);
      setDrugs(d.data || []);
    })();
  }, []);

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    const next = [...items];
    (next[i] as any)[field] = value;
    if (field === 'drugId' && value) {
      const drug = drugs.find((d) => d.id === value);
      if (drug) next[i].itemName = `${drug.name}${drug.strength ? ` (${drug.strength})` : ''}`;
    }
    setItems(next);
  };

  const addItem = () => setItems([...items, { drugId: '', itemName: '', quantity: 1, unitCost: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || items.some((it) => !it.itemName)) { setError('Vendor and all item names are required.'); return; }

    setLoading(true);
    setError('');

    const poNumber = `PO-${Date.now().toString().slice(-8)}`;
    const { data: po, error: poError } = await supabase.from('PurchaseOrder').insert({
      hospitalId: user?.hospitalId,
      vendorId,
      poNumber,
      status: 'DRAFT',
      expectedDate: expectedDate || null,
      totalAmount: total,
      notes: notes || null,
      createdById: user?.id,
    }).select().single();

    if (poError || !po) { setLoading(false); setError(poError?.message || 'Failed to create PO'); return; }

    const { error: itemsError } = await supabase.from('PurchaseOrderItem').insert(
      items.map((it) => ({
        poId: po.id,
        drugId: it.drugId || null,
        itemName: it.itemName,
        quantity: it.quantity,
        unitCost: it.unitCost,
        amount: it.quantity * it.unitCost,
      }))
    );

    setLoading(false);
    if (itemsError) { setError(itemsError.message); return; }
    router.push(`/dashboard/purchase-orders/${po.id}`);
  };

  return (
    <RoleGuard allowed={canManageVendors(user?.role)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">New Purchase Order</h1>
          <Link href="/dashboard/purchase-orders">
            <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-5 max-w-3xl">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          {vendors.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm">
              No vendors set up yet. Add one from the Purchase Orders page first.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Vendor *</label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300">
                <option value="">Select a vendor</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Expected Delivery</label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Items</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" />Add Item</Button>
            </div>
            <div className="overflow-x-auto space-y-2 pb-1">
              {items.map((item, i) => (
                <div key={i} className="min-w-[600px] grid grid-cols-12 gap-2 items-center">
                  <select className="col-span-4 px-2 py-2 rounded-lg border border-gray-300 text-sm" value={item.drugId} onChange={(e) => updateItem(i, 'drugId', e.target.value)}>
                    <option value="">Custom item / non-drug</option>
                    {drugs.map((d) => <option key={d.id} value={d.id}>{d.name} {d.strength}</option>)}
                  </select>
                  <Input className="col-span-3" placeholder="Item name" value={item.itemName} onChange={(e) => updateItem(i, 'itemName', e.target.value)} />
                  <Input className="col-span-2" type="number" min={1} placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                  <Input className="col-span-2" type="number" min={0} placeholder={`Unit cost (${currency})`} value={item.unitCost} onChange={(e) => updateItem(i, 'unitCost', Number(e.target.value))} />
                  <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-lg border border-gray-300" />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 flex justify-between font-bold">
            <span>Total</span><span>{currency} {total.toLocaleString()}</span>
          </div>

          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />{loading ? 'Creating...' : 'Create Purchase Order'}
          </Button>
        </form>
      </div>
    </RoleGuard>
  );
}

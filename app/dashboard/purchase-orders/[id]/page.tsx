'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, PackageCheck } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function canManageVendors(role?: string | null) {
  return role === 'HOSPITAL_ADMIN' || role === 'PHARMACIST';
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('PurchaseOrder')
      .select('*, Vendor(name, contactPerson, phone), PurchaseOrderItem(*, Drug(name, strength))')
      .eq('id', params.id)
      .single();
    setPo(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const updateStatus = async (status: string) => {
    await supabase.from('PurchaseOrder').update({ status }).eq('id', po.id);
    await load();
  };

  const receiveItem = async (item: any) => {
    const remaining = item.quantity - item.quantityReceived;
    if (remaining <= 0) return;

    await supabase.from('PurchaseOrderItem').update({ quantityReceived: item.quantity }).eq('id', item.id);

    // If this line item is linked to a Drug, bump the matching inventory
    // batch's stock so the purchase actually shows up as usable stock.
    if (item.drugId) {
      const { data: existingBatch } = await supabase
        .from('InventoryItem')
        .select('id, quantityOnHand')
        .eq('drugId', item.drugId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingBatch) {
        await supabase.from('InventoryItem').update({ quantityOnHand: existingBatch.quantityOnHand + remaining }).eq('id', existingBatch.id);
      } else {
        await supabase.from('InventoryItem').insert({
          hospitalId: user?.hospitalId,
          drugId: item.drugId,
          quantityOnHand: remaining,
          reorderLevel: 10,
          unitCost: item.unitCost,
        });
      }
    }

    // Recompute overall PO status
    const { data: allItems } = await supabase.from('PurchaseOrderItem').select('quantity, quantityReceived').eq('poId', po.id);
    const allReceived = (allItems || []).every((i: any) => i.quantityReceived >= i.quantity);
    const anyReceived = (allItems || []).some((i: any) => i.quantityReceived > 0);
    await supabase.from('PurchaseOrder').update({ status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status }).eq('id', po.id);

    await load();
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!po) return <p className="text-gray-500">Purchase order not found</p>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/purchase-orders">
        <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Purchase Orders</Button>
      </Link>

      <div className="bg-white rounded-2xl border p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
            <p className="text-gray-500 mt-1">{po.Vendor?.name} {po.Vendor?.contactPerson ? `— ${po.Vendor.contactPerson}` : ''}</p>
            <p className="text-gray-400 text-sm">Ordered {new Date(po.orderDate).toLocaleDateString()}{po.expectedDate ? ` • Expected ${new Date(po.expectedDate).toLocaleDateString()}` : ''}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={STATUS_COLORS[po.status]}>{po.status.replace('_', ' ')}</Badge>
            {canManageVendors(user?.role) && po.status === 'DRAFT' && (
              <Button size="sm" onClick={() => updateStatus('SENT')}>Mark Sent to Vendor</Button>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Item</th>
              <th className="py-2">Qty Ordered</th>
              <th className="py-2">Qty Received</th>
              <th className="py-2">Unit Cost</th>
              <th className="py-2 text-right">Amount</th>
              {canManageVendors(user?.role) && <th className="py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {(po.PurchaseOrderItem || []).map((item: any) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.itemName}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{item.quantityReceived}</td>
                <td className="py-2">{currency} {Number(item.unitCost).toLocaleString()}</td>
                <td className="py-2 text-right">{currency} {Number(item.amount).toLocaleString()}</td>
                {canManageVendors(user?.role) && (
                  <td className="py-2 text-right">
                    {item.quantityReceived < item.quantity && po.status !== 'CANCELLED' && (
                      <Button size="sm" variant="outline" onClick={() => receiveItem(item)} className="gap-1"><PackageCheck className="w-3.5 h-3.5" />Receive</Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between font-bold text-lg pt-4 border-t">
          <span>Total</span><span>{currency} {Number(po.totalAmount).toLocaleString()}</span>
        </div>

        {po.notes && (
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold text-gray-700">Notes</p>
            <p className="text-sm text-gray-600 mt-1">{po.notes}</p>
          </div>
        )}

        {canManageVendors(user?.role) && po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={() => updateStatus('CANCELLED')} className="text-red-600 border-red-300">Cancel Order</Button>
          </div>
        )}
      </div>
    </div>
  );
}

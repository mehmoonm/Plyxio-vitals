'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { isAdmin } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Truck, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVendors, setShowVendors] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', contactPerson: '', phone: '', email: '' });

  const load = async () => {
    const [po, v] = await Promise.all([
      supabase.from('PurchaseOrder').select('*, Vendor(name)').order('orderDate', { ascending: false }),
      supabase.from('Vendor').select('*').order('name'),
    ]);
    setOrders(po.data || []);
    setVendors(v.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) return;
    await supabase.from('Vendor').insert({
      hospitalId: user?.hospitalId,
      name: vendorForm.name.trim(),
      contactPerson: vendorForm.contactPerson || null,
      phone: vendorForm.phone || null,
      email: vendorForm.email || null,
    });
    setVendorForm({ name: '', contactPerson: '', phone: '', email: '' });
    await load();
  };

  const deleteVendor = async (id: string) => {
    if (!confirm('Delete this vendor?')) return;
    await supabase.from('Vendor').delete().eq('id', id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-300" />Purchase Orders
          </h1>
          <p className="text-gray-400 mt-2">Vendor and stock ordering</p>
        </div>
        {canManageVendors(user?.role) && (
          <Link href="/dashboard/purchase-orders/new">
            <Button className="gap-2 gradient-primary"><Plus className="w-4 h-4" />New Purchase Order</Button>
          </Link>
        )}
      </div>

      {canManageVendors(user?.role) && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <button onClick={() => setShowVendors((v) => !v)} className="w-full flex items-center justify-between p-4">
            <span className="font-semibold text-white">Vendors ({vendors.length})</span>
            {showVendors ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showVendors && (
            <div className="px-4 pb-4 space-y-3">
              <form onSubmit={addVendor} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input placeholder="Vendor name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                <Input placeholder="Contact person" value={vendorForm.contactPerson} onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                <Input placeholder="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                <Button type="submit" size="sm" className="gradient-primary">Add Vendor</Button>
              </form>
              <div className="divide-y divide-white/10">
                {vendors.map((v) => (
                  <div key={v.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="text-white text-sm font-medium">{v.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{v.contactPerson} {v.phone}</span>
                    </div>
                    <button onClick={() => deleteVendor(v.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-400 p-6">No purchase orders yet</p>
        ) : (
          <div className="divide-y divide-white/10">
            {orders.map((po) => (
              <Link key={po.id} href={`/dashboard/purchase-orders/${po.id}`} className="p-4 flex items-center justify-between hover:bg-white/5 block">
                <div>
                  <p className="text-white font-medium">{po.poNumber} — {po.Vendor?.name}</p>
                  <p className="text-xs text-gray-400">{new Date(po.orderDate).toLocaleDateString()} • {currency} {Number(po.totalAmount).toLocaleString()}</p>
                </div>
                <Badge className={STATUS_COLORS[po.status]}>{po.status.replace('_', ' ')}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

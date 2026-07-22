'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageInventory } from '@/lib/permissions';
import type { DbInventoryItem } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, Plus } from 'lucide-react';

export default function InventoryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventory, setInventory] = useState<DbInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('InventoryItem').select('*, Drug(name, genericName, form, strength)');
      setInventory((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = inventory.filter((item) =>
    (item.Drug?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStock = inventory.filter((item) => item.quantityOnHand < item.reorderLevel);
  const totalValue = inventory.reduce((sum, item) => sum + item.quantityOnHand * Number(item.unitCost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-2">Pharmacy stock and drug inventory</p>
        </div>
        {canManageInventory(user?.role) && (
          <Link href="/dashboard/inventory/new">
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Item</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-gray-500 text-sm">Total Items</p><p className="text-2xl font-bold text-gray-900 mt-2">{inventory.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-gray-500 text-sm">Total Value</p><p className="text-2xl font-bold text-gray-900 mt-2">Rs {totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Low Stock Items</p><p className="text-2xl font-bold text-red-600 mt-2">{lowStock.length}</p></div>{lowStock.length > 0 && <AlertTriangle className="w-8 h-8 text-red-500" />}</div></CardContent></Card>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Low Stock Alert</p>
          <ul className="text-red-700 text-sm mt-2 space-y-1">
            {lowStock.map((item) => (
              <li key={item.id}>• {item.Drug?.name} ({item.quantityOnHand}/{item.reorderLevel})</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input placeholder="Search inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Drug</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Form / Strength</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Quantity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Reorder Level</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Unit Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">No inventory items found</td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{item.Drug?.name}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{item.Drug?.form} {item.Drug?.strength}</td>
                      <td className="py-3 px-4 text-gray-900">{item.quantityOnHand}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{item.reorderLevel}</td>
                      <td className="py-3 px-4 text-gray-900">Rs {Number(item.unitCost || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <Badge className={item.quantityOnHand < item.reorderLevel ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {item.quantityOnHand < item.reorderLevel ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

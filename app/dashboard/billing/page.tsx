'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageBilling } from '@/lib/permissions';
import type { DbInvoice } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, DollarSign, Plus } from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('Invoice')
        .select('*, Patient(fullName)')
        .order('createdAt', { ascending: false });
      setInvoices((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = invoices.filter((inv) => {
    const matchesSearch = (inv.Patient?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIALLY_PAID': return 'bg-yellow-100 text-yellow-800';
      case 'UNPAID': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.total), 0);
  const totalPending = invoices.filter((i) => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID').reduce((s, i) => s + (Number(i.total) - Number(i.amountPaid)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-500 mt-2">Invoices and payment records</p>
        </div>
        {canManageBilling(user?.role) && (
          <Link href="/dashboard/billing/new">
            <Button className="gap-2"><Plus className="w-4 h-4" />New Invoice</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Total Revenue</p><p className="text-2xl font-bold text-gray-900 mt-2">Rs {totalRevenue.toLocaleString()}</p></div><DollarSign className="w-8 h-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Pending Payment</p><p className="text-2xl font-bold text-gray-900 mt-2">Rs {totalPending.toLocaleString()}</p></div><DollarSign className="w-8 h-8 text-yellow-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Total Invoices</p><p className="text-2xl font-bold text-gray-900 mt-2">{invoices.length}</p></div><DollarSign className="w-8 h-8 text-blue-500" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input placeholder="Search by patient name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {['all', 'PAID', 'UNPAID', 'PARTIALLY_PAID', 'CANCELLED'].map((status) => (
              <Button key={status} variant={statusFilter === status ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(status)} className="capitalize">
                {status.replace('_', ' ').toLowerCase()}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Invoice #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Paid</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">No invoices found</td></tr>
                ) : (
                  filtered.map((inv) => (
                    <tr key={inv.id} onClick={() => router.push(`/dashboard/billing/${inv.id}`)} className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="py-3 px-4 font-medium text-gray-900">{inv.Patient?.fullName || 'Unknown'}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{inv.invoiceNo}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">Rs {Number(inv.total).toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">Rs {Number(inv.amountPaid).toLocaleString()}</td>
                      <td className="py-3 px-4"><Badge className={getStatusColor(inv.status)}>{inv.status.replace('_', ' ')}</Badge></td>
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { DbPatient } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

interface LineItem {
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<DbPatient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ description: '', category: 'Consultation', quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('Patient').select('id, fullName, mrn').order('fullName');
      setPatients((data as any) || []);
    })();
  }, []);

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    const next = [...items];
    (next[i] as any)[field] = value;
    setItems(next);
  };

  const addItem = () => setItems([...items, { description: '', category: 'Consultation', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const total = subtotal - discount + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!patientId || items.some((it) => !it.description)) {
      setError('Patient and all line item descriptions are required.');
      setLoading(false);
      return;
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
    const { data: invoice, error: invError } = await supabase
      .from('Invoice')
      .insert({
        hospitalId: user?.hospitalId,
        patientId,
        invoiceNo,
        status: 'UNPAID',
        subtotal,
        discount,
        tax,
        total,
        amountPaid: 0,
      })
      .select()
      .single();

    if (invError || !invoice) {
      setError(invError?.message || 'Failed to create invoice');
      setLoading(false);
      return;
    }

    const { error: itemsError } = await supabase.from('InvoiceItem').insert(
      items.map((it) => ({
        invoiceId: invoice.id,
        description: it.description,
        category: it.category,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.quantity * it.unitPrice,
      }))
    );

    setLoading(false);
    if (itemsError) { setError(itemsError.message); return; }
    router.push('/dashboard/billing');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Invoice</h1>
          <p className="text-gray-500 mt-2">Create an invoice for a patient</p>
        </div>
        <Link href="/dashboard/billing">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-3xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Patient *</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300" required>
            <option value="">Select a patient</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>)}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Line Items</label>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" />Add Item</Button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-5" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
              <Input className="col-span-2" placeholder="Category" value={item.category} onChange={(e) => updateItem(i, 'category', e.target.value)} />
              <Input className="col-span-2" type="number" min={1} placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
              <Input className="col-span-2" type="number" min={0} placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))} />
              <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Discount (Rs)</label>
            <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Tax (Rs)</label>
            <Input type="number" min={0} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-Rs {discount.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>+Rs {tax.toLocaleString()}</span></div>
          <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>Rs {total.toLocaleString()}</span></div>
        </div>

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Creating...' : 'Create Invoice'}
        </Button>
      </form>
    </div>
  );
}

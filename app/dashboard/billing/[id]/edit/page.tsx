'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { canEditInvoice } from '@/lib/permissions';
import { logAudit } from '@/lib/audit-log';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { RoleGuard } from '@/components/dashboard/role-guard';

const CATEGORIES = ['Consultation', 'Bed Charges', 'Pharmacy', 'Lab', 'Radiology', 'Procedure', 'Other'];

interface LineItem {
  id?: string;
  description: string;
  category: string;
  departmentId: string;
  quantity: number;
  unitPrice: number;
}

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [invRes, deptRes] = await Promise.all([
        supabase.from('Invoice').select('*, Patient(fullName, mrn), InvoiceItem(*)').eq('id', params.id).single(),
        supabase.from('Department').select('id, name').order('name'),
      ]);
      const data = invRes.data;
      setInvoice(data);
      setItems((data?.InvoiceItem || []).map((it: any) => ({ id: it.id, description: it.description, category: it.category || 'Other', departmentId: it.departmentId || '', quantity: it.quantity, unitPrice: Number(it.unitPrice) })));
      setDepartments(deptRes.data || []);
      setDiscount(Number(data?.discount || 0));
      setTax(Number(data?.tax || 0));
      setDueDate(data?.dueDate || '');
      setLoading(false);
    })();
  }, [params.id]);

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    const next = [...items];
    (next[i] as any)[field] = value;
    setItems(next);
  };

  const addItem = () => setItems([...items, { description: '', category: 'Other', departmentId: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => {
    const item = items[i];
    if (item.id) setDeletedItemIds((prev) => [...prev, item.id!]);
    setItems(items.filter((_, idx) => idx !== i));
  };

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const total = subtotal - discount + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (items.some((it) => !it.description)) {
      setError('All line item descriptions are required.');
      setSaving(false);
      return;
    }

    for (const id of deletedItemIds) {
      await supabase.from('InvoiceItem').delete().eq('id', id);
    }

    for (const item of items) {
      if (item.id) {
        await supabase.from('InvoiceItem').update({
          description: item.description,
          category: item.category,
          departmentId: item.departmentId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        }).eq('id', item.id);
      } else {
        await supabase.from('InvoiceItem').insert({
          invoiceId: params.id,
          description: item.description,
          category: item.category,
          departmentId: item.departmentId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        });
      }
    }

    const newStatus = invoice.amountPaid >= total ? 'PAID' : Number(invoice.amountPaid) > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    const { error: updateError } = await supabase.from('Invoice').update({ subtotal, discount, tax, total, status: newStatus, dueDate: dueDate || null }).eq('id', params.id);

    setSaving(false);
    if (updateError) { setError(updateError.message); return; }

    logAudit({
      hospitalId: user?.hospitalId,
      userId: user?.id,
      action: 'INVOICE_EDITED',
      entityType: 'Invoice',
      entityId: params.id as string,
      metadata: { invoiceNo: invoice.invoiceNo, newTotal: total },
    });

    router.push(`/dashboard/billing/${params.id}`);
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!invoice) return <div className="text-gray-500">Invoice not found</div>;

  return (
    <RoleGuard allowed={canEditInvoice(user?.role, settings.allowBillingClerkInvoiceEdit)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Invoice {invoice.invoiceNo}</h1>
            <p className="text-gray-500 mt-2">{invoice.Patient?.fullName} ({invoice.Patient?.mrn})</p>
          </div>
          <Link href={`/dashboard/billing/${params.id}`}>
            <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-3xl">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Already paid: Rs {Number(invoice.amountPaid).toLocaleString()}. Editing totals won't change payments already recorded.
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Line Items</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" />Add Item</Button>
            </div>
            <div className="overflow-x-auto space-y-2 pb-1">
              {items.map((item, i) => (
                <div key={item.id || `new-${i}`} className="min-w-[780px] grid grid-cols-[repeat(14,minmax(0,1fr))] gap-2 items-center">
                  <Input className="col-span-3" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                  <select className="col-span-2 px-2 py-2 rounded-lg border border-gray-300 text-sm" value={item.category} onChange={(e) => updateItem(i, 'category', e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="col-span-3 px-2 py-2 rounded-lg border border-gray-300 text-sm" value={item.departmentId} onChange={(e) => updateItem(i, 'departmentId', e.target.value)}>
                    <option value="">No department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <Input className="col-span-2" type="number" min={1} placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                  <Input className="col-span-3" type="number" min={0} placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))} />
                  <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Discount (Rs)</label>
              <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Tax (Rs)</label>
              <Input type="number" min={0} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-Rs {discount.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>+Rs {tax.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>Rs {total.toLocaleString()}</span></div>
          </div>

          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </RoleGuard>
  );
}

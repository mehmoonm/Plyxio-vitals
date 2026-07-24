'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { DbPatient } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2, Wand2 } from 'lucide-react';
import { canManageBilling } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';
import { QuickAddPatientModal } from '@/components/dashboard/quick-add-patient-modal';

const CATEGORIES = ['Consultation', 'Bed Charges', 'Pharmacy', 'Lab', 'Radiology', 'Procedure', 'Other'];

interface LineItem {
  description: string;
  category: string;
  departmentId: string;
  quantity: number;
  unitPrice: number;
}

interface Suggestion {
  key: string;
  sourceType: 'dispense' | 'lab' | 'radiology' | 'admission';
  sourceId: string;
  description: string;
  category: string;
  amount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<DbPatient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [tax, setTax] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ description: '', category: 'Consultation', departmentId: '', quantity: 1, unitPrice: 0 }]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [billedSourceRefs, setBilledSourceRefs] = useState<{ type: string; id: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([
        supabase.from('Patient').select('id, fullName, mrn').order('fullName'),
        supabase.from('Department').select('id, name').order('name'),
      ]);
      setPatients((p.data as any) || []);
      setDepartments(d.data || []);
    })();
  }, []);

  useEffect(() => {
    if (!patientId) { setSuggestions([]); return; }
    (async () => {
      setLoadingSuggestions(true);
      const found: Suggestion[] = [];

      // Unbilled pharmacy dispenses
      const { data: dispenses } = await supabase
        .from('Dispense')
        .select('id, filledExternally, Prescription(Encounter(patientId)), DispenseItem(quantity, InventoryItem(unitPrice, Drug(name)))')
        .eq('billed', false);
      for (const d of dispenses || []) {
        if ((d as any).Prescription?.Encounter?.patientId !== patientId || d.filledExternally) continue;
        const total = ((d as any).DispenseItem || []).reduce((s: number, di: any) => s + (di.quantity || 0) * Number(di.InventoryItem?.unitPrice || 0), 0);
        if (total <= 0) continue;
        const names = ((d as any).DispenseItem || []).map((di: any) => di.InventoryItem?.Drug?.name).filter(Boolean).join(', ');
        found.push({ key: `dispense-${d.id}`, sourceType: 'dispense', sourceId: d.id, description: `Pharmacy: ${names || 'Dispensed items'}`, category: 'Pharmacy', amount: total });
      }

      // Unbilled lab orders
      const { data: labOrders } = await supabase
        .from('LabOrder')
        .select('id, patientId, LabOrderItem(LabTestCatalog(name, price))')
        .eq('patientId', patientId)
        .eq('billed', false);
      for (const lo of labOrders || []) {
        const total = ((lo as any).LabOrderItem || []).reduce((s: number, i: any) => s + Number(i.LabTestCatalog?.price || 0), 0);
        if (total <= 0) continue;
        const names = ((lo as any).LabOrderItem || []).map((i: any) => i.LabTestCatalog?.name).filter(Boolean).join(', ');
        found.push({ key: `lab-${lo.id}`, sourceType: 'lab', sourceId: lo.id, description: `Lab: ${names || 'Tests'}`, category: 'Lab', amount: total });
      }

      // Unbilled radiology orders (only if a cost was set)
      const { data: radOrders } = await supabase
        .from('RadiologyOrder')
        .select('id, patientId, studyType, bodyPart, cost')
        .eq('patientId', patientId)
        .eq('billed', false)
        .not('cost', 'is', null);
      for (const ro of radOrders || []) {
        if (!ro.cost || Number(ro.cost) <= 0) continue;
        found.push({ key: `radiology-${ro.id}`, sourceType: 'radiology', sourceId: ro.id, description: `Radiology: ${ro.studyType}${ro.bodyPart ? ` (${ro.bodyPart})` : ''}`, category: 'Radiology', amount: Number(ro.cost) });
      }

      // Unbilled admission bed charges
      const { data: admissions } = await supabase
        .from('Admission')
        .select('id, patientId, admittedAt, dischargedAt, bedChargesInvoiced, Bed(bedNumber, dailyRate)')
        .eq('patientId', patientId)
        .eq('bedChargesInvoiced', false);
      for (const adm of admissions || []) {
        const rate = Number((adm as any).Bed?.dailyRate || 0);
        if (rate <= 0) continue;
        const start = new Date(adm.admittedAt).getTime();
        const end = adm.dischargedAt ? new Date(adm.dischargedAt).getTime() : Date.now();
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        found.push({ key: `admission-${adm.id}`, sourceType: 'admission', sourceId: adm.id, description: `Bed Charges: ${(adm as any).Bed?.bedNumber || ''} — ${days} day${days > 1 ? 's' : ''}`, category: 'Bed Charges', amount: rate * days });
      }

      setSuggestions(found);
      setLoadingSuggestions(false);
    })();
  }, [patientId]);

  const toggleSuggestion = (key: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const addSelectedSuggestions = () => {
    const toAdd = suggestions.filter((s) => selectedSuggestions.has(s.key));
    const newItems = toAdd.map((s) => ({ description: s.description, category: s.category, departmentId: '', quantity: 1, unitPrice: s.amount }));
    setItems((prev) => [...prev.filter((it) => it.description || it.unitPrice), ...newItems]);
    setBilledSourceRefs((prev) => [...prev, ...toAdd.map((s) => ({ type: s.sourceType, id: s.sourceId }))]);
    setSuggestions((prev) => prev.filter((s) => !selectedSuggestions.has(s.key)));
    setSelectedSuggestions(new Set());
  };

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    const next = [...items];
    (next[i] as any)[field] = value;
    setItems(next);
  };

  const addItem = () => setItems([...items, { description: '', category: 'Consultation', departmentId: '', quantity: 1, unitPrice: 0 }]);
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
        dueDate,
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
        departmentId: it.departmentId || null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.quantity * it.unitPrice,
      }))
    );

    if (itemsError) { setLoading(false); setError(itemsError.message); return; }

    // Mark whatever suggested charges we included so they can't be billed twice
    for (const ref of billedSourceRefs) {
      if (ref.type === 'dispense') await supabase.from('Dispense').update({ billed: true }).eq('id', ref.id);
      if (ref.type === 'lab') await supabase.from('LabOrder').update({ billed: true }).eq('id', ref.id);
      if (ref.type === 'radiology') await supabase.from('RadiologyOrder').update({ billed: true }).eq('id', ref.id);
      if (ref.type === 'admission') await supabase.from('Admission').update({ bedChargesInvoiced: true }).eq('id', ref.id);
    }

    setLoading(false);
    router.push('/dashboard/billing');
  };

  return (
    <RoleGuard allowed={canManageBilling(user?.role)}>
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
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Patient *</label>
            <button type="button" onClick={() => setShowQuickAdd(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <Plus className="w-3 h-3" />New Patient
            </button>
          </div>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300" required>
            <option value="">Select a patient</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>)}
          </select>
        </div>

        {patientId && (loadingSuggestions || suggestions.length > 0) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-indigo-900 flex items-center gap-2"><Wand2 className="w-4 h-4" />Unbilled Charges Found</p>
            {loadingSuggestions ? (
              <p className="text-sm text-indigo-700">Checking for unbilled pharmacy, lab, radiology, and bed charges…</p>
            ) : (
              <>
                <div className="space-y-1">
                  {suggestions.map((s) => (
                    <label key={s.key} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 cursor-pointer">
                      <span className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={selectedSuggestions.has(s.key)} onChange={() => toggleSuggestion(s.key)} className="w-4 h-4" />
                        {s.description}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">Rs {s.amount.toLocaleString()}</span>
                    </label>
                  ))}
                </div>
                <Button type="button" size="sm" onClick={addSelectedSuggestions} disabled={selectedSuggestions.size === 0} className="gap-1">
                  <Plus className="w-3 h-3" />Add Selected to Invoice
                </Button>
              </>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Line Items</label>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="w-3 h-3" />Add Item</Button>
          </div>
          <div className="overflow-x-auto space-y-2 pb-1">
            {items.map((item, i) => (
              <div key={i} className="min-w-[780px] grid grid-cols-[repeat(14,minmax(0,1fr))] gap-2 items-center">
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

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Creating...' : 'Create Invoice'}
        </Button>
      </form>

      {showQuickAdd && (
        <QuickAddPatientModal
          onClose={() => setShowQuickAdd(false)}
          onCreated={(newPatient) => {
            setPatients((prev) => [...prev, newPatient as any]);
            setPatientId(newPatient.id);
            setShowQuickAdd(false);
          }}
        />
      )}
    </div>
    </RoleGuard>
  );
}

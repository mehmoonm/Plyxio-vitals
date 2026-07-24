'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { canManageBilling, canEditInvoice } from '@/lib/permissions';
import { generateInvoicePdf, printInvoicePdf } from '@/lib/pdf/invoice-pdf';
import { logAudit } from '@/lib/audit-log';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Download, Printer, Pencil } from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [inv, pay] = await Promise.all([
      supabase.from('Invoice').select('*, Patient(fullName, mrn), InvoiceItem(*)').eq('id', params.id).single(),
      supabase.from('Payment').select('*').eq('invoiceId', params.id).order('paidAt', { ascending: false }),
    ]);
    setInvoice(inv.data);
    setPayments(pay.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) { setError('Enter a valid payment amount.'); return; }

    setBusy(true);
    const { error: payError } = await supabase.from('Payment').insert({
      invoiceId: params.id,
      amount,
      method: paymentMethod,
      receivedById: user?.id,
    });

    if (payError) { setError(payError.message); setBusy(false); return; }

    logAudit({
      hospitalId: user?.hospitalId,
      userId: user?.id,
      action: 'PAYMENT_RECORDED',
      entityType: 'Invoice',
      entityId: params.id as string,
      metadata: { amount, method: paymentMethod },
    });

    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const newStatus = newAmountPaid >= Number(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';
    await supabase.from('Invoice').update({ amountPaid: newAmountPaid, status: newStatus }).eq('id', params.id);

    setPaymentAmount('');
    await load();
    setBusy(false);
  };

  const buildPdfData = () => ({
    hospitalName: settings.hospitalName,
    hospitalPhone: settings.phone,
    hospitalEmail: settings.email,
    hospitalAddress: settings.address,
    hospitalCity: settings.city,
    invoiceNo: invoice.invoiceNo,
    createdAt: invoice.createdAt,
    status: invoice.status,
    patientName: invoice.Patient?.fullName || 'Unknown',
    patientMrn: invoice.Patient?.mrn || '',
    items: (invoice.InvoiceItem || []).map((it: any) => ({
      description: it.description,
      category: it.category,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      amount: Number(it.amount),
    })),
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    tax: Number(invoice.tax),
    total: Number(invoice.total),
    amountPaid: Number(invoice.amountPaid),
  });

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!invoice) return <div className="text-gray-500">Invoice not found</div>;

  const balance = Number(invoice.total) - Number(invoice.amountPaid);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/dashboard/billing">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Billing</Button>
        </Link>
        <div className="flex gap-2">
          {canEditInvoice(user?.role, settings.allowBillingClerkInvoiceEdit) && (
            <Link href={`/dashboard/billing/${params.id}/edit`}>
              <Button variant="outline" className="gap-2"><Pencil className="w-4 h-4" />Edit</Button>
            </Link>
          )}
          <Button onClick={() => printInvoicePdf(buildPdfData())} variant="outline" className="gap-2"><Printer className="w-4 h-4" />Print</Button>
          <Button onClick={() => generateInvoicePdf(buildPdfData())} variant="outline" className="gap-2"><Download className="w-4 h-4" />Download PDF</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoiceNo}</h1>
            <p className="text-gray-500 mt-1">{invoice.Patient?.fullName} ({invoice.Patient?.mrn})</p>
          </div>
          <Badge className={invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
            {invoice.status.replace('_', ' ')}
          </Badge>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Description</th>
              <th className="py-2">Category</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit Price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.InvoiceItem || []).map((it: any) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-gray-500">{it.category || '—'}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">Rs {Number(it.unitPrice).toLocaleString()}</td>
                <td className="py-2 text-right">Rs {Number(it.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm ml-auto max-w-xs">
          <div className="flex justify-between"><span>Subtotal</span><span>Rs {Number(invoice.subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-Rs {Number(invoice.discount).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>+Rs {Number(invoice.tax).toLocaleString()}</span></div>
          <div className="flex justify-between font-bold pt-2 border-t"><span>Total</span><span>Rs {Number(invoice.total).toLocaleString()}</span></div>
          <div className="flex justify-between text-green-700"><span>Paid</span><span>Rs {Number(invoice.amountPaid).toLocaleString()}</span></div>
          <div className="flex justify-between font-bold text-red-700"><span>Balance</span><span>Rs {balance.toLocaleString()}</span></div>
        </div>

        {payments.length > 0 && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-gray-900 mb-2">Payment History</h3>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span>{new Date(p.paidAt).toLocaleString()} — {p.method}</span>
                  <span className="font-semibold">Rs {Number(p.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {canManageBilling(user?.role) && balance > 0 && (
          <form onSubmit={recordPayment} className="pt-4 border-t space-y-3">
            <h3 className="font-semibold text-gray-900">Record Payment</h3>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
            <div className="flex gap-3">
              <Input type="number" min={1} placeholder="Amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="max-w-xs" />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="INSURANCE">Insurance</option>
                <option value="MOBILE_WALLET">Mobile Wallet</option>
              </select>
              <Button type="submit" disabled={busy} className="gap-2"><DollarSign className="w-4 h-4" />{busy ? 'Recording...' : 'Record Payment'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

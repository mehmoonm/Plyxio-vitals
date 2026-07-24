'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePatientAuth } from '@/lib/patient-auth-context';
import { supabase } from '@/lib/supabase/client';
import { generateInvoicePdf, printInvoicePdf } from '@/lib/pdf/invoice-pdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Download, Printer } from 'lucide-react';

const METHODS = [
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'CARD', label: 'Debit/Credit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

export default function PortalInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { patient } = usePatientAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('JAZZCASH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('Invoice').select('*, InvoiceItem(*)').eq('id', params.id).single();
    setInvoice(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  // Patients authenticate through a separate context from staff, so we
  // fetch the hospital's branding/contact info directly rather than via
  // the staff-only settings context.
  useEffect(() => {
    if (!patient?.hospitalId) return;
    (async () => {
      const { data } = await supabase.from('Hospital').select('name, phone, email, address, city').eq('id', patient.hospitalId).single();
      setHospital(data);
    })();
  }, [patient?.hospitalId]);

  const balance = invoice ? Number(invoice.total) - Number(invoice.amountPaid) : 0;

  const handlePay = async () => {
    if (!invoice) return;
    setBusy(true);
    setError('');

    // NOTE: this records the payment in our system. Actually charging the
    // patient's JazzCash/EasyPaisa/card requires wiring up the real payment
    // gateway with live merchant credentials — that connection isn't set up
    // yet, so this button currently just logs the payment as received.
    const { error: payError } = await supabase.from('Payment').insert({
      invoiceId: invoice.id,
      amount: balance,
      method,
    });

    if (payError) { setError(payError.message); setBusy(false); return; }

    await supabase.from('Invoice').update({ amountPaid: Number(invoice.amountPaid) + balance, status: 'PAID' }).eq('id', invoice.id);
    setPaid(true);
    await load();
    setBusy(false);
  };

  const buildPdfData = () => ({
    hospitalName: hospital?.name || 'PLYXIO Vitals',
    hospitalPhone: hospital?.phone,
    hospitalEmail: hospital?.email,
    hospitalAddress: hospital?.address,
    hospitalCity: hospital?.city,
    invoiceNo: invoice.invoiceNo,
    createdAt: invoice.createdAt,
    status: invoice.status,
    patientName: patient?.fullName || 'Unknown',
    patientMrn: patient?.mrn || '',
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

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!invoice) return <p className="text-gray-400">Invoice not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/portal/billing">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Billing</Button>
        </Link>
        <div className="flex gap-2">
          <Button onClick={() => printInvoicePdf(buildPdfData())} variant="outline" className="gap-2"><Printer className="w-4 h-4" />Print</Button>
          <Button onClick={() => generateInvoicePdf(buildPdfData())} variant="outline" className="gap-2"><Download className="w-4 h-4" />Download PDF</Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Invoice {invoice.invoiceNo}</h1>
            <p className="text-gray-400 mt-1">{new Date(invoice.createdAt).toLocaleDateString()}</p>
          </div>
          <Badge className={invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{invoice.status.replace('_', ' ')}</Badge>
        </div>

        <table className="w-full text-sm text-gray-200">
          <thead><tr className="border-b border-white/10 text-left text-gray-400"><th className="py-2">Description</th><th className="py-2">Category</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {(invoice.InvoiceItem || []).map((it: any) => (
              <tr key={it.id} className="border-b border-white/5">
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-gray-400">{it.category || '—'}</td>
                <td className="py-2 text-right">Rs {Number(it.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bg-white/5 rounded-lg p-4 space-y-1 text-sm text-gray-200 max-w-xs ml-auto">
          <div className="flex justify-between"><span>Total</span><span>Rs {Number(invoice.total).toLocaleString()}</span></div>
          <div className="flex justify-between text-green-400"><span>Paid</span><span>Rs {Number(invoice.amountPaid).toLocaleString()}</span></div>
          <div className="flex justify-between font-bold text-white pt-2 border-t border-white/10"><span>Balance</span><span>Rs {balance.toLocaleString()}</span></div>
        </div>

        {balance > 0 && !paid && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="font-semibold text-white">Pay Now</h3>
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-lg p-3">
              Payment gateway integration (real JazzCash/EasyPaisa charge) is pending merchant account setup. This will record the payment as received.
            </div>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button key={m.value} onClick={() => setMethod(m.value)} className={`px-4 py-2 rounded-lg text-sm ${method === m.value ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <Button onClick={handlePay} disabled={busy} className="gap-2 gradient-primary">
              <CreditCard className="w-4 h-4" />{busy ? 'Processing...' : `Pay Rs ${balance.toLocaleString()}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

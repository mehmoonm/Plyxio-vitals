'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageFinances } from '@/lib/permissions';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, RefreshCw, CheckCircle2, DollarSign, Download, Printer } from 'lucide-react';
import { generatePayslipPdf, printPayslipPdf } from '@/lib/pdf/payslip-pdf';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
};

export default function PayrollPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);

  const buildPayslipData = (r: any) => ({
    hospitalName: settings.hospitalName,
    hospitalLogo: settings.logo,
    hospitalPhone: settings.phone,
    hospitalEmail: settings.email,
    hospitalAddress: settings.address,
    hospitalCity: settings.city,
    currencySymbol: currency,
    staffName: r.User?.fullName || 'Unknown',
    staffRole: r.User?.role || '',
    periodLabel: `${MONTHS[r.periodMonth - 1]} ${r.periodYear}`,
    compensationType: r.compensationType,
    patientCount: r.patientCount,
    baseAmount: Number(r.baseAmount),
    bonus: Number(r.bonus),
    deductions: Number(r.deductions),
    totalAmount: Number(r.totalAmount),
    status: r.status,
    paidAt: r.paidAt,
  });
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [edits, setEdits] = useState<Record<string, { bonus: number; deductions: number }>>({});

  const load = async () => {
    const { data } = await supabase
      .from('PayrollRecord')
      .select('*, User(fullName, role, specialty)')
      .eq('periodMonth', month)
      .eq('periodYear', year)
      .order('totalAmount', { ascending: false });
    setRecords(data || []);
    const initialEdits: Record<string, any> = {};
    for (const r of data || []) initialEdits[r.id] = { bonus: Number(r.bonus), deductions: Number(r.deductions) };
    setEdits(initialEdits);
    setLoading(false);
  };

  useEffect(() => { load(); }, [month, year]);

  const generatePayroll = async () => {
    if (!user?.hospitalId) return;
    setGenerating(true);
    setError('');

    const { data: staff } = await supabase
      .from('User')
      .select('id, fullName, role, compensationType, fixedSalaryAmount, perPatientRate')
      .eq('isActive', true)
      .not('compensationType', 'is', null);

    const periodStart = new Date(year, month - 1, 1).toISOString();
    const periodEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

    for (const s of staff || []) {
      let patientCount = 0;
      let baseAmount = 0;

      if (s.compensationType === 'PER_PATIENT') {
        const { count } = await supabase
          .from('Appointment')
          .select('id', { count: 'exact', head: true })
          .eq('doctorId', s.id)
          .eq('status', 'COMPLETED')
          .gte('scheduledAt', periodStart)
          .lte('scheduledAt', periodEnd);
        patientCount = count || 0;
        baseAmount = patientCount * Number(s.perPatientRate || 0);
      } else {
        baseAmount = Number(s.fixedSalaryAmount || 0);
      }

      if (baseAmount <= 0 && patientCount === 0) continue;

      await supabase.from('PayrollRecord').upsert(
        {
          hospitalId: user.hospitalId,
          userId: s.id,
          periodMonth: month,
          periodYear: year,
          compensationType: s.compensationType,
          patientCount,
          baseAmount,
          totalAmount: baseAmount,
          status: 'DRAFT',
        },
        { onConflict: 'userId,periodMonth,periodYear', ignoreDuplicates: true }
      );
    }

    setGenerating(false);
    await load();
  };

  const saveEdit = async (recordId: string) => {
    const edit = edits[recordId];
    const record = records.find((r) => r.id === recordId);
    if (!edit || !record) return;
    const totalAmount = Number(record.baseAmount) + edit.bonus - edit.deductions;
    await supabase.from('PayrollRecord').update({ bonus: edit.bonus, deductions: edit.deductions, totalAmount }).eq('id', recordId);
    await load();
  };

  const updateStatus = async (recordId: string, status: string) => {
    const updates: any = { status };
    if (status === 'APPROVED') { updates.approvedById = user?.id; updates.approvedAt = new Date().toISOString(); }
    if (status === 'PAID') updates.paidAt = new Date().toISOString();
    await supabase.from('PayrollRecord').update(updates).eq('id', recordId);
    await load();
  };

  if (!canManageFinances(user?.role)) {
    return <div className="text-gray-400">This page is only available to admins and accountants.</div>;
  }

  const totalPayout = records.reduce((s, r) => s + Number(r.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
          <Wallet className="w-7 h-7 text-indigo-300" />Payroll
        </h1>
        <p className="text-gray-400 mt-2">Doctor and staff compensation by pay period</p>
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="glass-input px-4 py-2 rounded-lg text-white">
          {MONTHS.map((m, i) => <option key={m} value={i + 1} className="text-black">{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="glass-input px-4 py-2 rounded-lg text-white">
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y} className="text-black">{y}</option>)}
        </select>
        <Button onClick={generatePayroll} disabled={generating} className="gap-2 gradient-primary">
          <RefreshCw className="w-4 h-4" />{generating ? 'Generating...' : 'Generate / Refresh Payroll'}
        </Button>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Total for {MONTHS[month - 1]} {year}</p>
          <p className="text-xl font-bold text-white">{currency} {totalPayout.toLocaleString()}</p>
        </div>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-gray-400 p-6">No payroll generated for this period yet. Set each staff member's pay type on their profile, then click "Generate / Refresh Payroll" above.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {records.map((r) => (
              <div key={r.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{r.User?.fullName} <span className="text-gray-400 text-xs">({r.User?.role?.replace('_', ' ')})</span></p>
                    <p className="text-xs text-gray-400">
                      {r.compensationType === 'PER_PATIENT' ? `${r.patientCount} patients × ${currency} ${(Number(r.baseAmount) / (r.patientCount || 1)).toLocaleString()}` : 'Fixed salary'}
                      {' '}• Base: {currency} {Number(r.baseAmount).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Bonus ({currency})</label>
                    <input
                      type="number"
                      disabled={r.status !== 'DRAFT'}
                      value={edits[r.id]?.bonus ?? 0}
                      onChange={(e) => setEdits({ ...edits, [r.id]: { ...edits[r.id], bonus: Number(e.target.value) } })}
                      onBlur={() => r.status === 'DRAFT' && saveEdit(r.id)}
                      className="glass-input w-full px-2 py-2 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Deductions ({currency})</label>
                    <input
                      type="number"
                      disabled={r.status !== 'DRAFT'}
                      value={edits[r.id]?.deductions ?? 0}
                      onChange={(e) => setEdits({ ...edits, [r.id]: { ...edits[r.id], deductions: Number(e.target.value) } })}
                      onBlur={() => r.status === 'DRAFT' && saveEdit(r.id)}
                      className="glass-input w-full px-2 py-2 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-lg font-bold text-white">{currency} {Number(r.totalAmount).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => printPayslipPdf(buildPayslipData(r))} className="gap-1"><Printer className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => generatePayslipPdf(buildPayslipData(r))} className="gap-1"><Download className="w-3.5 h-3.5" /></Button>
                    {r.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => updateStatus(r.id, 'APPROVED')} className="gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Approve</Button>
                    )}
                    {r.status === 'APPROVED' && (
                      <Button size="sm" onClick={() => updateStatus(r.id, 'PAID')} className="gap-1 gradient-primary"><DollarSign className="w-3.5 h-3.5" />Mark Paid</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

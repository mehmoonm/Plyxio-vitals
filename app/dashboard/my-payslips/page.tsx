'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { generatePayslipPdf, printPayslipPdf } from '@/lib/pdf/payslip-pdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Download, Printer } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  APPROVED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
};

export default function MyPayslipsPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('PayrollRecord')
        .select('*')
        .eq('userId', user.id)
        .order('periodYear', { ascending: false })
        .order('periodMonth', { ascending: false });
      setRecords(data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const buildPayslipData = (r: any) => ({
    hospitalName: settings.hospitalName,
    hospitalLogo: settings.logo,
    hospitalPhone: settings.phone,
    hospitalEmail: settings.email,
    hospitalAddress: settings.address,
    hospitalCity: settings.city,
    currencySymbol: currency,
    staffName: user?.fullName || 'Unknown',
    staffRole: user?.role || '',
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
          <Wallet className="w-7 h-7 text-indigo-300" />My Payslips
        </h1>
        <p className="text-gray-400 mt-2">Your compensation history</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-gray-400 p-6">No payslips generated yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {records.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-white font-medium">{MONTHS[r.periodMonth - 1]} {r.periodYear}</p>
                  <p className="text-xs text-gray-400">{currency} {Number(r.totalAmount).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => printPayslipPdf(buildPayslipData(r))} className="gap-1"><Printer className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => generatePayslipPdf(buildPayslipData(r))} className="gap-1"><Download className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

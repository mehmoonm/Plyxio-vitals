'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { supabase } from '@/lib/supabase/client';
import { canManageFinances } from '@/lib/permissions';
import { TrendingUp, TrendingDown, Wallet, Receipt, ArrowRight, Scale, FileWarning, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const SECTIONS = [
  { href: '/dashboard/finances/ledger', title: 'Ledger', description: 'Every transaction — revenue, expenses, payroll — filterable by date, exportable', icon: BookOpen, color: 'text-amber-300' },
  { href: '/dashboard/reports', title: 'Revenue & Reports', description: 'Revenue trends, appointment volume, doctor performance', icon: TrendingUp, color: 'text-emerald-300' },
  { href: '/dashboard/finances/payroll', title: 'Payroll', description: 'Generate and manage staff compensation by pay period', icon: Wallet, color: 'text-indigo-300' },
  { href: '/dashboard/finances/expenses', title: 'Expenses', description: 'Rent, utilities, supplies, and other operating costs', icon: Receipt, color: 'text-cyan-300' },
];

const AGING_BUCKETS = [
  { key: '0-30', label: '0-30 days', min: 0, max: 30, color: 'bg-amber-500' },
  { key: '31-60', label: '31-60 days', min: 31, max: 60, color: 'bg-orange-500' },
  { key: '61-90', label: '61-90 days', min: 61, max: 90, color: 'bg-red-500' },
  { key: '90+', label: '90+ days', min: 91, max: Infinity, color: 'bg-red-700' },
];

export default function FinancesHubPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, payroll: 0, receivable: 0, receivableCount: 0 });
  const [outstandingInvoices, setOutstandingInvoices] = useState<any[]>([]);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageFinances(user?.role)) { setLoading(false); return; }
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [paymentsRes, expensesRes, payrollRes, outstandingRes] = await Promise.all([
        supabase.from('Payment').select('amount').gte('paidAt', monthStart),
        supabase.from('Expense').select('amount').gte('expenseDate', monthStart.slice(0, 10)),
        supabase.from('PayrollRecord').select('totalAmount').eq('periodMonth', now.getMonth() + 1).eq('periodYear', now.getFullYear()),
        supabase.from('Invoice').select('id, invoiceNo, total, amountPaid, dueDate, createdAt, Patient(fullName)').neq('status', 'PAID'),
      ]);

      const revenue = (paymentsRes.data || []).reduce((s, p: any) => s + Number(p.amount), 0);
      const expenses = (expensesRes.data || []).reduce((s, e: any) => s + Number(e.amount), 0);
      const payroll = (payrollRes.data || []).reduce((s, p: any) => s + Number(p.totalAmount), 0);
      const receivable = (outstandingRes.data || []).reduce((s, i: any) => s + (Number(i.total) - Number(i.amountPaid)), 0);

      setSummary({ revenue, expenses, payroll, receivable, receivableCount: (outstandingRes.data || []).length });
      setOutstandingInvoices(outstandingRes.data || []);
      setLoading(false);
    })();
  }, [user]);

  if (!canManageFinances(user?.role)) {
    return <div className="text-gray-400">This page is only available to admins and accountants.</div>;
  }

  const net = summary.revenue - summary.expenses - summary.payroll;

  const invoicesWithAge = outstandingInvoices.map((inv) => {
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.createdAt);
    const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = Number(inv.total) - Number(inv.amountPaid);
    return { ...inv, daysOverdue: Math.max(0, daysOverdue), balance };
  });

  const buckets = AGING_BUCKETS.map((b) => {
    const invoices = invoicesWithAge.filter((i) => i.daysOverdue >= b.min && i.daysOverdue <= b.max);
    return { ...b, invoices, total: invoices.reduce((s, i) => s + i.balance, 0) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold heading-gradient">Finances</h1>
        <p className="text-gray-400 mt-2">Everything money-related for your hospital, in one place</p>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue (This Month)</p>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">{currency} {summary.revenue.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expenses + Payroll</p>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">{currency} {(summary.expenses + summary.payroll).toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net (This Month)</p>
              <Scale className="w-4 h-4 text-indigo-400" />
            </div>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{currency} {net.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Outstanding (A/R)</p>
              <FileWarning className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{currency} {summary.receivable.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{summary.receivableCount} unpaid invoice{summary.receivableCount === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}

      {!loading && summary.receivableCount > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-bold text-white">Accounts Receivable Aging</h2>
            <p className="text-xs text-gray-400 mt-1">How overdue your unpaid invoices are, based on due date</p>
          </div>
          <div className="divide-y divide-white/10">
            {buckets.map((b) => (
              <div key={b.key}>
                <button
                  onClick={() => setExpandedBucket(expandedBucket === b.key ? null : b.key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                    <span className="text-white font-medium">{b.label}</span>
                    <span className="text-xs text-gray-400">({b.invoices.length} invoice{b.invoices.length === 1 ? '' : 's'})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold">{currency} {b.total.toLocaleString()}</span>
                    {b.invoices.length > 0 && (expandedBucket === b.key ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
                  </div>
                </button>
                {expandedBucket === b.key && b.invoices.length > 0 && (
                  <div className="bg-white/5 px-4 pb-3 space-y-1">
                    {b.invoices.map((inv: any) => (
                      <Link key={inv.id} href={`/dashboard/billing/${inv.id}`} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 text-sm">
                        <span className="text-gray-200">{inv.Patient?.fullName} — {inv.invoiceNo}</span>
                        <span className="text-gray-400">{inv.daysOverdue}d overdue · {currency} {inv.balance.toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {SECTIONS.map(({ href, title, description, icon: Icon, color }) => (
          <Link key={href} href={href} className="glass-card rounded-2xl p-6 hover:bg-white/5 transition-colors group">
            <Icon className={`w-8 h-8 ${color} mb-3`} />
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {title}
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

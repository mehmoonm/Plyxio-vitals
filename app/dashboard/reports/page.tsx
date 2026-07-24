'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/permissions';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, Calendar, CheckCircle2 } from 'lucide-react';
import { getPresetRange, type DateRangePreset } from '@/lib/date-ranges';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleString('default', { month: 'short', day: 'numeric' });
}


function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [appointmentData, setAppointmentData] = useState<{ month: string; total: number; completed: number; cancelled: number; noShow: number }[]>([]);
  const [patientGrowth, setPatientGrowth] = useState<{ month: string; newPatients: number }[]>([]);
  const [doctorStats, setDoctorStats] = useState<any[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<{ category: string; amount: number }[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<{ category: string; amount: number }[]>([]);
  const [invoiceItemsRaw, setInvoiceItemsRaw] = useState<any[]>([]);
  const [expensesRaw, setExpensesRaw] = useState<any[]>([]);
  const [expandedRevenueCategory, setExpandedRevenueCategory] = useState<string | null>(null);
  const [expandedExpenseCategory, setExpandedExpenseCategory] = useState<string | null>(null);
  const [departmentRevenue, setDepartmentRevenue] = useState<{ department: string; amount: number }[]>([]);
  const [departmentExpense, setDepartmentExpense] = useState<{ department: string; amount: number }[]>([]);
  const [topDiagnoses, setTopDiagnoses] = useState<{ diagnosis: string; count: number }[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, patients: 0, appointments: 0, completionRate: 0 });
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [customStart, setCustomStart] = useState(new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));

  const range = getPresetRange(preset, customStart, customEnd);

  useEffect(() => {
    if (!isAdmin(user?.role)) { setLoading(false); return; }
    (async () => {
      const startIso = new Date(`${range.start}T00:00:00`).toISOString();
      const endIso = new Date(`${range.end}T23:59:59`).toISOString();
      const spanDays = Math.max(1, Math.round((new Date(range.end).getTime() - new Date(range.start).getTime()) / (1000 * 60 * 60 * 24)));
      const useDailyBuckets = spanDays <= 31;

      const [paymentsRes, appointmentsRes, patientsRes, doctorsRes, allPatientsCount, invoiceItemsRes, diagnosesRes, expensesRes] = await Promise.all([
        supabase.from('Payment').select('amount, paidAt').gte('paidAt', startIso).lte('paidAt', endIso),
        supabase.from('Appointment').select('scheduledAt, status, doctorId, User(fullName)').gte('scheduledAt', startIso).lte('scheduledAt', endIso),
        supabase.from('Patient').select('createdAt').gte('createdAt', startIso).lte('createdAt', endIso),
        supabase.from('User').select('id, fullName').eq('role', 'DOCTOR').eq('isActive', true),
        supabase.from('Patient').select('id', { count: 'exact', head: true }),
        supabase.from('InvoiceItem').select('id, category, amount, description, departmentId, Department(name), Invoice!inner(id, invoiceNo, createdAt, Patient(fullName))').gte('Invoice.createdAt', startIso).lte('Invoice.createdAt', endIso),
        supabase.from('Encounter').select('diagnosis').gte('createdAt', startIso).lte('createdAt', endIso).not('diagnosis', 'is', null),
        supabase.from('Expense').select('id, category, amount, expenseDate, description, departmentId, Department(name)').gte('expenseDate', range.start).lte('expenseDate', range.end),
      ]);

      // Bucket keys: daily for short ranges (<=31 days), monthly otherwise
      const bucketKeys: string[] = [];
      if (useDailyBuckets) {
        const cur = new Date(`${range.start}T00:00:00`);
        const end = new Date(`${range.end}T00:00:00`);
        while (cur <= end) {
          bucketKeys.push(dayKey(cur));
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        const cur = new Date(range.start);
        cur.setDate(1);
        const end = new Date(range.end);
        while (cur <= end) {
          bucketKeys.push(monthKey(cur));
          cur.setMonth(cur.getMonth() + 1);
        }
      }
      const bucketOf = (d: Date) => (useDailyBuckets ? dayKey(d) : monthKey(d));
      const bucketLabel = (k: string) => (useDailyBuckets ? dayLabel(k) : monthLabel(k));

      // Revenue by bucket
      const revByBucket: Record<string, number> = Object.fromEntries(bucketKeys.map((k) => [k, 0]));
      for (const p of paymentsRes.data || []) {
        const k = bucketOf(new Date(p.paidAt));
        if (k in revByBucket) revByBucket[k] += Number(p.amount);
      }
      setRevenueData(bucketKeys.map((k) => ({ month: bucketLabel(k), revenue: Math.round(revByBucket[k]) })));

      // Appointments by bucket + status breakdown
      const aptByBucket: Record<string, { total: number; completed: number; cancelled: number; noShow: number }> = Object.fromEntries(
        bucketKeys.map((k) => [k, { total: 0, completed: 0, cancelled: 0, noShow: 0 }])
      );
      const doctorCounts: Record<string, { name: string; total: number; completed: number }> = {};
      for (const a of appointmentsRes.data || []) {
        const k = bucketOf(new Date(a.scheduledAt));
        if (k in aptByBucket) {
          aptByBucket[k].total += 1;
          if (a.status === 'COMPLETED') aptByBucket[k].completed += 1;
          if (a.status === 'CANCELLED') aptByBucket[k].cancelled += 1;
          if (a.status === 'NO_SHOW') aptByBucket[k].noShow += 1;
        }
        const docName = (a as any).User?.fullName || 'Unassigned';
        if (!doctorCounts[docName]) doctorCounts[docName] = { name: docName, total: 0, completed: 0 };
        doctorCounts[docName].total += 1;
        if (a.status === 'COMPLETED') doctorCounts[docName].completed += 1;
      }
      setAppointmentData(bucketKeys.map((k) => ({ month: bucketLabel(k), ...aptByBucket[k] })));
      setDoctorStats(Object.values(doctorCounts).sort((a, b) => b.total - a.total).slice(0, 8));

      // Patient growth by bucket
      const patByBucket: Record<string, number> = Object.fromEntries(bucketKeys.map((k) => [k, 0]));
      for (const p of patientsRes.data || []) {
        const k = bucketOf(new Date(p.createdAt));
        if (k in patByBucket) patByBucket[k] += 1;
      }
      setPatientGrowth(bucketKeys.map((k) => ({ month: bucketLabel(k), newPatients: patByBucket[k] })));

      // Revenue by category (Pharmacy, Bed Charges, Lab, etc)
      const catTotals: Record<string, number> = {};
      for (const it of invoiceItemsRes.data || []) {
        const cat = it.category || 'Other';
        catTotals[cat] = (catTotals[cat] || 0) + Number(it.amount || 0);
      }
      setCategoryRevenue(Object.entries(catTotals).map(([category, amount]) => ({ category, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount));
      setInvoiceItemsRaw(invoiceItemsRes.data || []);

      // Expenses by category
      const expTotals: Record<string, number> = {};
      for (const ex of expensesRes.data || []) {
        const cat = ex.category || 'Other';
        expTotals[cat] = (expTotals[cat] || 0) + Number(ex.amount || 0);
      }
      setExpenseByCategory(Object.entries(expTotals).map(([category, amount]) => ({ category, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount));
      setExpensesRaw(expensesRes.data || []);

      // Revenue by department (only items tagged with a department)
      const deptRevTotals: Record<string, number> = {};
      for (const it of invoiceItemsRes.data || []) {
        const deptName = (it as any).Department?.name;
        if (!deptName) continue;
        deptRevTotals[deptName] = (deptRevTotals[deptName] || 0) + Number(it.amount || 0);
      }
      setDepartmentRevenue(Object.entries(deptRevTotals).map(([department, amount]) => ({ department, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount));

      // Expenses by department
      const deptExpTotals: Record<string, number> = {};
      for (const ex of expensesRes.data || []) {
        const deptName = (ex as any).Department?.name;
        if (!deptName) continue;
        deptExpTotals[deptName] = (deptExpTotals[deptName] || 0) + Number(ex.amount || 0);
      }
      setDepartmentExpense(Object.entries(deptExpTotals).map(([department, amount]) => ({ department, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount));

      // Most common diagnoses -- loosely grouped by trimmed/lowercased text
      // since diagnosis is free text (e.g. "Flu" and "flu" count together)
      const diagCounts: Record<string, { label: string; count: number }> = {};
      for (const e of diagnosesRes.data || []) {
        const raw = (e.diagnosis || '').trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (!diagCounts[key]) diagCounts[key] = { label: raw, count: 0 };
        diagCounts[key].count += 1;
      }
      setTopDiagnoses(
        Object.values(diagCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((d) => ({ diagnosis: d.label, count: d.count }))
      );

      // Top-line totals -- scoped to the selected period, not lifetime
      const totalRevenue = (paymentsRes.data || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
      const totalAppointments = (appointmentsRes.data || []).length;
      const completedCount = (appointmentsRes.data || []).filter((a: any) => a.status === 'COMPLETED').length;
      setTotals({
        revenue: totalRevenue,
        patients: allPatientsCount.count || 0,
        appointments: totalAppointments,
        completionRate: totalAppointments > 0 ? Math.round((completedCount / totalAppointments) * 100) : 0,
      });

      setLoading(false);
    })();
  }, [user, preset, customStart, customEnd]);

  if (!isAdmin(user?.role)) {
    return <div className="text-gray-400">This page is only available to hospital admins.</div>;
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold heading-gradient">Reports & Analytics</h1>
        <p className="text-gray-400 mt-2">{range.label}, updated live from your data</p>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <DateRangePicker
          preset={preset}
          customStart={customStart}
          customEnd={customEnd}
          onChange={(p, s, e) => { setPreset(p); setCustomStart(s); setCustomEnd(e); }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Total Revenue</p>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">{currency} {totals.revenue.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Total Patients</p>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totals.patients}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Appointments ({range.label})</p>
            <Calendar className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totals.appointments}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Completion Rate</p>
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totals.completionRate}%</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, 'Revenue']} />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Appointment Volume</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={appointmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
              <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelled" />
              <Bar dataKey="noShow" stackId="a" fill="#f59e0b" name="No Show" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">New Patient Growth</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={patientGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="newPatients" fill="#06b6d4" name="New Patients" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-bold text-white mb-4">Doctor Performance ({range.label})</h2>
        </div>
        {doctorStats.length === 0 ? (
          <p className="text-gray-400 p-6 pt-0">No appointment data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400">
                  <th className="py-3 px-6">Doctor</th>
                  <th className="py-3 px-6">Total Appointments</th>
                  <th className="py-3 px-6">Completed</th>
                  <th className="py-3 px-6">Completion Rate</th>
                  <th className="py-3 px-6">vs Average</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const avgRate = doctorStats.reduce((s, d) => s + (d.total > 0 ? (d.completed / d.total) * 100 : 0), 0) / doctorStats.length;
                  return doctorStats.map((d) => {
                    const rate = d.total > 0 ? (d.completed / d.total) * 100 : 0;
                    const delta = rate - avgRate;
                    return (
                      <tr key={d.name} className="border-b border-white/5">
                        <td className="py-3 px-6 text-white font-medium">Dr. {d.name}</td>
                        <td className="py-3 px-6 text-gray-300">{d.total}</td>
                        <td className="py-3 px-6 text-gray-300">{d.completed}</td>
                        <td className="py-3 px-6 text-gray-300">{Math.round(rate)}%</td>
                        <td className="py-3 px-6">
                          <span className={`font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '+' : ''}{Math.round(delta)} pts
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-bold text-white mb-1">Revenue by Category</h2>
            <p className="text-xs text-gray-400 mb-4">Where your invoice charges are coming from ({range.label})</p>
          </div>
          {categoryRevenue.length === 0 ? (
            <p className="text-gray-400 p-6 pt-0">No invoice data yet</p>
          ) : (
            <div className="px-6 pb-6 space-y-2">
              {categoryRevenue.map((c) => {
                const max = categoryRevenue[0]?.amount || 1;
                const isOpen = expandedRevenueCategory === c.category;
                const items = invoiceItemsRaw.filter((it: any) => (it.category || 'Other') === c.category);
                return (
                  <div key={c.category} className="space-y-1">
                    <button onClick={() => setExpandedRevenueCategory(isOpen ? null : c.category)} className="w-full text-left space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{c.category}</span>
                        <span className="text-white font-semibold">{currency} {c.amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(c.amount / max) * 100}%` }} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="bg-white/5 rounded-lg p-2 space-y-1 mt-1">
                        {items.map((it: any) => (
                          <Link
                            key={it.id}
                            href={`/dashboard/billing/${it.Invoice?.id}`}
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs"
                          >
                            <span className="text-gray-300 truncate">{it.Invoice?.Patient?.fullName || 'Patient'} — {it.description}</span>
                            <span className="text-gray-400 flex-shrink-0 ml-2">{currency} {Number(it.amount).toLocaleString()}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-bold text-white mb-1">Expenses by Category</h2>
            <p className="text-xs text-gray-400 mb-4">Where your operating costs are going ({range.label})</p>
          </div>
          {expenseByCategory.length === 0 ? (
            <p className="text-gray-400 p-6 pt-0">No expense data yet</p>
          ) : (
            <div className="px-6 pb-6 space-y-2">
              {expenseByCategory.map((c) => {
                const max = expenseByCategory[0]?.amount || 1;
                const isOpen = expandedExpenseCategory === c.category;
                const items = expensesRaw.filter((ex: any) => (ex.category || 'Other') === c.category);
                return (
                  <div key={c.category} className="space-y-1">
                    <button onClick={() => setExpandedExpenseCategory(isOpen ? null : c.category)} className="w-full text-left space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{c.category}</span>
                        <span className="text-white font-semibold">{currency} {c.amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(c.amount / max) * 100}%` }} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="bg-white/5 rounded-lg p-2 space-y-1 mt-1">
                        {items.map((ex: any) => (
                          <div key={ex.id} className="flex items-center justify-between px-2 py-1.5 text-xs">
                            <span className="text-gray-300 truncate">{ex.description || ex.category} {ex.Department?.name ? `· ${ex.Department.name}` : ''} — {new Date(ex.expenseDate).toLocaleDateString()}</span>
                            <span className="text-gray-400 flex-shrink-0 ml-2">{currency} {Number(ex.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-bold text-white mb-1">Most Common Diagnoses</h2>
            <p className="text-xs text-gray-400 mb-4">From visit records ({range.label}) — grouped loosely by spelling</p>
          </div>
          {topDiagnoses.length === 0 ? (
            <p className="text-gray-400 p-6 pt-0">No diagnosis data yet</p>
          ) : (
            <div className="px-6 pb-6 space-y-2">
              {topDiagnoses.map((d) => {
                const max = topDiagnoses[0]?.count || 1;
                return (
                  <div key={d.diagnosis} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 capitalize">{d.diagnosis}</span>
                      <span className="text-white font-semibold">{d.count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(departmentRevenue.length > 0 || departmentExpense.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="text-lg font-bold text-white mb-1">Revenue by Department</h2>
              <p className="text-xs text-gray-400 mb-4">Which departments are generating revenue ({range.label})</p>
            </div>
            {departmentRevenue.length === 0 ? (
              <p className="text-gray-400 p-6 pt-0">No department-tagged invoice items yet. Tag line items with a department when billing.</p>
            ) : (
              <div className="px-6 pb-6 space-y-2">
                {departmentRevenue.map((d) => {
                  const max = departmentRevenue[0]?.amount || 1;
                  return (
                    <div key={d.department} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{d.department}</span>
                        <span className="text-white font-semibold">{currency} {d.amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(d.amount / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="text-lg font-bold text-white mb-1">Expenses by Department</h2>
              <p className="text-xs text-gray-400 mb-4">Which departments are costing the most ({range.label})</p>
            </div>
            {departmentExpense.length === 0 ? (
              <p className="text-gray-400 p-6 pt-0">No department-tagged expenses yet. Tag expenses with a department when adding them.</p>
            ) : (
              <div className="px-6 pb-6 space-y-2">
                {departmentExpense.map((d) => {
                  const max = departmentExpense[0]?.amount || 1;
                  return (
                    <div key={d.department} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{d.department}</span>
                        <span className="text-white font-semibold">{currency} {d.amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(d.amount / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {(departmentRevenue.length > 0 || departmentExpense.length > 0) && (() => {
        const deptNames = Array.from(new Set([...departmentRevenue.map((d) => d.department), ...departmentExpense.map((d) => d.department)]));
        const benchmarkRows = deptNames.map((name) => {
          const revenue = departmentRevenue.find((d) => d.department === name)?.amount || 0;
          const expense = departmentExpense.find((d) => d.department === name)?.amount || 0;
          return { name, revenue, expense, net: revenue - expense };
        }).sort((a, b) => b.net - a.net);
        const avgNet = benchmarkRows.reduce((s, r) => s + r.net, 0) / (benchmarkRows.length || 1);

        return (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="text-lg font-bold text-white mb-1">Department Benchmarking</h2>
              <p className="text-xs text-gray-400 mb-4">Revenue vs expenses, ranked by net contribution ({range.label})</p>
            </div>
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-400">
                    <th className="py-3 px-6">Department</th>
                    <th className="py-3 px-6">Revenue</th>
                    <th className="py-3 px-6">Expenses</th>
                    <th className="py-3 px-6">Net</th>
                    <th className="py-3 px-6">vs Average</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkRows.map((r) => {
                    const delta = r.net - avgNet;
                    return (
                      <tr key={r.name} className="border-b border-white/5">
                        <td className="py-3 px-6 text-white font-medium">{r.name}</td>
                        <td className="py-3 px-6 text-emerald-300">{currency} {r.revenue.toLocaleString()}</td>
                        <td className="py-3 px-6 text-red-300">{currency} {r.expense.toLocaleString()}</td>
                        <td className={`py-3 px-6 font-semibold ${r.net >= 0 ? 'text-white' : 'text-red-300'}`}>{currency} {r.net.toLocaleString()}</td>
                        <td className="py-3 px-6">
                          <span className={`font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '+' : ''}{currency} {Math.round(delta).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

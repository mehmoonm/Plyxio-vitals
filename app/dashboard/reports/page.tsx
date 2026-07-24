'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/permissions';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, Calendar, CheckCircle2 } from 'lucide-react';

const MONTHS_BACK = 6;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

function lastNMonthKeys(n: number) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [appointmentData, setAppointmentData] = useState<{ month: string; total: number; completed: number; cancelled: number; noShow: number }[]>([]);
  const [patientGrowth, setPatientGrowth] = useState<{ month: string; newPatients: number }[]>([]);
  const [doctorStats, setDoctorStats] = useState<any[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<{ category: string; amount: number }[]>([]);
  const [topDiagnoses, setTopDiagnoses] = useState<{ diagnosis: string; count: number }[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, patients: 0, appointments: 0, completionRate: 0 });

  useEffect(() => {
    if (!isAdmin(user?.role)) { setLoading(false); return; }
    (async () => {
      const monthsCutoff = new Date();
      monthsCutoff.setMonth(monthsCutoff.getMonth() - MONTHS_BACK);
      const cutoffIso = monthsCutoff.toISOString();

      const [paymentsRes, appointmentsRes, patientsRes, doctorsRes, allPatientsCount, allInvoicesRes, invoiceItemsRes, diagnosesRes] = await Promise.all([
        supabase.from('Payment').select('amount, paidAt').gte('paidAt', cutoffIso),
        supabase.from('Appointment').select('scheduledAt, status, doctorId, User(fullName)').gte('scheduledAt', cutoffIso),
        supabase.from('Patient').select('createdAt').gte('createdAt', cutoffIso),
        supabase.from('User').select('id, fullName').eq('role', 'DOCTOR').eq('isActive', true),
        supabase.from('Patient').select('id', { count: 'exact', head: true }),
        supabase.from('Invoice').select('amountPaid, status'),
        supabase.from('InvoiceItem').select('category, amount, Invoice!inner(createdAt)').gte('Invoice.createdAt', cutoffIso),
        supabase.from('Encounter').select('diagnosis').gte('createdAt', cutoffIso).not('diagnosis', 'is', null),
      ]);

      const monthKeys = lastNMonthKeys(MONTHS_BACK);

      // Revenue by month
      const revByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
      for (const p of paymentsRes.data || []) {
        const k = monthKey(new Date(p.paidAt));
        if (k in revByMonth) revByMonth[k] += Number(p.amount);
      }
      setRevenueData(monthKeys.map((k) => ({ month: monthLabel(k), revenue: Math.round(revByMonth[k]) })));

      // Appointments by month + status breakdown
      const aptByMonth: Record<string, { total: number; completed: number; cancelled: number; noShow: number }> = Object.fromEntries(
        monthKeys.map((k) => [k, { total: 0, completed: 0, cancelled: 0, noShow: 0 }])
      );
      const doctorCounts: Record<string, { name: string; total: number; completed: number }> = {};
      for (const a of appointmentsRes.data || []) {
        const k = monthKey(new Date(a.scheduledAt));
        if (k in aptByMonth) {
          aptByMonth[k].total += 1;
          if (a.status === 'COMPLETED') aptByMonth[k].completed += 1;
          if (a.status === 'CANCELLED') aptByMonth[k].cancelled += 1;
          if (a.status === 'NO_SHOW') aptByMonth[k].noShow += 1;
        }
        const docName = (a as any).User?.fullName || 'Unassigned';
        if (!doctorCounts[docName]) doctorCounts[docName] = { name: docName, total: 0, completed: 0 };
        doctorCounts[docName].total += 1;
        if (a.status === 'COMPLETED') doctorCounts[docName].completed += 1;
      }
      setAppointmentData(monthKeys.map((k) => ({ month: monthLabel(k), ...aptByMonth[k] })));
      setDoctorStats(Object.values(doctorCounts).sort((a, b) => b.total - a.total).slice(0, 8));

      // Patient growth by month
      const patByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
      for (const p of patientsRes.data || []) {
        const k = monthKey(new Date(p.createdAt));
        if (k in patByMonth) patByMonth[k] += 1;
      }
      setPatientGrowth(monthKeys.map((k) => ({ month: monthLabel(k), newPatients: patByMonth[k] })));

      // Revenue by category (Pharmacy, Bed Charges, Lab, etc)
      const catTotals: Record<string, number> = {};
      for (const it of invoiceItemsRes.data || []) {
        const cat = it.category || 'Other';
        catTotals[cat] = (catTotals[cat] || 0) + Number(it.amount || 0);
      }
      setCategoryRevenue(Object.entries(catTotals).map(([category, amount]) => ({ category, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount));

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

      // Top-line totals
      const totalRevenue = (allInvoicesRes.data || []).reduce((s, i: any) => s + Number(i.amountPaid || 0), 0);
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
  }, [user]);

  if (!isAdmin(user?.role)) {
    return <div className="text-gray-400">This page is only available to hospital admins.</div>;
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold heading-gradient">Reports & Analytics</h1>
        <p className="text-gray-400 mt-2">Last {MONTHS_BACK} months, updated live from your data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Total Revenue</p>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">Rs {totals.revenue.toLocaleString()}</p>
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
            <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Appointments ({MONTHS_BACK}mo)</p>
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
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v: number) => [`Rs ${v.toLocaleString()}`, 'Revenue']} />
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
          <h2 className="text-lg font-bold text-white mb-4">Doctor Performance ({MONTHS_BACK}mo)</h2>
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
                </tr>
              </thead>
              <tbody>
                {doctorStats.map((d) => (
                  <tr key={d.name} className="border-b border-white/5">
                    <td className="py-3 px-6 text-white font-medium">Dr. {d.name}</td>
                    <td className="py-3 px-6 text-gray-300">{d.total}</td>
                    <td className="py-3 px-6 text-gray-300">{d.completed}</td>
                    <td className="py-3 px-6 text-gray-300">{d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-bold text-white mb-1">Revenue by Category</h2>
            <p className="text-xs text-gray-400 mb-4">Where your invoice charges are coming from ({MONTHS_BACK}mo)</p>
          </div>
          {categoryRevenue.length === 0 ? (
            <p className="text-gray-400 p-6 pt-0">No invoice data yet</p>
          ) : (
            <div className="px-6 pb-6 space-y-2">
              {categoryRevenue.map((c) => {
                const max = categoryRevenue[0]?.amount || 1;
                return (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{c.category}</span>
                      <span className="text-white font-semibold">Rs {c.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(c.amount / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-bold text-white mb-1">Most Common Diagnoses</h2>
            <p className="text-xs text-gray-400 mb-4">From visit records ({MONTHS_BACK}mo) — grouped loosely by spelling</p>
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
    </div>
  );
}

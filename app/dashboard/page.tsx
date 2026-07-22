'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentAppointments } from '@/components/dashboard/recent-appointments';
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments';
import { Users, Calendar, FileText, Package, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    totalStaff: 0,
    upcomingAppointments: 0,
    lowInventoryItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [patients, appointments, invoices, staff, scheduled, inventory] = await Promise.all([
        supabase.from('Patient').select('id', { count: 'exact', head: true }),
        supabase.from('Appointment').select('id', { count: 'exact', head: true }),
        supabase.from('Invoice').select('total, amountPaid, status'),
        supabase.from('User').select('id', { count: 'exact', head: true }),
        supabase.from('Appointment').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED'),
        supabase.from('InventoryItem').select('quantityOnHand, reorderLevel'),
      ]);

      const totalRevenue = (invoices.data || [])
        .filter((i: any) => i.status === 'PAID' || i.status === 'PARTIALLY_PAID')
        .reduce((sum: number, i: any) => sum + Number(i.amountPaid || 0), 0);

      const lowInventoryItems = (inventory.data || []).filter(
        (i: any) => i.quantityOnHand < i.reorderLevel
      ).length;

      setStats({
        totalPatients: patients.count || 0,
        totalAppointments: appointments.count || 0,
        totalRevenue,
        totalStaff: staff.count || 0,
        upcomingAppointments: scheduled.count || 0,
        lowInventoryItems,
      });
      setLoading(false);
    })();
  }, []);

  const isAdmin = user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Here&apos;s your hospital overview at a glance</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading live data…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <StatCard title="Total Patients" value={stats.totalPatients} icon={Users} color="from-indigo-600 to-indigo-500" href="/dashboard/patients" />
            <StatCard title="Total Appointments" value={stats.totalAppointments} icon={Calendar} color="from-cyan-600 to-cyan-500" href="/dashboard/appointments" />
            <StatCard title="Total Revenue" value={`Rs ${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="from-purple-600 to-purple-500" href="/dashboard/billing" />
            {isAdmin && (
              <>
                <StatCard title="Total Staff" value={stats.totalStaff} icon={Users} color="from-orange-600 to-orange-500" href="/dashboard/staff" />
                <StatCard title="Scheduled Appointments" value={stats.upcomingAppointments} icon={Calendar} color="from-pink-600 to-pink-500" href="/dashboard/appointments" />
                <StatCard title="Low Inventory Items" value={stats.lowInventoryItems} icon={Package} color="from-amber-600 to-amber-500" href="/dashboard/inventory" />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentAppointments />
            {user?.role !== 'RECEPTIONIST' && <UpcomingAppointments />}
          </div>
        </>
      )}
    </div>
  );
}

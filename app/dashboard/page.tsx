'use client';

import { useAuth } from '@/lib/auth-context';
import { mockPatients, mockAppointments, mockBills, mockStaff, mockInventory } from '@/lib/mock-data';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentAppointments } from '@/components/dashboard/recent-appointments';
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments';
import { Users, Calendar, FileText, Package, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  // Calculate stats
  const totalPatients = mockPatients.length;
  const totalAppointments = mockAppointments.length;
  const totalRevenue = mockBills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);
  const totalStaff = mockStaff.length;
  const upcomingAppointments = mockAppointments.filter((a) => a.status === 'scheduled').length;
  const lowInventoryItems = mockInventory.filter((item) => item.quantity < item.reorderLevel).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Welcome back, {user?.name}
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Here&apos;s your hospital overview at a glance</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Total Patients"
          value={totalPatients}
          icon={Users}
          color="from-indigo-600 to-indigo-500"
        />
        <StatCard
          title="Total Appointments"
          value={totalAppointments}
          icon={Calendar}
          color="from-cyan-600 to-cyan-500"
        />
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue}`}
          icon={TrendingUp}
          color="from-purple-600 to-purple-500"
        />
        {user?.role === 'admin' && (
          <>
            <StatCard
              title="Total Staff"
              value={totalStaff}
              icon={Users}
              color="from-orange-600 to-orange-500"
            />
            <StatCard
              title="Pending Appointments"
              value={upcomingAppointments}
              icon={Calendar}
              color="from-pink-600 to-pink-500"
            />
            <StatCard
              title="Low Inventory Items"
              value={lowInventoryItems}
              icon={Package}
              color="from-amber-600 to-amber-500"
            />
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAppointments />
        {user?.role !== 'patient' && <UpcomingAppointments />}
      </div>
    </div>
  );
}

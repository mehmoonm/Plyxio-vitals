'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ModulesProvider } from '@/lib/hospital-modules-context';
import { supabase } from '@/lib/supabase/client';
import { useAppointmentReminders, type UpcomingAppointmentReminder } from '@/lib/use-appointment-reminders';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { NotificationPermissionBanner } from '@/components/notification-permission-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const fetchUpcoming = useCallback(async (): Promise<UpcomingAppointmentReminder[]> => {
    if (!user) return [];
    const windowEnd = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    let query = supabase
      .from('Appointment')
      .select('id, scheduledAt, reason, Patient(fullName), User(fullName)')
      .eq('status', 'SCHEDULED')
      .lte('scheduledAt', windowEnd)
      .gte('scheduledAt', new Date().toISOString());

    // Doctors only get reminded about their own patients; other roles
    // (front desk, nurses, admin) get a heads-up on anything coming up
    // hospital-wide so they can prep the day.
    if (user.role === 'DOCTOR') {
      query = query.eq('doctorId', user.id);
    }

    const { data } = await query;
    return (data || []).map((apt: any) => ({
      id: apt.id,
      scheduledAt: apt.scheduledAt,
      title: 'Upcoming Appointment',
      body: `${apt.Patient?.fullName || 'Patient'} with Dr. ${apt.User?.fullName || 'doctor'} at ${new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    }));
  }, [user]);

  useAppointmentReminders(fetchUpcoming);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ModulesProvider>
      <div className="flex h-screen" style={{ backgroundImage: 'var(--background-gradient)' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
          <main className="flex-1 overflow-auto" style={{ backgroundImage: 'var(--main-gradient)' }}>
            <div className="p-4 sm:p-6">
              <NotificationPermissionBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </ModulesProvider>
  );
}

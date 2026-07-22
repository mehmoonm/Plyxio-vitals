'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PatientAuthProvider, usePatientAuth } from '@/lib/patient-auth-context';
import { supabase } from '@/lib/supabase/client';
import { useAppointmentReminders, type UpcomingAppointmentReminder } from '@/lib/use-appointment-reminders';
import { NotificationPermissionBanner } from '@/components/notification-permission-banner';
import { LayoutDashboard, Calendar, Pill, FileText, Receipt, MessageCircle, LogOut, Menu } from 'lucide-react';

const menuItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/appointments', label: 'Appointments', icon: Calendar },
  { href: '/portal/records', label: 'Medical Records', icon: FileText },
  { href: '/portal/prescriptions', label: 'Prescriptions', icon: Pill },
  { href: '/portal/billing', label: 'Billing', icon: Receipt },
  { href: '/portal/messages', label: 'Messages', icon: MessageCircle },
];

function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, patient, logout } = usePatientAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/portal/login' && pathname !== '/portal/reset-password') {
      router.push('/portal/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const fetchUpcoming = useCallback(async (): Promise<UpcomingAppointmentReminder[]> => {
    if (!patient) return [];
    const windowEnd = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('Appointment')
      .select('id, scheduledAt, User(fullName)')
      .eq('patientId', patient.id)
      .eq('status', 'SCHEDULED')
      .lte('scheduledAt', windowEnd)
      .gte('scheduledAt', new Date().toISOString());

    return (data || []).map((apt: any) => ({
      id: apt.id,
      scheduledAt: apt.scheduledAt,
      title: 'Upcoming Appointment',
      body: `Your appointment with Dr. ${apt.User?.fullName || 'your doctor'} is at ${new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    }));
  }, [patient]);

  useAppointmentReminders(fetchUpcoming);

  if (pathname === '/portal/login' || pathname === '/portal/reset-password') return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={`w-64 sidebar-container flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 sidebar-border">
          <h1 className="text-lg font-bold sidebar-text">MediCare</h1>
          <p className="text-xs sidebar-text-muted">Patient Portal</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}`}>
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 sidebar-border space-y-3">
          <div className="text-xs sidebar-text">
            <p className="font-semibold sidebar-text mb-1">{patient?.fullName}</p>
            <p className="sidebar-text-muted">{patient?.mrn}</p>
          </div>
          <button onClick={() => { logout(); router.push('/portal/login'); }} className="flex items-center gap-2 text-sm sidebar-text-muted hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />Log out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold text-white">MediCare</h1>
          <div className="w-9" />
        </div>
        <main className="flex-1 overflow-auto p-4 sm:p-8">
          <NotificationPermissionBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientAuthProvider>
      <PortalShell>{children}</PortalShell>
    </PatientAuthProvider>
  );
}

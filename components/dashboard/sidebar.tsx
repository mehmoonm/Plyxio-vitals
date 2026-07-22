'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  FileText,
  Package,
  UserCheck,
  Settings,
} from 'lucide-react';
import { useSettings } from '@/lib/settings-context';

const adminMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/dashboard/billing', label: 'Billing', icon: FileText },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/staff', label: 'Staff', icon: UserCheck },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const doctorMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
];

const patientMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/billing', label: 'Billing', icon: FileText },
];

const staffMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { settings } = useSettings();

  let menuItems = [];
  if (user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SUPER_ADMIN') menuItems = adminMenuItems;
  else if (user?.role === 'DOCTOR') menuItems = doctorMenuItems;
  else if (user?.role === 'RECEPTIONIST') menuItems = patientMenuItems;
  else menuItems = staffMenuItems;

  return (
    <div className="w-64 sidebar-container flex flex-col">
      {/* Logo */}
      <div className="p-6 sidebar-border">
        <div className="flex items-center gap-3">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold sidebar-text">{settings.hospitalName}</h1>
            <p className="text-xs sidebar-text-muted">Hospital System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group',
                isActive
                  ? 'sidebar-nav-active'
                  : 'sidebar-nav-inactive'
              )}
            >
              <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 sidebar-border">
        <div className="text-xs sidebar-text">
          <p className="font-semibold sidebar-text mb-1">{user?.fullName}</p>
          <p className="capitalize sidebar-text-muted">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
  );
}

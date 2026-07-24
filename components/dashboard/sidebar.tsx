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
  MessageCircle,
  BedDouble,
  FlaskConical,
  Scan,
  Pill,
  ShieldCheck,
  BarChart3,
  Building2,
  Wallet,
  Clock,
  Share2,
  FileCheck,
  MessageSquare,
  FileSignature,
  Scissors,
  Droplet,
  Truck,
  Wrench,
} from 'lucide-react';
import { useSettings, DEFAULT_ROLE_PAGES, type ShareableRole, type PageKey } from '@/lib/settings-context';
import { useModules, type ModuleKey } from '@/lib/hospital-modules-context';

type MenuItem = { href: string; label: string; icon: any; moduleKey?: ModuleKey };

// Every page a customizable role could potentially see. Which ones each
// role actually sees is decided by DEFAULT_ROLE_PAGES, overridable
// per-hospital by the admin via Settings > Role Page Access.
const PAGE_DEFINITIONS: Record<PageKey, MenuItem> = {
  patients: { href: '/dashboard/patients', label: 'Patients', icon: Users },
  appointments: { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  admissions: { href: '/dashboard/admissions', label: 'Admissions', icon: BedDouble, moduleKey: 'admissions' },
  lab: { href: '/dashboard/lab', label: 'Lab Orders', icon: FlaskConical, moduleKey: 'lab' },
  radiology: { href: '/dashboard/radiology', label: 'Radiology', icon: Scan, moduleKey: 'radiology' },
  inventory: { href: '/dashboard/inventory', label: 'Inventory', icon: Package, moduleKey: 'inventory' },
  pharmacy: { href: '/dashboard/pharmacy', label: 'Pharmacy', icon: Pill, moduleKey: 'inventory' },
  billing: { href: '/dashboard/billing', label: 'Billing', icon: FileText, moduleKey: 'billing' },
  messages: { href: '/dashboard/messages', label: 'Messages', icon: MessageCircle, moduleKey: 'messaging' },
  doctors: { href: '/dashboard/doctors', label: 'Doctors', icon: Stethoscope },
  finances: { href: '/dashboard/finances', label: 'Finances', icon: Wallet },
  referrals: { href: '/dashboard/referrals', label: 'Referrals', icon: Share2 },
  medicalCertificates: { href: '/dashboard/medical-certificates', label: 'Medical Certificates', icon: FileCheck },
  queue: { href: '/dashboard/queue', label: 'Walk-in Queue', icon: Users },
  attendance: { href: '/dashboard/attendance', label: 'Attendance & Leave', icon: Clock },
  consentForms: { href: '/dashboard/consent-forms', label: 'Consent Forms', icon: FileSignature },
  surgeries: { href: '/dashboard/surgeries', label: 'Operation Theatre', icon: Scissors },
  bloodBank: { href: '/dashboard/blood-bank', label: 'Blood Bank', icon: Droplet },
  purchaseOrders: { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: Truck },
  equipment: { href: '/dashboard/equipment', label: 'Equipment & Assets', icon: Wrench },
};

const adminMenuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/admissions', label: 'Admissions', icon: BedDouble, moduleKey: 'admissions' },
  { href: '/dashboard/lab', label: 'Lab Orders', icon: FlaskConical, moduleKey: 'lab' },
  { href: '/dashboard/radiology', label: 'Radiology', icon: Scan, moduleKey: 'radiology' },
  { href: '/dashboard/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/dashboard/referrals', label: 'Referrals', icon: Share2 },
  { href: '/dashboard/medical-certificates', label: 'Medical Certificates', icon: FileCheck },
  { href: '/dashboard/queue', label: 'Walk-in Queue', icon: Users },
  { href: '/dashboard/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/dashboard/staff-shifts', label: 'Staff Shifts', icon: Clock },
  { href: '/dashboard/attendance', label: 'Attendance & Leave', icon: Clock },
  { href: '/dashboard/consent-forms', label: 'Consent Forms', icon: FileSignature },
  { href: '/dashboard/surgeries', label: 'Operation Theatre', icon: Scissors },
  { href: '/dashboard/blood-bank', label: 'Blood Bank', icon: Droplet },
  { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: Truck },
  { href: '/dashboard/equipment', label: 'Equipment & Assets', icon: Wrench },
  { href: '/dashboard/billing', label: 'Billing', icon: FileText, moduleKey: 'billing' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, moduleKey: 'inventory' },
  { href: '/dashboard/pharmacy', label: 'Pharmacy', icon: Pill, moduleKey: 'inventory' },
  { href: '/dashboard/staff', label: 'Staff', icon: UserCheck },
  { href: '/dashboard/departments', label: 'Departments', icon: Building2 },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/finances', label: 'Finances', icon: Wallet },
  { href: '/dashboard/audit-log', label: 'Audit Log', icon: ShieldCheck },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isEnabled } = useModules();

  let menuItems: MenuItem[] = [];
  if (user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SUPER_ADMIN') {
    menuItems = adminMenuItems;
  } else if (user?.role && user.role in DEFAULT_ROLE_PAGES) {
    const role = user.role as ShareableRole;
    const pages = settings.rolePermissions[role] ?? DEFAULT_ROLE_PAGES[role];
    menuItems = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ...pages.map((p) => PAGE_DEFINITIONS[p]).filter(Boolean),
    ];
    if (role === 'DOCTOR') {
      menuItems.push({ href: '/dashboard/schedule', label: 'My Schedule', icon: Clock });
    }
  }

  menuItems = menuItems.filter((item) => !item.moduleKey || isEnabled(item.moduleKey));

  // Personal account security (2FA) is available to every role, regardless
  // of business-module permissions -- it's not a business feature to toggle.
  if (user && menuItems.length > 0) {
    menuItems = [...menuItems, { href: '/dashboard/security', label: 'Security', icon: ShieldCheck }];
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'w-64 sidebar-container flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-6 sidebar-border">
          <div className="flex items-center gap-3">
            {settings.logo ? (
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg gradient-primary-br flex items-center justify-center flex-shrink-0">
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
                onClick={onClose}
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
    </>
  );
}

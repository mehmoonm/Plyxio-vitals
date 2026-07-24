'use client';

import { useState, useRef, useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { useModules, type ModuleKey } from '@/lib/hospital-modules-context';
import { isAdmin } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, RotateCcw, Moon, Sun, Monitor, BedDouble, FlaskConical, Scan, Package, FileText, MessageCircle, Users, CreditCard, Pencil } from 'lucide-react';
import { CURRENCY_OPTIONS } from '@/lib/currency';
import { DEFAULT_ROLE_PAGES, type ShareableRole, type PageKey, type EditModule } from '@/lib/settings-context';
import Link from 'next/link';

const SHAREABLE_ROLES: { role: ShareableRole; label: string }[] = [
  { role: 'DOCTOR', label: 'Doctor' },
  { role: 'NURSE', label: 'Nurse' },
  { role: 'RECEPTIONIST', label: 'Receptionist' },
  { role: 'PHARMACIST', label: 'Pharmacist' },
  { role: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { role: 'RADIOLOGIST', label: 'Radiologist' },
  { role: 'BILLING_CLERK', label: 'Billing Clerk' },
  { role: 'ACCOUNTANT', label: 'Accountant' },
];

const PAGE_LABELS: Record<PageKey, string> = {
  patients: 'Patients',
  appointments: 'Appointments',
  admissions: 'Admissions',
  lab: 'Lab Orders',
  radiology: 'Radiology',
  inventory: 'Inventory',
  pharmacy: 'Pharmacy',
  billing: 'Billing',
  messages: 'Messages',
  doctors: 'Doctors',
  finances: 'Finances',
  referrals: 'Referrals',
  medicalCertificates: 'Medical Certificates',
  queue: 'Walk-in Queue',
};

const EDIT_MODULE_LABELS: Record<EditModule, string> = {
  admissions: 'Admissions & Beds',
  lab: 'Lab Orders',
  radiology: 'Radiology',
  inventory: 'Inventory',
  pharmacy: 'Pharmacy Dispensing',
};

// Which roles actually have write access to each module, so the matrix
// doesn't show meaningless combinations (e.g. a Pharmacist editing Lab Orders)
const EDIT_MODULE_ROLES: Record<EditModule, ShareableRole[]> = {
  admissions: ['DOCTOR', 'NURSE'],
  lab: ['DOCTOR', 'LAB_TECHNICIAN'],
  radiology: ['DOCTOR', 'RADIOLOGIST'],
  inventory: ['PHARMACIST'],
  pharmacy: ['PHARMACIST'],
};

const MODULE_LIST: { key: ModuleKey; label: string; description: string; icon: any }[] = [
  { key: 'admissions', label: 'Admissions & Beds', description: 'Ward/bed management, patient admission and discharge', icon: BedDouble },
  { key: 'lab', label: 'Lab Orders', description: 'Order diagnostic tests and record results', icon: FlaskConical },
  { key: 'radiology', label: 'Radiology', description: 'Order imaging studies and radiology reports', icon: Scan },
  { key: 'inventory', label: 'Inventory', description: 'Pharmacy stock and drug inventory tracking', icon: Package },
  { key: 'billing', label: 'Billing', description: 'Invoices and payment collection', icon: FileText },
  { key: 'messaging', label: 'Patient Messaging', description: 'Lets patients message doctors through the portal', icon: MessageCircle },
];

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { user } = useAuth();
  const { modules, updateModules, loading: modulesLoading } = useModules();
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [hospitalName, setHospitalName] = useState(settings.hospitalName);
  const [logo, setLogo] = useState<string | null>(settings.logo);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(settings.theme);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [city, setCity] = useState(settings.city);
  const [country, setCountry] = useState(settings.country);
  const [allowBillingClerkInvoiceEdit, setAllowBillingClerkInvoiceEdit] = useState(settings.allowBillingClerkInvoiceEdit);
  const [currency, setCurrency] = useState(settings.currency);
  const [taxLabel, setTaxLabel] = useState(settings.taxLabel);
  const [rolePermissions, setRolePermissions] = useState(settings.rolePermissions);
  const [editPermissions, setEditPermissions] = useState(settings.editPermissions);
  const [activeTab, setActiveTab] = useState<'branding' | 'contact' | 'billing' | 'access'>('branding');
  const [saved, setSaved] = useState(false);
  const [moduleSaving, setModuleSaving] = useState<ModuleKey | null>(null);
  const [moduleError, setModuleError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contact/branding fields load asynchronously from the database, so sync
  // local editable state once they arrive (rather than only at first mount)
  useEffect(() => {
    setPrimaryColor(settings.primaryColor);
    setAccentColor(settings.accentColor);
    setHospitalName(settings.hospitalName);
    setLogo(settings.logo);
    setTheme(settings.theme);
    setPhone(settings.phone);
    setEmail(settings.email);
    setAddress(settings.address);
    setCity(settings.city);
    setCountry(settings.country);
    setAllowBillingClerkInvoiceEdit(settings.allowBillingClerkInvoiceEdit);
    setCurrency(settings.currency);
    setTaxLabel(settings.taxLabel);
    setRolePermissions(settings.rolePermissions);
    setEditPermissions(settings.editPermissions);
  }, [settings]);

  const toggleModule = async (key: ModuleKey) => {
    setModuleSaving(key);
    setModuleError('');
    const { error } = await updateModules({ [key]: !modules[key] });
    if (error) setModuleError(error);
    setModuleSaving(null);
  };

  const toggleRolePage = (role: ShareableRole, page: PageKey) => {
    const current = rolePermissions[role] ?? DEFAULT_ROLE_PAGES[role];
    const next = current.includes(page) ? current.filter((p) => p !== page) : [...current, page];
    const updated = { ...rolePermissions, [role]: next };
    setRolePermissions(updated);
    updateSettings({ rolePermissions: updated });
  };

  const toggleEditPermission = (role: ShareableRole, module: EditModule) => {
    const currentlyAllowed = editPermissions[role]?.[module] !== false;
    const updated = {
      ...editPermissions,
      [role]: { ...editPermissions[role], [module]: !currentlyAllowed },
    };
    setEditPermissions(updated);
    updateSettings({ editPermissions: updated });
  };

  const handleSave = () => {
    updateSettings({
      primaryColor,
      accentColor,
      hospitalName,
      logo,
      theme,
      phone,
      email,
      address,
      city,
      country,
      allowBillingClerkInvoiceEdit,
      currency,
      taxLabel,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    // Only resets visual style choices -- hospital name, logo, and contact
    // info are real data, not stylistic defaults, so they're left alone.
    setPrimaryColor('#6366f1');
    setAccentColor('#06b6d4');
    setTheme('dark');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Only admins manage hospital-wide branding/contact/billing/module
  // settings. Everyone else just gets their own theme preference.
  if (!isAdmin(user?.role)) {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold heading-gradient">Preferences</h1>
            <p className="text-slate-400 mt-1">Personal display settings</p>
          </div>
        </div>

        {saved && (
          <div className="glass-card rounded-2xl p-4 border-emerald-400/50 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10">
            <p className="text-emerald-200 font-semibold">✓ Saved!</p>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Appearance</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                  theme === t ? 'bg-indigo-600/30 border-2 border-indigo-500/50' : 'bg-white/5 border border-slate-700/50 hover:bg-white/10'
                }`}
              >
                {t === 'light' ? <Sun className="w-6 h-6" /> : t === 'dark' ? <Moon className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                <span className="text-xs font-semibold capitalize">{t}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => { updateSettings({ theme }); setSaved(true); setTimeout(() => setSaved(false), 3000); }} className="gradient-primary">
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold heading-gradient">
            Settings
          </h1>
          <p className="text-slate-400 mt-2">Customize your hospital branding</p>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="glass-card rounded-2xl p-4 border-emerald-400/50 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10">
          <p className="text-emerald-200 font-semibold">✓ Settings saved successfully!</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {([
          ['branding', 'Branding'],
          ['contact', 'Contact & Currency'],
          ['billing', 'Modules & Billing'],
          ['access', 'Role Access'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'branding' && (
          <>
          {/* Hospital Name */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Hospital Information</h2>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Hospital Name</label>
              <Input
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="Enter hospital name"
                className="glass-input w-full px-4 py-3 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Theme Mode */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Appearance</h2>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Theme Mode</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                    theme === 'light'
                      ? 'bg-indigo-600/30 border-2 border-indigo-500/50'
                      : 'bg-white/5 border border-slate-700/50 hover:bg-white/10'
                  }`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-xs font-semibold">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-indigo-600/30 border-2 border-indigo-500/50'
                      : 'bg-white/5 border border-slate-700/50 hover:bg-white/10'
                  }`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-xs font-semibold">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                    theme === 'system'
                      ? 'bg-indigo-600/30 border-2 border-indigo-500/50'
                      : 'bg-white/5 border border-slate-700/50 hover:bg-white/10'
                  }`}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-xs font-semibold">System</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">System uses your device settings to automatically switch between light and dark mode</p>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Brand Colors</h2>
            
            {/* Primary Color */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Primary Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-16 rounded-lg cursor-pointer"
                />
                <div className="flex-1">
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#6366f1"
                    className="glass-input w-full px-4 py-3 rounded-lg text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">Used for buttons, headings, and primary UI elements</p>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Accent Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-16 h-16 rounded-lg cursor-pointer"
                />
                <div className="flex-1">
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#06b6d4"
                    className="glass-input w-full px-4 py-3 rounded-lg text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">Used for highlights, badges, and secondary elements</p>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Logo Upload</h2>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Hospital Logo</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-500/50 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-600/10 transition-all duration-300"
              >
                {logo ? (
                  <div className="space-y-4">
                    <img src={logo} alt="Logo preview" className="w-24 h-24 mx-auto object-contain" />
                    <p className="text-slate-300 text-sm">Click to change logo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-slate-400" />
                    <div>
                      <p className="text-slate-200 font-semibold">Click to upload logo</p>
                      <p className="text-xs text-slate-400">or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <p className="text-xs text-slate-400">Supported formats: PNG, JPG, SVG (Max 5MB)</p>
            </div>
          </div>
          </>
          )}

          {activeTab === 'contact' && (
          <>
          {/* Contact Info */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Contact Information</h2>
              <p className="text-sm text-slate-400 mt-1">Shown to patients and printed on invoices, prescriptions, and other documents.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@yourhospital.com" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Karachi" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Country</label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pakistan" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
            </div>
          </div>

          {/* Currency & Tax */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Currency & Tax</h2>
              <p className="text-sm text-slate-400 mt-1">Used across invoices, reports, and payroll.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-white">
                  {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code} className="text-black">{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Tax Label</label>
                <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} placeholder="e.g. GST, VAT, Sales Tax" />
                <p className="text-xs text-slate-500 mt-1">Just labels what's shown on invoices — the amount is still entered manually per invoice.</p>
              </div>
            </div>
          </div>
          </>
          )}

          {activeTab === 'billing' && (
          <>
          {/* Billing Controls */}
          {isAdmin(user?.role) && (
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-white">Billing Controls</h2>
                <p className="text-sm text-slate-400 mt-1">By default, only admins can edit an invoice after it's created.</p>
              </div>
              <label className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 cursor-pointer">
                <div>
                  <p className="text-white text-sm font-medium">Allow Billing Clerks to edit invoices</p>
                  <p className="text-xs text-slate-400">Turn on only if you trust your billing staff to correct their own mistakes.</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowBillingClerkInvoiceEdit}
                  onChange={(e) => { setAllowBillingClerkInvoiceEdit(e.target.checked); updateSettings({ allowBillingClerkInvoiceEdit: e.target.checked }); }}
                  className="w-5 h-5"
                />
              </label>
            </div>
          )}

          {/* Modules */}
          {isAdmin(user?.role) && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Your Plan</h2>
                <p className="text-sm text-slate-400 mt-1">Add-on modules included in your hospital's plan. Contact PLYXIO to add more.</p>
              </div>
              <div className="space-y-2">
                {MODULE_LIST.map(({ key, label, description, icon: Icon }) => {
                  const enabled = modules[key] === true;
                  return (
                    <div key={key} className={`flex items-center justify-between rounded-lg px-4 py-3 ${enabled ? 'bg-white/5' : 'bg-white/5 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${enabled ? 'text-indigo-300' : 'text-slate-500'}`} />
                        <div>
                          <p className="text-white text-sm font-medium">{label}</p>
                          <p className="text-xs text-slate-400">{enabled ? description : 'Not included in your current plan'}</p>
                        </div>
                      </div>
                      {enabled ? (
                        <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full flex-shrink-0">Included</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full flex-shrink-0">Add-on</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-white/10">
                Want to add a module? Reach out to PLYXIO support to update your plan.
              </p>
            </div>
          )}
          </>
          )}

          {activeTab === 'access' && (
          <>
          {/* Role Page Access */}
          {isAdmin(user?.role) && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-300" />Role Page Access</h2>
                <p className="text-sm text-slate-400 mt-1">Choose exactly which pages each staff role sees in their sidebar. Saves instantly.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="py-2 pr-4">Page</th>
                      {SHAREABLE_ROLES.map(({ role, label }) => (
                        <th key={role} className="py-2 px-2 text-center font-medium">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(PAGE_LABELS) as PageKey[]).map((page) => (
                      <tr key={page} className="border-t border-white/5">
                        <td className="py-2.5 pr-4 text-white">{PAGE_LABELS[page]}</td>
                        {SHAREABLE_ROLES.map(({ role }) => {
                          const pages = rolePermissions[role] ?? DEFAULT_ROLE_PAGES[role];
                          const checked = pages.includes(page);
                          return (
                            <td key={role} className="py-2.5 px-2 text-center">
                              <input type="checkbox" checked={checked} onChange={() => toggleRolePage(role, page)} className="w-4 h-4" />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Edit Permissions */}
          {isAdmin(user?.role) && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Pencil className="w-5 h-5 text-indigo-300" />Edit Permissions</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Turn off editing for a role within a module -- they can still view, but can't create or change records. Enforced at the database level. Saves instantly.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="py-2 pr-4">Module</th>
                      <th className="py-2 px-2 text-center font-medium">Role</th>
                      <th className="py-2 px-2 text-center font-medium">Can Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(EDIT_MODULE_LABELS) as EditModule[]).flatMap((module) =>
                      EDIT_MODULE_ROLES[module].map((role) => {
                        const allowed = editPermissions[role]?.[module] !== false;
                        return (
                          <tr key={`${module}-${role}`} className="border-t border-white/5">
                            <td className="py-2.5 pr-4 text-white">{EDIT_MODULE_LABELS[module]}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{SHAREABLE_ROLES.find((r) => r.role === role)?.label}</td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => toggleEditPermission(role, module)}
                                className={`w-11 h-6 rounded-full transition-colors relative mx-auto ${allowed ? 'bg-indigo-600' : 'bg-gray-500/50'}`}
                              >
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${allowed ? 'translate-x-5' : 'translate-x-0.5'}`} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-white/10">
                Billing edit permissions (invoices) are controlled separately under "Modules & Billing" above.
              </p>
            </div>
          )}
          </>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-6 sticky top-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Preview</h2>

            {/* Logo Preview */}
            <div className="p-4 rounded-lg bg-white/5 flex items-center justify-center min-h-24">
              {logo ? (
                <img src={logo} alt="Logo" className="max-w-full max-h-24 object-contain" />
              ) : (
                <div className="w-12 h-12 rounded-lg gradient-primary-br flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{hospitalName.charAt(0)}</span>
                </div>
              )}
            </div>

            {/* Name Preview */}
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Hospital Name</p>
              <p className="text-lg font-bold text-white">{hospitalName}</p>
            </div>

            {/* Color Preview */}
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Color Preview</p>
              <div className="flex gap-2">
                <div
                  style={{ backgroundColor: primaryColor }}
                  className="flex-1 h-12 rounded-lg border border-slate-600"
                />
                <div
                  style={{ backgroundColor: accentColor }}
                  className="flex-1 h-12 rounded-lg border border-slate-600"
                />
              </div>
            </div>

            {/* Sample Button */}
            <button
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}
              className="w-full text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-all duration-300"
            >
              Sample Button
            </button>

            {/* Actions */}
            <div className="pt-4 space-y-2 border-t border-slate-700">
              <Button
                onClick={handleSave}
                className="w-full gradient-primary text-white font-semibold py-2 rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300"
              >
                Save Changes
              </Button>
              <Button
                onClick={handleReset}
                className="w-full bg-red-600/20 border border-red-500/50 text-red-200 hover:bg-red-600/30 font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Colors & Theme
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

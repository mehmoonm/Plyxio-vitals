'use client';

import { useState, useRef } from 'react';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { useModules, type ModuleKey } from '@/lib/hospital-modules-context';
import { isAdmin } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, RotateCcw, Moon, Sun, Monitor, BedDouble, FlaskConical, Scan, Package, FileText, MessageCircle } from 'lucide-react';
import Link from 'next/link';

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
  const [saved, setSaved] = useState(false);
  const [moduleSaving, setModuleSaving] = useState<ModuleKey | null>(null);
  const [moduleError, setModuleError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleModule = async (key: ModuleKey) => {
    setModuleSaving(key);
    setModuleError('');
    const { error } = await updateModules({ [key]: !modules[key] });
    if (error) setModuleError(error);
    setModuleSaving(null);
  };

  const handleSave = () => {
    updateSettings({
      primaryColor,
      accentColor,
      hospitalName,
      logo,
      theme,
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
    resetSettings();
    setPrimaryColor('#6366f1');
    setAccentColor('#06b6d4');
    setHospitalName('MediCare');
    setLogo(null);
    setTheme('dark');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
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

          {/* Modules */}
          {isAdmin(user?.role) && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Modules</h2>
                <p className="text-sm text-slate-400 mt-1">Turn features on or off for your hospital. Disabled modules disappear from every staff member's sidebar.</p>
              </div>
              {moduleError && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{moduleError}</div>}
              <div className="space-y-2">
                {MODULE_LIST.map(({ key, label, description, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-indigo-300 flex-shrink-0" />
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModule(key)}
                      disabled={modulesLoading || moduleSaving === key}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 disabled:opacity-50 ${modules[key] !== false ? 'bg-indigo-600' : 'bg-gray-500/50'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${modules[key] !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
                Reset to Default
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

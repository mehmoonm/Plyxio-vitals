'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase/client';
import { useAuth } from './auth-context';

export interface BrandSettings {
  primaryColor: string;
  accentColor: string;
  logo: string | null;
  hospitalName: string;
  theme: 'light' | 'dark' | 'system';
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  allowBillingClerkInvoiceEdit: boolean;
}

const defaultSettings: BrandSettings = {
  primaryColor: '#6366f1',
  accentColor: '#06b6d4',
  logo: null,
  hospitalName: 'PLYXIO Vitals',
  theme: 'dark',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: '',
  allowBillingClerkInvoiceEdit: false,
};

interface SettingsContextType {
  settings: BrandSettings;
  updateSettings: (settings: Partial<BrandSettings>) => Promise<{ error?: string } | void>;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BrandSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const html = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.toggle('dark', isDark);
      html.classList.toggle('light', !isDark);
    } else if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  };

  const applyColors = (primaryColor: string, accentColor: string) => {
    document.documentElement.style.setProperty('--primary', primaryColor);
    document.documentElement.style.setProperty('--accent', accentColor);
  };

  // Theme is a personal, per-browser preference -- stays in localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('themePreference') as BrandSettings['theme'] | null;
    applyTheme(savedTheme || 'dark');
    if (savedTheme) setSettings((s) => ({ ...s, theme: savedTheme }));
  }, []);

  // Branding/contact info is per-hospital -- lives in the database so
  // every staff member (and generated documents) sees the same thing
  const loadHospitalProfile = useCallback(async () => {
    if (!user?.hospitalId) { setMounted(true); return; }
    const { data } = await supabase
      .from('Hospital')
      .select('name, logoUrl, primaryColor, accentColor, phone, email, address, city, country, allowBillingClerkInvoiceEdit')
      .eq('id', user.hospitalId)
      .single();

    if (data) {
      const merged: Partial<BrandSettings> = {
        hospitalName: data.name || defaultSettings.hospitalName,
        logo: data.logoUrl || null,
        primaryColor: data.primaryColor || defaultSettings.primaryColor,
        accentColor: data.accentColor || defaultSettings.accentColor,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        country: data.country || '',
        allowBillingClerkInvoiceEdit: !!data.allowBillingClerkInvoiceEdit,
      };
      setSettings((s) => ({ ...s, ...merged }));
      applyColors(merged.primaryColor!, merged.accentColor!);
    }
    setMounted(true);
  }, [user?.hospitalId]);

  useEffect(() => { loadHospitalProfile(); }, [loadHospitalProfile]);

  const updateSettings = async (newSettings: Partial<BrandSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (newSettings.theme) {
      localStorage.setItem('themePreference', newSettings.theme);
      applyTheme(newSettings.theme);
    }

    const hospitalFields: Record<string, any> = {};
    if (newSettings.hospitalName !== undefined) hospitalFields.name = newSettings.hospitalName;
    if (newSettings.logo !== undefined) hospitalFields.logoUrl = newSettings.logo;
    if (newSettings.primaryColor !== undefined) hospitalFields.primaryColor = newSettings.primaryColor;
    if (newSettings.accentColor !== undefined) hospitalFields.accentColor = newSettings.accentColor;
    if (newSettings.phone !== undefined) hospitalFields.phone = newSettings.phone;
    if (newSettings.email !== undefined) hospitalFields.email = newSettings.email;
    if (newSettings.address !== undefined) hospitalFields.address = newSettings.address;
    if (newSettings.city !== undefined) hospitalFields.city = newSettings.city;
    if (newSettings.country !== undefined) hospitalFields.country = newSettings.country;
    if (newSettings.allowBillingClerkInvoiceEdit !== undefined) hospitalFields.allowBillingClerkInvoiceEdit = newSettings.allowBillingClerkInvoiceEdit;

    if (newSettings.primaryColor || newSettings.accentColor) {
      applyColors(updated.primaryColor, updated.accentColor);
    }

    if (Object.keys(hospitalFields).length > 0 && user?.hospitalId) {
      const { error } = await supabase.from('Hospital').update(hospitalFields).eq('id', user.hospitalId);
      if (error) return { error: error.message };
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('themePreference');
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--accent');
    applyTheme(defaultSettings.theme);
  };

  if (!mounted) return <>{children}</>;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      <style>{`
        :root {
          --primary: ${settings.primaryColor};
          --accent: ${settings.accentColor};
        }
      `}</style>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

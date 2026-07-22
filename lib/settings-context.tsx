'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BrandSettings {
  primaryColor: string;
  accentColor: string;
  logo: string | null;
  hospitalName: string;
  theme: 'light' | 'dark' | 'system';
}

const defaultSettings: BrandSettings = {
  primaryColor: '#6366f1',
  accentColor: '#06b6d4',
  logo: null,
  hospitalName: 'MediCare',
  theme: 'dark',
};

interface SettingsContextType {
  settings: BrandSettings;
  updateSettings: (settings: Partial<BrandSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrandSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('hospitalSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        applyTheme(parsed.theme || 'dark');
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    } else {
      applyTheme('dark');
    }
    setMounted(true);
  }, []);

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

  const updateSettings = (newSettings: Partial<BrandSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('hospitalSettings', JSON.stringify(updated));
    
    // Apply colors to the actual theme variables the app reads
    // (--primary / --accent, mapped in globals.css's @theme block and
    // consumed by the Button component and .gradient-primary class)
    if (newSettings.primaryColor) {
      document.documentElement.style.setProperty('--primary', newSettings.primaryColor);
    }
    if (newSettings.accentColor) {
      document.documentElement.style.setProperty('--accent', newSettings.accentColor);
    }
    
    // Apply theme
    if (newSettings.theme) {
      applyTheme(newSettings.theme);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('hospitalSettings');
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

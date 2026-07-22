'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase/client';
import { useAuth } from './auth-context';

export type ModuleKey = 'admissions' | 'lab' | 'radiology' | 'inventory' | 'billing' | 'messaging';

const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  admissions: true,
  lab: true,
  radiology: true,
  inventory: true,
  billing: true,
  messaging: true,
};

interface ModulesContextType {
  modules: Record<ModuleKey, boolean>;
  loading: boolean;
  isEnabled: (key: ModuleKey) => boolean;
  updateModules: (updates: Partial<Record<ModuleKey, boolean>>) => Promise<{ error?: string }>;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.hospitalId) { setLoading(false); return; }
    const { data } = await supabase.from('Hospital').select('enabledModules').eq('id', user.hospitalId).single();
    if (data?.enabledModules) {
      setModules({ ...DEFAULT_MODULES, ...data.enabledModules });
    }
    setLoading(false);
  }, [user?.hospitalId]);

  useEffect(() => { load(); }, [load]);

  const isEnabled = (key: ModuleKey) => modules[key] !== false;

  const updateModules = async (updates: Partial<Record<ModuleKey, boolean>>) => {
    if (!user?.hospitalId) return { error: 'No hospital context' };
    const next = { ...modules, ...updates };
    const { error } = await supabase.from('Hospital').update({ enabledModules: next }).eq('id', user.hospitalId);
    if (error) return { error: error.message };
    setModules(next);
    return {};
  };

  return (
    <ModulesContext.Provider value={{ modules, loading, isEnabled, updateModules }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModulesContext);
  if (context === undefined) throw new Error('useModules must be used within ModulesProvider');
  return context;
}

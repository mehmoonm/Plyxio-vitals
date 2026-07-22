'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useModules, type ModuleKey } from '@/lib/hospital-modules-context';

export function ModuleGuard({ moduleKey, children }: { moduleKey: ModuleKey; children: React.ReactNode }) {
  const router = useRouter();
  const { isEnabled, loading } = useModules();

  useEffect(() => {
    if (!loading && !isEnabled(moduleKey)) {
      router.replace('/dashboard');
    }
  }, [loading, moduleKey, isEnabled, router]);

  if (loading) return null;
  if (!isEnabled(moduleKey)) return null;

  return <>{children}</>;
}

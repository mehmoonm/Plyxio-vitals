'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageConsent } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Plus } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  SURGERY: 'Surgery',
  PROCEDURE: 'Procedure',
  ADMISSION: 'Admission',
  ANESTHESIA: 'Anesthesia',
  GENERAL: 'General',
};

export default function ConsentFormsPage() {
  const { user } = useAuth();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ConsentForm')
        .select('*, Patient(fullName, mrn)')
        .order('createdAt', { ascending: false });
      setForms(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
            <FileSignature className="w-7 h-7 text-indigo-300" />Consent Forms
          </h1>
          <p className="text-gray-400 mt-2">Signed consent for surgeries, procedures, and admissions</p>
        </div>
        {canManageConsent(user?.role) && (
          <Link href="/dashboard/consent-forms/new">
            <Button className="gap-2 gradient-primary"><Plus className="w-4 h-4" />New Consent Form</Button>
          </Link>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : forms.length === 0 ? (
          <p className="text-gray-400 p-6">No consent forms recorded yet</p>
        ) : (
          <div className="divide-y divide-white/10">
            {forms.map((f) => (
              <div key={f.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{f.title}</p>
                  <p className="text-xs text-gray-400">{f.Patient?.fullName} ({f.Patient?.mrn}) • {new Date(f.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-100 text-indigo-800">{TYPE_LABELS[f.type] || f.type}</Badge>
                  <Badge className={f.signedAt ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>{f.signedAt ? 'Signed' : 'Pending'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

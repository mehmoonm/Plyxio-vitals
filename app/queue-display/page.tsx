'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function QueueDisplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <QueueDisplayContent />
    </Suspense>
  );
}

function QueueDisplayContent() {
  const searchParams = useSearchParams();
  const hospitalId = searchParams.get('hospitalId');
  const [tokens, setTokens] = useState<any[]>([]);
  const [hospitalName, setHospitalName] = useState('');

  useEffect(() => {
    if (!hospitalId) return;

    const load = async () => {
      const [tokensRes, hospRes] = await Promise.all([
        supabase.from('public_queue_display').select('*').eq('hospitalId', hospitalId).order('tokenNumber'),
        supabase.from('public_hospital_branding').select('name').eq('id', hospitalId).single(),
      ]);
      setTokens(tokensRes.data || []);
      setHospitalName(hospRes.data?.name || '');
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [hospitalId]);

  if (!hospitalId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p>Missing hospital ID in URL (?hospitalId=...)</p>
      </div>
    );
  }

  const nowServing = tokens.filter((t) => t.status === 'CALLED' || t.status === 'IN_PROGRESS');
  const waiting = tokens.filter((t) => t.status === 'WAITING');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 sm:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-300">{hospitalName || 'Queue'}</h1>

        <div>
          <p className="text-xl sm:text-2xl font-semibold text-indigo-300 text-center mb-6">Now Serving</p>
          {nowServing.length === 0 ? (
            <p className="text-center text-slate-500 text-xl">—</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {nowServing.map((t) => (
                <div key={t.id} className="bg-indigo-600/20 border-2 border-indigo-500 rounded-3xl p-8 text-center">
                  <p className="text-6xl font-bold text-white">#{t.tokenNumber}</p>
                  {t.displayName && <p className="text-lg text-indigo-200 mt-2">{t.displayName}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-lg font-semibold text-slate-400 text-center mb-4">Waiting ({waiting.length})</p>
          <div className="flex flex-wrap justify-center gap-3">
            {waiting.map((t) => (
              <div key={t.id} className="bg-white/5 rounded-xl px-5 py-3 text-2xl font-semibold text-slate-300">
                #{t.tokenNumber}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

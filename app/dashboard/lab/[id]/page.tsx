'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageLab } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';

const STATUS_FLOW = ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'RESULT_READY'];

export default function LabOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Record<string, { result: string; resultUnit: string; isAbnormal: boolean; resultNotes: string }>>({});

  const load = async () => {
    const { data } = await supabase
      .from('LabOrder')
      .select('*, Patient(fullName, mrn), User(fullName), LabOrderItem(*, LabTestCatalog(name, sampleType, normalRange))')
      .eq('id', params.id)
      .single();
    setOrder(data);
    if (data) {
      const initial: any = {};
      for (const item of data.LabOrderItem || []) {
        initial[item.id] = {
          result: item.result || '',
          resultUnit: item.resultUnit || '',
          isAbnormal: item.isAbnormal || false,
          resultNotes: item.resultNotes || '',
        };
      }
      setResults(initial);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const advanceStatus = async (status: string) => {
    setBusy(true);
    await supabase.from('LabOrder').update({ status }).eq('id', params.id);
    await load();
    setBusy(false);
  };

  const saveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    for (const item of order.LabOrderItem) {
      const r = results[item.id];
      const { error: updateError } = await supabase
        .from('LabOrderItem')
        .update({
          result: r.result || null,
          resultUnit: r.resultUnit || null,
          isAbnormal: r.isAbnormal,
          resultNotes: r.resultNotes || null,
          resultedAt: new Date().toISOString(),
          resultedById: user?.id,
        })
        .eq('id', item.id);
      if (updateError) { setError(updateError.message); setBusy(false); return; }
    }

    await supabase.from('LabOrder').update({ status: 'RESULT_READY' }).eq('id', params.id);
    setBusy(false);
    await load();
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!order) return <p className="text-gray-400">Lab order not found</p>;

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/lab">
        <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Lab Orders</Button>
      </Link>

      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{order.Patient?.fullName}</h1>
            <p className="text-gray-400 mt-1">MRN: {order.Patient?.mrn} • Ordered by Dr. {order.User?.fullName}</p>
          </div>
          <Badge className="bg-blue-100 text-blue-800">{order.status.replace('_', ' ')}</Badge>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        {canManageLab(user?.role) && order.status !== 'RESULT_READY' && order.status !== 'CANCELLED' && nextStatus && nextStatus !== 'RESULT_READY' && (
          <Button onClick={() => advanceStatus(nextStatus)} disabled={busy} variant="outline" className="gap-2 text-cyan-300 border-cyan-400/50">
            <CheckCircle className="w-4 h-4" />Mark as {nextStatus.replace('_', ' ')}
          </Button>
        )}

        {canManageLab(user?.role) && (order.status === 'IN_PROGRESS' || order.status === 'SAMPLE_COLLECTED') && (
          <form onSubmit={saveResults} className="pt-4 border-t border-white/10 space-y-4">
            <h3 className="font-semibold text-white">Enter Results</h3>
            {order.LabOrderItem.map((item: any) => (
              <div key={item.id} className="bg-white/5 rounded-lg p-4 space-y-2">
                <p className="text-white font-medium text-sm">{item.LabTestCatalog?.name} {item.LabTestCatalog?.normalRange ? <span className="text-gray-400 font-normal">(Normal: {item.LabTestCatalog.normalRange})</span> : ''}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input placeholder="Result" value={results[item.id]?.result || ''} onChange={(e) => setResults({ ...results, [item.id]: { ...results[item.id], result: e.target.value } })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                  <input placeholder="Unit" value={results[item.id]?.resultUnit || ''} onChange={(e) => setResults({ ...results, [item.id]: { ...results[item.id], resultUnit: e.target.value } })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                </div>
                <input placeholder="Notes (optional)" value={results[item.id]?.resultNotes || ''} onChange={(e) => setResults({ ...results, [item.id]: { ...results[item.id], resultNotes: e.target.value } })} className="glass-input w-full px-3 py-2 rounded-lg text-white text-sm" />
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={results[item.id]?.isAbnormal || false} onChange={(e) => setResults({ ...results, [item.id]: { ...results[item.id], isAbnormal: e.target.checked } })} className="w-4 h-4" />
                  Abnormal result
                </label>
              </div>
            ))}
            <Button type="submit" disabled={busy} className="gap-2 gradient-primary"><Save className="w-4 h-4" />{busy ? 'Saving...' : 'Save Results & Complete'}</Button>
          </form>
        )}

        {order.status === 'RESULT_READY' && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="font-semibold text-white">Results</h3>
            {order.LabOrderItem.map((item: any) => (
              <div key={item.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium text-sm">{item.LabTestCatalog?.name}</p>
                  {item.isAbnormal && <Badge className="bg-red-100 text-red-800">Abnormal</Badge>}
                </div>
                <p className="text-gray-300 text-sm mt-1">{item.result} {item.resultUnit} {item.LabTestCatalog?.normalRange ? `(Normal: ${item.LabTestCatalog.normalRange})` : ''}</p>
                {item.resultNotes && <p className="text-xs text-gray-400 mt-1">{item.resultNotes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

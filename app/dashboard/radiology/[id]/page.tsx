'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageRadiology } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';

const STATUS_FLOW = ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'RESULT_READY'];

export default function RadiologyOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState({ findings: '', impression: '', imageUrl: '' });

  const load = async () => {
    const { data } = await supabase
      .from('RadiologyOrder')
      .select('*, Patient(fullName, mrn), User(fullName), RadiologyReport(*)')
      .eq('id', params.id)
      .single();
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const advanceStatus = async (status: string) => {
    setBusy(true);
    await supabase.from('RadiologyOrder').update({ status }).eq('id', params.id);
    await load();
    setBusy(false);
  };

  const saveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const { error: reportError } = await supabase.from('RadiologyReport').insert({
      radiologyOrderId: params.id,
      findings: report.findings || null,
      impression: report.impression || null,
      imageUrl: report.imageUrl || null,
      reportedById: user?.id,
      reportedAt: new Date().toISOString(),
    });

    if (reportError) { setError(reportError.message); setBusy(false); return; }

    await supabase.from('RadiologyOrder').update({ status: 'RESULT_READY' }).eq('id', params.id);
    setBusy(false);
    await load();
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!order) return <p className="text-gray-400">Radiology order not found</p>;

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
  const hasReport = order.RadiologyReport?.length > 0;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/radiology">
        <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Radiology</Button>
      </Link>

      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{order.Patient?.fullName}</h1>
            <p className="text-gray-400 mt-1">MRN: {order.Patient?.mrn} • Ordered by Dr. {order.User?.fullName}</p>
            <p className="text-gray-400 text-sm mt-1">{order.studyType} {order.bodyPart ? `— ${order.bodyPart}` : ''}</p>
          </div>
          <Badge className="bg-blue-100 text-blue-800">{order.status.replace('_', ' ')}</Badge>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        {canManageRadiology(user?.role) && order.status !== 'RESULT_READY' && order.status !== 'CANCELLED' && nextStatus && nextStatus !== 'RESULT_READY' && (
          <Button onClick={() => advanceStatus(nextStatus)} disabled={busy} variant="outline" className="gap-2 text-cyan-300 border-cyan-400/50">
            <CheckCircle className="w-4 h-4" />Mark as {nextStatus.replace('_', ' ')}
          </Button>
        )}

        {canManageRadiology(user?.role) && !hasReport && (order.status === 'IN_PROGRESS' || order.status === 'SAMPLE_COLLECTED') && (
          <form onSubmit={saveReport} className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="font-semibold text-white">Radiology Report</h3>
            <textarea placeholder="Findings" value={report.findings} onChange={(e) => setReport({ ...report, findings: e.target.value })} rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
            <textarea placeholder="Impression" value={report.impression} onChange={(e) => setReport({ ...report, impression: e.target.value })} rows={2} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
            <input placeholder="Image URL (optional)" value={report.imageUrl} onChange={(e) => setReport({ ...report, imageUrl: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Button type="submit" disabled={busy} className="gap-2 gradient-primary"><Save className="w-4 h-4" />{busy ? 'Saving...' : 'Save Report & Complete'}</Button>
          </form>
        )}

        {hasReport && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="font-semibold text-white">Report</h3>
            {order.RadiologyReport.map((r: any) => (
              <div key={r.id} className="bg-white/5 rounded-lg p-4 space-y-2">
                {r.findings && <div><p className="text-xs text-gray-400">Findings</p><p className="text-white text-sm">{r.findings}</p></div>}
                {r.impression && <div><p className="text-xs text-gray-400">Impression</p><p className="text-white text-sm">{r.impression}</p></div>}
                {r.imageUrl && <a href={r.imageUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 text-sm underline">View Image</a>}
                <p className="text-xs text-gray-400">{new Date(r.reportedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

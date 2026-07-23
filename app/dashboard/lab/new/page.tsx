'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { canManageLab } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';

export default function NewLabOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [priority, setPriority] = useState('ROUTINE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([
        supabase.from('Patient').select('id, fullName, mrn').order('fullName'),
        supabase.from('LabTestCatalog').select('*').order('name'),
      ]);
      setPatients(p.data || []);
      setTests(t.data || []);
    })();
  }, []);

  const toggleTest = (id: string) => {
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || selectedTests.length === 0) {
      setError('Select a patient and at least one test.');
      return;
    }
    setLoading(true);
    setError('');

    const { data: order, error: orderError } = await supabase
      .from('LabOrder')
      .insert({
        hospitalId: user?.hospitalId,
        patientId,
        orderedById: user?.id,
        status: 'ORDERED',
        orderedAt: new Date().toISOString(),
        priority,
      })
      .select()
      .single();

    if (orderError || !order) { setError(orderError?.message || 'Failed to create order'); setLoading(false); return; }

    const { error: itemsError } = await supabase.from('LabOrderItem').insert(
      selectedTests.map((testId) => ({ labOrderId: order.id, labTestId: testId }))
    );

    setLoading(false);
    if (itemsError) { setError(itemsError.message); return; }
    router.push(`/dashboard/lab/${order.id}`);
  };

  return (
    <RoleGuard allowed={canManageLab(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-gradient">New Lab Order</h1>
          <p className="text-gray-400 mt-2">Order diagnostic tests for a patient</p>
        </div>
        <Link href="/dashboard/lab">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-5 max-w-xl">
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Patient *</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="" className="text-black">Select a patient</option>
            {patients.map((p) => <option key={p.id} value={p.id} className="text-black">{p.fullName} ({p.mrn})</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-white">
            <option value="ROUTINE" className="text-black">Routine</option>
            <option value="URGENT" className="text-black">Urgent</option>
            <option value="STAT" className="text-black">STAT</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-200 block mb-2">Tests *</label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tests.map((t) => (
              <label key={t.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 cursor-pointer hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedTests.includes(t.id)} onChange={() => toggleTest(t.id)} className="w-4 h-4" />
                  <div>
                    <p className="text-white text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.sampleType} {t.normalRange ? `• Normal: ${t.normalRange}` : ''}</p>
                  </div>
                </div>
                {t.price && <span className="text-xs text-gray-400">Rs {Number(t.price).toLocaleString()}</span>}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={loading} className="gap-2 gradient-primary">
          <Save className="w-4 h-4" />{loading ? 'Ordering...' : 'Place Order'}
        </Button>
      </form>
    </div>
    </RoleGuard>
  );
}

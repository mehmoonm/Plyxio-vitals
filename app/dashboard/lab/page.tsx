'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageLab } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FlaskConical } from 'lucide-react';

export default function LabOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('LabOrder')
        .select('*, Patient(fullName, mrn), User(fullName), LabOrderItem(id, LabTestCatalog(name))')
        .order('orderedAt', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'ORDERED': return 'bg-blue-100 text-blue-800';
      case 'SAMPLE_COLLECTED': return 'bg-amber-100 text-amber-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'RESULT_READY': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-gradient">Lab Orders</h1>
          <p className="text-gray-400 mt-2">Test orders and results</p>
        </div>
        {canManageLab(user?.role) && (
          <Link href="/dashboard/lab/new">
            <Button className="gap-2 gradient-primary"><Plus className="w-4 h-4" />New Lab Order</Button>
          </Link>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-400 p-6 flex items-center gap-2"><FlaskConical className="w-4 h-4" />No lab orders yet</p>
        ) : (
          <div className="divide-y divide-white/10">
            {orders.map((o) => (
              <div key={o.id} onClick={() => router.push(`/dashboard/lab/${o.id}`)} className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                <div>
                  <p className="text-white font-medium">{o.Patient?.fullName} <span className="text-gray-400 text-xs">({o.Patient?.mrn})</span></p>
                  <p className="text-xs text-gray-400">
                    Dr. {o.User?.fullName} • {(o.LabOrderItem || []).map((i: any) => i.LabTestCatalog?.name).join(', ')} • {new Date(o.orderedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-gray-300 border-gray-500">{o.priority}</Badge>
                  <Badge className={statusColor(o.status)}>{o.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

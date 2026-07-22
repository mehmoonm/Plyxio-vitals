'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/permissions';
import { Input } from '@/components/ui/input';
import { ShieldCheck } from 'lucide-react';

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('AuditLog')
        .select('*, User(fullName, role)')
        .order('createdAt', { ascending: false })
        .limit(200);
      setLogs(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.entityType?.toLowerCase().includes(q) ||
      l.User?.fullName?.toLowerCase().includes(q)
    );
  });

  if (!isAdmin(user?.role)) {
    return <div className="text-gray-400">This page is only available to hospital admins.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-indigo-300" />Audit Log
        </h1>
        <p className="text-gray-400 mt-2">Recent activity across your hospital's account (last 200 entries)</p>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <Input placeholder="Search by action, entity type, or staff name…" value={search} onChange={(e) => setSearch(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 p-6">No matching activity found</p>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{log.action?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {log.User?.fullName ? `${log.User.fullName} (${log.User.role?.replace('_', ' ')})` : 'System'}
                    {log.entityType && ` • ${log.entityType}`}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{JSON.stringify(log.metadata)}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

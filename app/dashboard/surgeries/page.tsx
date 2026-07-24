'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageSurgery, isAdmin } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Scissors, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function SurgeriesPage() {
  const { user } = useAuth();
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTheatres, setShowTheatres] = useState(false);
  const [newTheatreName, setNewTheatreName] = useState('');

  const load = async () => {
    const [s, t] = await Promise.all([
      supabase.from('Surgery').select('*, Patient(fullName, mrn), User(fullName), OperationTheatre(name)').order('scheduledStart', { ascending: false }),
      supabase.from('OperationTheatre').select('*').order('name'),
    ]);
    setSurgeries(s.data || []);
    setTheatres(t.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('Surgery').update({ status }).eq('id', id);
    await load();
  };

  const addTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTheatreName.trim()) return;
    await supabase.from('OperationTheatre').insert({ hospitalId: user?.hospitalId, name: newTheatreName.trim() });
    setNewTheatreName('');
    await load();
  };

  const deleteTheatre = async (id: string) => {
    if (!confirm('Delete this theatre?')) return;
    await supabase.from('OperationTheatre').delete().eq('id', id);
    await load();
  };

  const upcoming = surgeries.filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS');
  const past = surgeries.filter((s) => s.status === 'COMPLETED' || s.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
            <Scissors className="w-7 h-7 text-indigo-300" />Operation Theatre
          </h1>
          <p className="text-gray-400 mt-2">Surgery scheduling and theatre management</p>
        </div>
        {canManageSurgery(user?.role) && (
          <Link href="/dashboard/surgeries/new">
            <Button className="gap-2 gradient-primary"><Plus className="w-4 h-4" />Schedule Surgery</Button>
          </Link>
        )}
      </div>

      {isAdmin(user?.role) && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <button onClick={() => setShowTheatres((v) => !v)} className="w-full flex items-center justify-between p-4">
            <span className="font-semibold text-white">Theatres ({theatres.length})</span>
            {showTheatres ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showTheatres && (
            <div className="px-4 pb-4 space-y-3">
              <form onSubmit={addTheatre} className="flex gap-2">
                <Input placeholder="Theatre name (e.g. OT-1)" value={newTheatreName} onChange={(e) => setNewTheatreName(e.target.value)} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                <Button type="submit" size="sm" className="gradient-primary">Add</Button>
              </form>
              <div className="divide-y divide-white/10">
                {theatres.map((t) => (
                  <div key={t.id} className="py-2 flex items-center justify-between">
                    <span className="text-white text-sm">{t.name}</span>
                    <button onClick={() => deleteTheatre(t.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-semibold text-white">Upcoming</h2>
        </div>
        {loading ? (
          <p className="text-gray-400 p-6 text-sm">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-gray-400 p-6 text-sm">No upcoming surgeries scheduled</p>
        ) : (
          <div className="divide-y divide-white/10">
            {upcoming.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-white font-medium">{s.procedureName} — {s.Patient?.fullName}</p>
                  <p className="text-xs text-gray-400">
                    {s.OperationTheatre?.name} • Dr. {s.User?.fullName} • {new Date(s.scheduledStart).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[s.status]}>{s.status.replace('_', ' ')}</Badge>
                  {canManageSurgery(user?.role) && (
                    <select value={s.status} onChange={(e) => updateStatus(s.id, e.target.value)} className="glass-input px-2 py-1.5 rounded-lg text-white text-xs">
                      <option value="SCHEDULED" className="text-black">Scheduled</option>
                      <option value="IN_PROGRESS" className="text-black">In Progress</option>
                      <option value="COMPLETED" className="text-black">Completed</option>
                      <option value="CANCELLED" className="text-black">Cancelled</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Past</h2>
          </div>
          <div className="divide-y divide-white/10">
            {past.slice(0, 20).map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{s.procedureName} — {s.Patient?.fullName}</p>
                  <p className="text-xs text-gray-400">{s.OperationTheatre?.name} • Dr. {s.User?.fullName} • {new Date(s.scheduledStart).toLocaleDateString()}</p>
                </div>
                <Badge className={STATUS_COLORS[s.status]}>{s.status.replace('_', ' ')}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

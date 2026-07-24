'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/permissions';
import { notify } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wrench, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: 'bg-green-100 text-green-800',
  UNDER_MAINTENANCE: 'bg-amber-100 text-amber-800',
  OUT_OF_SERVICE: 'bg-red-100 text-red-800',
  RETIRED: 'bg-gray-200 text-gray-700',
};

export default function EquipmentPage() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', serialNumber: '', location: '', purchaseDate: '', nextMaintenanceDate: '' });
  const [maintForm, setMaintForm] = useState({ description: '', performedBy: '', cost: '', nextDueDate: '' });
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await supabase.from('Equipment').select('*, MaintenanceLog(*)').order('name');
    setEquipment(data || []);
    setLoading(false);

    // Notify admins once per day about equipment maintenance due within 7 days
    const now = new Date();
    const soon = new Date();
    soon.setDate(now.getDate() + 7);
    const dueSoon = (data || []).filter((e: any) => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) <= soon);
    if (dueSoon.length > 0 && user?.hospitalId) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: existing } = await supabase
        .from('Notification')
        .select('id')
        .eq('type', 'MAINTENANCE_DUE')
        .eq('targetRole', 'HOSPITAL_ADMIN')
        .gte('createdAt', todayStart.toISOString())
        .limit(1);
      if (!existing || existing.length === 0) {
        notify({
          hospitalId: user.hospitalId,
          targetRole: 'HOSPITAL_ADMIN',
          type: 'MAINTENANCE_DUE',
          title: `${dueSoon.length} equipment maintenance due soon`,
          message: dueSoon.slice(0, 3).map((e: any) => e.name).join(', '),
          link: '/dashboard/equipment',
        });
      }
    }
  };

  useEffect(() => { load(); }, [user?.hospitalId]);

  const addEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Equipment name is required.'); return; }
    setError('');
    await supabase.from('Equipment').insert({
      hospitalId: user?.hospitalId,
      name: form.name.trim(),
      category: form.category || null,
      serialNumber: form.serialNumber || null,
      location: form.location || null,
      purchaseDate: form.purchaseDate || null,
      nextMaintenanceDate: form.nextMaintenanceDate || null,
    });
    setForm({ name: '', category: '', serialNumber: '', location: '', purchaseDate: '', nextMaintenanceDate: '' });
    setShowAddForm(false);
    await load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('Equipment').update({ status }).eq('id', id);
    await load();
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm('Delete this equipment record?')) return;
    await supabase.from('Equipment').delete().eq('id', id);
    await load();
  };

  const logMaintenance = async (equipmentId: string) => {
    if (!maintForm.description.trim()) { setError('Describe what was done.'); return; }
    setError('');
    await supabase.from('MaintenanceLog').insert({
      hospitalId: user?.hospitalId,
      equipmentId,
      description: maintForm.description.trim(),
      performedBy: maintForm.performedBy || null,
      cost: maintForm.cost ? Number(maintForm.cost) : null,
      nextDueDate: maintForm.nextDueDate || null,
      createdById: user?.id,
    });
    await supabase.from('Equipment').update({
      lastMaintenanceDate: new Date().toISOString().slice(0, 10),
      nextMaintenanceDate: maintForm.nextDueDate || null,
      status: 'OPERATIONAL',
    }).eq('id', equipmentId);
    setMaintForm({ description: '', performedBy: '', cost: '', nextDueDate: '' });
    await load();
  };

  const isDueSoon = (date: string | null) => {
    if (!date) return false;
    const due = new Date(date);
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return due <= soon;
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
            <Wrench className="w-7 h-7 text-indigo-300" />Equipment & Assets
          </h1>
          <p className="text-gray-400 mt-2">X-ray machines, ventilators, and other equipment with maintenance tracking</p>
        </div>
        {isAdmin(user?.role) && (
          <Button onClick={() => setShowAddForm((v) => !v)} className="gap-2 gradient-primary"><Plus className="w-4 h-4" />Add Equipment</Button>
        )}
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

      {showAddForm && (
        <form onSubmit={addEquipment} className="glass-card rounded-2xl p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Equipment name (e.g. X-Ray Machine)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <Input placeholder="Serial number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <Input type="date" placeholder="Purchase date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <Input type="date" placeholder="Next maintenance due" value={form.nextMaintenanceDate} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="gradient-primary">Save</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {equipment.length === 0 ? (
          <div className="glass-card rounded-2xl p-6"><p className="text-gray-400">No equipment recorded yet.</p></div>
        ) : (
          equipment.map((eq) => (
            <div key={eq.id} className="glass-card rounded-2xl overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === eq.id ? null : eq.id)} className="w-full p-4 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-white font-semibold">{eq.name}</p>
                  <p className="text-xs text-gray-400">
                    {eq.category || 'No category'}{eq.location ? ` • ${eq.location}` : ''}{eq.serialNumber ? ` • SN: ${eq.serialNumber}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isDueSoon(eq.nextMaintenanceDate) && eq.status === 'OPERATIONAL' && (
                    <Badge className="bg-amber-100 text-amber-800">Maintenance Due</Badge>
                  )}
                  <Badge className={STATUS_COLORS[eq.status]}>{eq.status.replace(/_/g, ' ')}</Badge>
                  {expandedId === eq.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {expandedId === eq.id && (
                <div className="px-4 pb-4 space-y-3 bg-white/5">
                  <div className="flex items-center gap-2 flex-wrap pt-3">
                    {isAdmin(user?.role) && (
                      <>
                        <select value={eq.status} onChange={(e) => updateStatus(eq.id, e.target.value)} className="glass-input px-2 py-1.5 rounded-lg text-white text-xs">
                          <option value="OPERATIONAL" className="text-black">Operational</option>
                          <option value="UNDER_MAINTENANCE" className="text-black">Under Maintenance</option>
                          <option value="OUT_OF_SERVICE" className="text-black">Out of Service</option>
                          <option value="RETIRED" className="text-black">Retired</option>
                        </select>
                        <button onClick={() => deleteEquipment(eq.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-gray-400">
                    Last maintenance: {eq.lastMaintenanceDate ? new Date(eq.lastMaintenanceDate).toLocaleDateString() : 'None recorded'}
                    {eq.nextMaintenanceDate ? ` • Next due: ${new Date(eq.nextMaintenanceDate).toLocaleDateString()}` : ''}
                  </p>

                  {isAdmin(user?.role) && (
                    <div className="bg-white/5 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-300">Log Maintenance</p>
                      <Input placeholder="What was done" value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Performed by" value={maintForm.performedBy} onChange={(e) => setMaintForm({ ...maintForm, performedBy: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                        <Input type="number" placeholder="Cost" value={maintForm.cost} onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                        <Input type="date" placeholder="Next due" value={maintForm.nextDueDate} onChange={(e) => setMaintForm({ ...maintForm, nextDueDate: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                      </div>
                      <Button size="sm" onClick={() => logMaintenance(eq.id)} className="gradient-primary">Save Log Entry</Button>
                    </div>
                  )}

                  {(eq.MaintenanceLog || []).length > 0 && (
                    <div className="divide-y divide-white/10">
                      {eq.MaintenanceLog.sort((a: any, b: any) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()).map((log: any) => (
                        <div key={log.id} className="py-2 text-sm">
                          <p className="text-white">{log.description}</p>
                          <p className="text-xs text-gray-400">{new Date(log.performedAt).toLocaleDateString()}{log.performedBy ? ` • ${log.performedBy}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

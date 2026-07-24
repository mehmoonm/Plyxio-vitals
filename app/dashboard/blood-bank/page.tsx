'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageBloodBank } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Droplet, Plus } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const UNIT_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  RESERVED: 'bg-blue-100 text-blue-800',
  USED: 'bg-gray-200 text-gray-700',
  EXPIRED: 'bg-red-100 text-red-800',
  DISCARDED: 'bg-red-100 text-red-800',
};

const REQUEST_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  FULFILLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

export default function BloodBankPage() {
  const { user } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [unitForm, setUnitForm] = useState({ bloodGroup: 'O+', donorName: '', expiryDate: '', volumeMl: '450' });
  const [requestForm, setRequestForm] = useState({ patientId: '', bloodGroup: 'O+', unitsRequested: '1', urgency: 'ROUTINE', notes: '' });
  const [error, setError] = useState('');

  const load = async () => {
    const [u, r, p] = await Promise.all([
      supabase.from('BloodUnit').select('*').order('expiryDate'),
      supabase.from('BloodRequest').select('*, Patient(fullName, mrn)').order('requestedAt', { ascending: false }),
      supabase.from('Patient').select('id, fullName, mrn').order('fullName'),
    ]);
    setUnits(u.data || []);
    setRequests(r.data || []);
    setPatients(p.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.expiryDate) { setError('Expiry date is required.'); return; }
    setError('');
    await supabase.from('BloodUnit').insert({
      hospitalId: user?.hospitalId,
      bloodGroup: unitForm.bloodGroup,
      donorName: unitForm.donorName || null,
      expiryDate: unitForm.expiryDate,
      volumeMl: Number(unitForm.volumeMl),
    });
    setUnitForm({ bloodGroup: 'O+', donorName: '', expiryDate: '', volumeMl: '450' });
    setShowAddUnit(false);
    await load();
  };

  const updateUnitStatus = async (id: string, status: string) => {
    await supabase.from('BloodUnit').update({ status }).eq('id', id);
    await load();
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.patientId) { setError('Select a patient.'); return; }
    setError('');
    await supabase.from('BloodRequest').insert({
      hospitalId: user?.hospitalId,
      patientId: requestForm.patientId,
      bloodGroup: requestForm.bloodGroup,
      unitsRequested: Number(requestForm.unitsRequested),
      urgency: requestForm.urgency,
      notes: requestForm.notes || null,
      requestedById: user?.id,
    });
    setRequestForm({ patientId: '', bloodGroup: 'O+', unitsRequested: '1', urgency: 'ROUTINE', notes: '' });
    setShowRequestForm(false);
    await load();
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'FULFILLED') updates.fulfilledAt = new Date().toISOString();
    await supabase.from('BloodRequest').update(updates).eq('id', id);
    await load();
  };

  const inventoryByGroup = BLOOD_GROUPS.map((g) => ({
    group: g,
    count: units.filter((u) => u.bloodGroup === g && u.status === 'AVAILABLE').length,
  }));

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
          <Droplet className="w-7 h-7 text-red-400" />Blood Bank
        </h1>
        <p className="text-gray-400 mt-2">Blood unit inventory and request management</p>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {inventoryByGroup.map((g) => (
          <div key={g.group} className="glass-card rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-white">{g.group}</p>
            <p className={`text-2xl font-bold ${g.count === 0 ? 'text-red-400' : g.count < 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{g.count}</p>
            <p className="text-xs text-gray-500">units</p>
          </div>
        ))}
      </div>

      {canManageBloodBank(user?.role) && (
        <div className="flex gap-2">
          <Button onClick={() => setShowAddUnit((v) => !v)} variant="outline" className="gap-2"><Plus className="w-4 h-4" />Add Blood Unit</Button>
          <Button onClick={() => setShowRequestForm((v) => !v)} className="gap-2 gradient-primary"><Plus className="w-4 h-4" />New Request</Button>
        </div>
      )}

      {showAddUnit && (
        <form onSubmit={addUnit} className="glass-card rounded-2xl p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={unitForm.bloodGroup} onChange={(e) => setUnitForm({ ...unitForm, bloodGroup: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
              {BLOOD_GROUPS.map((g) => <option key={g} value={g} className="text-black">{g}</option>)}
            </select>
            <Input placeholder="Donor name (optional)" value={unitForm.donorName} onChange={(e) => setUnitForm({ ...unitForm, donorName: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <Input type="date" placeholder="Expiry date" value={unitForm.expiryDate} onChange={(e) => setUnitForm({ ...unitForm, expiryDate: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <Input type="number" min={1} placeholder="Volume (mL)" value={unitForm.volumeMl} onChange={(e) => setUnitForm({ ...unitForm, volumeMl: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="gradient-primary">Save</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAddUnit(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {showRequestForm && (
        <form onSubmit={submitRequest} className="glass-card rounded-2xl p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={requestForm.patientId} onChange={(e) => setRequestForm({ ...requestForm, patientId: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm sm:col-span-2">
              <option value="" className="text-black">Select patient</option>
              {patients.map((p) => <option key={p.id} value={p.id} className="text-black">{p.fullName} ({p.mrn})</option>)}
            </select>
            <select value={requestForm.bloodGroup} onChange={(e) => setRequestForm({ ...requestForm, bloodGroup: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
              {BLOOD_GROUPS.map((g) => <option key={g} value={g} className="text-black">{g}</option>)}
            </select>
            <Input type="number" min={1} placeholder="Units" value={requestForm.unitsRequested} onChange={(e) => setRequestForm({ ...requestForm, unitsRequested: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
          </div>
          <select value={requestForm.urgency} onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
            <option value="ROUTINE" className="text-black">Routine</option>
            <option value="URGENT" className="text-black">Urgent</option>
            <option value="EMERGENCY" className="text-black">Emergency</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="gradient-primary">Submit Request</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowRequestForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10"><h2 className="font-semibold text-white">Requests</h2></div>
        {requests.length === 0 ? (
          <p className="text-gray-400 p-6 text-sm">No blood requests yet</p>
        ) : (
          <div className="divide-y divide-white/10">
            {requests.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-white font-medium">{r.Patient?.fullName} — {r.bloodGroup} × {r.unitsRequested}</p>
                  <p className="text-xs text-gray-400">{r.urgency} • {new Date(r.requestedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={REQUEST_STATUS_COLORS[r.status]}>{r.status}</Badge>
                  {canManageBloodBank(user?.role) && r.status !== 'FULFILLED' && r.status !== 'CANCELLED' && (
                    <div className="flex gap-1">
                      {r.status === 'PENDING' && <Button size="sm" variant="outline" onClick={() => updateRequestStatus(r.id, 'APPROVED')}>Approve</Button>}
                      {r.status === 'APPROVED' && <Button size="sm" onClick={() => updateRequestStatus(r.id, 'FULFILLED')} className="gradient-primary">Fulfill</Button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10"><h2 className="font-semibold text-white">Unit Inventory</h2></div>
        {units.length === 0 ? (
          <p className="text-gray-400 p-6 text-sm">No blood units recorded yet</p>
        ) : (
          <div className="divide-y divide-white/10">
            {units.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{u.bloodGroup} — {u.volumeMl}mL {u.donorName ? `(${u.donorName})` : ''}</p>
                  <p className="text-xs text-gray-400">Expires {new Date(u.expiryDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={UNIT_STATUS_COLORS[u.status]}>{u.status}</Badge>
                  {canManageBloodBank(user?.role) && u.status === 'AVAILABLE' && (
                    <select value={u.status} onChange={(e) => updateUnitStatus(u.id, e.target.value)} className="glass-input px-2 py-1.5 rounded-lg text-white text-xs">
                      <option value="AVAILABLE" className="text-black">Available</option>
                      <option value="RESERVED" className="text-black">Reserved</option>
                      <option value="USED" className="text-black">Used</option>
                      <option value="DISCARDED" className="text-black">Discarded</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

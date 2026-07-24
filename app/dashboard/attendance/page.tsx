'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/permissions';
import { notify } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, LogIn, LogOut, Plus, Check, X } from 'lucide-react';

const LEAVE_TYPES = ['CASUAL', 'SICK', 'ANNUAL', 'UNPAID'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'CASUAL', startDate: '', endDate: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const [att, myLv] = await Promise.all([
      supabase.from('Attendance').select('*').eq('userId', user?.id).eq('date', today).maybeSingle(),
      supabase.from('LeaveRequest').select('*').eq('userId', user?.id).order('createdAt', { ascending: false }),
    ]);
    setTodayAttendance(att.data);
    setMyLeaves(myLv.data || []);

    if (isAdmin(user?.role)) {
      const { data } = await supabase.from('LeaveRequest').select('*, User(fullName, role)').order('createdAt', { ascending: false }).limit(100);
      setAllLeaves(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  const checkIn = async () => {
    await supabase.from('Attendance').upsert(
      { hospitalId: user?.hospitalId, userId: user?.id, date: today, checkInAt: new Date().toISOString(), status: 'PRESENT' },
      { onConflict: 'userId,date' }
    );
    await load();
  };

  const checkOut = async () => {
    await supabase.from('Attendance').update({ checkOutAt: new Date().toISOString() }).eq('userId', user?.id).eq('date', today);
    await load();
  };

  const requestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) { setError('Start and end dates are required.'); return; }
    setError('');
    const { error: insertError } = await supabase.from('LeaveRequest').insert({
      hospitalId: user?.hospitalId,
      userId: user?.id,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason || null,
    });
    if (insertError) { setError(insertError.message); return; }
    notify({
      hospitalId: user?.hospitalId,
      targetRole: 'HOSPITAL_ADMIN',
      type: 'LEAVE_REQUEST',
      title: `${user?.fullName} requested leave`,
      message: `${leaveForm.type} — ${leaveForm.startDate} to ${leaveForm.endDate}`,
      link: '/dashboard/attendance',
    });
    setLeaveForm({ type: 'CASUAL', startDate: '', endDate: '', reason: '' });
    setShowLeaveForm(false);
    await load();
  };

  const reviewLeave = async (id: string, status: string) => {
    await supabase.from('LeaveRequest').update({ status, reviewedById: user?.id, reviewedAt: new Date().toISOString() }).eq('id', id);
    await load();
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
          <Clock className="w-7 h-7 text-indigo-300" />Attendance & Leave
        </h1>
        <p className="text-gray-400 mt-2">Check in/out, and request or review leave</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-gray-400 mb-3">Today — {new Date().toLocaleDateString()}</p>
        <div className="flex items-center gap-4">
          {todayAttendance?.checkInAt ? (
            <p className="text-white">Checked in at <span className="font-semibold">{new Date(todayAttendance.checkInAt).toLocaleTimeString()}</span></p>
          ) : (
            <Button onClick={checkIn} className="gap-2 gradient-primary"><LogIn className="w-4 h-4" />Check In</Button>
          )}
          {todayAttendance?.checkInAt && !todayAttendance?.checkOutAt && (
            <Button onClick={checkOut} variant="outline" className="gap-2"><LogOut className="w-4 h-4" />Check Out</Button>
          )}
          {todayAttendance?.checkOutAt && (
            <p className="text-gray-400 text-sm">Checked out at {new Date(todayAttendance.checkOutAt).toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">My Leave Requests</h2>
          <Button size="sm" onClick={() => setShowLeaveForm((v) => !v)} className="gap-1 gradient-primary"><Plus className="w-3.5 h-3.5" />Request Leave</Button>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        {showLeaveForm && (
          <form onSubmit={requestLeave} className="bg-white/5 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
                {LEAVE_TYPES.map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
              <Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
              <Input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            </div>
            <Input placeholder="Reason (optional)" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="gradient-primary">Submit</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowLeaveForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {myLeaves.length === 0 ? (
          <p className="text-gray-400 text-sm">No leave requests yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {myLeaves.map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{l.type} — {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</p>
                  {l.reason && <p className="text-xs text-gray-400">{l.reason}</p>}
                </div>
                <Badge className={STATUS_COLORS[l.status]}>{l.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin(user?.role) && (
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-white">Review Leave Requests (All Staff)</h2>
          {allLeaves.filter((l) => l.status === 'PENDING').length === 0 ? (
            <p className="text-gray-400 text-sm">No pending requests.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {allLeaves.filter((l) => l.status === 'PENDING').map((l) => (
                <div key={l.id} className="py-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-white text-sm font-medium">{l.User?.fullName} ({l.User?.role?.replace('_', ' ')}) — {l.type}</p>
                    <p className="text-xs text-gray-400">{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}{l.reason ? ` • ${l.reason}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => reviewLeave(l.id, 'APPROVED')} className="p-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300"><Check className="w-4 h-4" /></button>
                    <button onClick={() => reviewLeave(l.id, 'REJECTED')} className="p-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

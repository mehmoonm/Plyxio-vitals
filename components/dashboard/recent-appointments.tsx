'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { DbAppointment } from '@/lib/supabase/types';

export function RecentAppointments() {
  const [recent, setRecent] = useState<DbAppointment[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('Appointment')
        .select('*, Patient(fullName), User(fullName)')
        .order('scheduledAt', { ascending: false })
        .limit(5);
      if (data) setRecent(data as any);
    })();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CHECKED_IN':
        return 'from-cyan-600/40 to-cyan-500/20 border-cyan-400/50 text-cyan-200';
      case 'COMPLETED':
        return 'from-emerald-600/40 to-emerald-500/20 border-emerald-400/50 text-emerald-200';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'from-red-600/40 to-red-500/20 border-red-400/50 text-red-200';
      default:
        return 'from-gray-600/40 to-gray-500/20 border-gray-400/50 text-gray-200';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <h3 className="text-xl font-bold text-white">Recent Appointments</h3>
      <div className="space-y-3">
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm">No appointments found</p>
        ) : (
          recent.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10 hover:border-white/20 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/15 transition-all duration-300 group">
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{apt.Patient?.fullName || 'Unknown'}</p>
                <p className="text-xs text-gray-400">
                  {new Date(apt.scheduledAt).toLocaleString()}
                </p>
                <p className="text-xs text-gray-300 mt-1">Dr. {apt.User?.fullName?.replace('Dr. ', '') || 'Unassigned'}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-lg bg-gradient-to-r ${getStatusColor(apt.status)} border`}>
                {apt.status.replace('_', ' ')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

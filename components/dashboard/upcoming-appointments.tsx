'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { DbAppointment } from '@/lib/supabase/types';
import { Calendar } from 'lucide-react';

export function UpcomingAppointments() {
  const [upcoming, setUpcoming] = useState<DbAppointment[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('Appointment')
        .select('*, Patient(fullName)')
        .eq('status', 'SCHEDULED')
        .order('scheduledAt', { ascending: true })
        .limit(5);
      if (data) setUpcoming(data as any);
    })();
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <Calendar className="w-5 h-5 text-cyan-400" />
        Upcoming Appointments
      </h3>
      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming appointments</p>
        ) : (
          upcoming.map((apt) => (
            <div key={apt.id} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 hover:border-cyan-400/60 hover:from-cyan-600/30 hover:to-blue-600/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{apt.Patient?.fullName || 'Unknown'}</p>
                <p className="text-sm text-gray-300">{apt.reason}</p>
                <p className="text-xs text-gray-400 mt-1">📅 {new Date(apt.scheduledAt).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

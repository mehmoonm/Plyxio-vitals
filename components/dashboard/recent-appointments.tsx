'use client';

import { mockAppointments, mockPatients, mockDoctors } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function RecentAppointments() {
  const recent = mockAppointments.slice(0, 5);

  const getPatientName = (patientId: string) => {
    const patient = mockPatients.find((p) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = mockDoctors.find((d) => d.id === doctorId);
    return doctor ? `Dr. ${doctor.lastName}` : 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'from-cyan-600/40 to-cyan-500/20 border-cyan-400/50 text-cyan-200';
      case 'completed':
        return 'from-emerald-600/40 to-emerald-500/20 border-emerald-400/50 text-emerald-200';
      case 'cancelled':
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
                <p className="font-semibold text-white text-sm">{getPatientName(apt.patientId)}</p>
                <p className="text-xs text-gray-400">
                  {apt.appointmentDate} at {apt.appointmentTime}
                </p>
                <p className="text-xs text-gray-300 mt-1">{getDoctorName(apt.doctorId)}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-lg bg-gradient-to-r ${getStatusColor(apt.status)} border`}>
                {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

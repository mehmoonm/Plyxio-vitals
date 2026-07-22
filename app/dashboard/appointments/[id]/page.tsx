'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { DbAppointment } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { canCheckIn, canDoEncounters, canManageAppointments } from '@/lib/permissions';
import { ArrowLeft, Edit, Calendar, UserCheck, Stethoscope, XCircle } from 'lucide-react';

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [apt, setApt] = useState<DbAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('Appointment')
      .select('*, Patient(*), User(*)')
      .eq('id', params.id)
      .single();
    setApt(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const updateStatus = async (status: string, extra: Record<string, any> = {}) => {
    setBusy(true);
    await supabase.from('Appointment').update({ status, ...extra }).eq('id', params.id);
    await load();
    setBusy(false);
  };

  const handleCheckIn = () => updateStatus('CHECKED_IN', { checkedInAt: new Date().toISOString() });
  const handleCancel = () => updateStatus('CANCELLED');

  const startEncounter = () => {
    router.push(`/dashboard/encounters/new?appointmentId=${params.id}&patientId=${apt?.patientId}&doctorId=${apt?.doctorId}`);
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!apt) return <div className="text-gray-500">Appointment not found</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN': return 'bg-yellow-100 text-yellow-800';
      case 'IN_CONSULTATION': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/appointments">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
        </Link>
        {canManageAppointments(user?.role) && apt.status === 'SCHEDULED' && (
          <Link href={`/dashboard/appointments/${apt.id}/edit`}>
            <Button className="gap-2"><Edit className="w-4 h-4" />Edit</Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{apt.Patient?.fullName || 'Unknown Patient'}</h1>
            <p className="text-gray-500 mt-1">with {apt.User?.fullName || 'Unassigned doctor'}</p>
          </div>
          <Badge className={getStatusColor(apt.status)}>{apt.status.replace('_', ' ')}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-5 h-5 text-gray-400" />
            {new Date(apt.scheduledAt).toLocaleString()}
          </div>
          {apt.tokenNumber && <div className="text-gray-700">Token #{apt.tokenNumber}</div>}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-500 mb-1">Reason for Visit</p>
          <p className="text-gray-900">{apt.reason || 'Not specified'}</p>
        </div>

        <div className="pt-6 border-t flex flex-wrap gap-3">
          {canCheckIn(user?.role) && apt.status === 'SCHEDULED' && (
            <Button onClick={handleCheckIn} disabled={busy} className="gap-2">
              <UserCheck className="w-4 h-4" />Check In Patient
            </Button>
          )}
          {canDoEncounters(user?.role) && (apt.status === 'CHECKED_IN' || apt.status === 'IN_CONSULTATION') && (
            <Button onClick={startEncounter} className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Stethoscope className="w-4 h-4" />Start Encounter
            </Button>
          )}
          {canManageAppointments(user?.role) && !['COMPLETED', 'CANCELLED'].includes(apt.status) && (
            <Button onClick={handleCancel} disabled={busy} variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
              <XCircle className="w-4 h-4" />Cancel Appointment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

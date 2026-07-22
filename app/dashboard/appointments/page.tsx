'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageAppointments } from '@/lib/permissions';
import type { DbAppointment } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Plus } from 'lucide-react';

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('Appointment')
        .select('*, Patient(fullName), User(fullName)')
        .order('scheduledAt', { ascending: false });
      setAppointments((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = appointments.filter((apt) => {
    const matchesSearch = (apt.Patient?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointment Scheduling</h1>
          <p className="text-gray-500 mt-2">Manage appointments and patient visits</p>
        </div>
        {canManageAppointments(user?.role) && (
          <Link href="/dashboard/appointments/new">
            <Button className="gap-2"><Plus className="w-4 h-4" />New Appointment</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input placeholder="Search by patient name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {['all', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {status.replace('_', ' ').toLowerCase()}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Doctor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Date & Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Reason</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">No appointments found</td></tr>
                ) : (
                  filtered.map((apt) => (
                    <tr key={apt.id} onClick={() => router.push(`/dashboard/appointments/${apt.id}`)} className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="py-3 px-4 font-medium text-gray-900">{apt.Patient?.fullName || 'Unknown'}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{apt.User?.fullName || 'Unassigned'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(apt.scheduledAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{apt.reason || '—'}</td>
                      <td className="py-3 px-4"><Badge className={getStatusColor(apt.status)}>{apt.status.replace('_', ' ')}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

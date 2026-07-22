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
import { Search, Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500',
  CHECKED_IN: 'bg-amber-500',
  IN_CONSULTATION: 'bg-purple-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
  NO_SHOW: 'bg-orange-500',
};

function MonthCalendar({ appointments, onSelectDay }: { appointments: DbAppointment[]; onSelectDay: (day: Date) => void }) {
  const router = useRouter();
  const [cursor, setCursor] = useState(new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay: Record<string, DbAppointment[]> = {};
  for (const apt of appointments) {
    const key = new Date(apt.scheduledAt).toDateString();
    byDay[key] = [...(byDay[key] || []), apt];
  }

  const today = new Date().toDateString();

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="font-semibold text-gray-900">{cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dayApts = day ? byDay[day.toDateString()] || [] : [];
          const isToday = day && day.toDateString() === today;
          return (
            <div
              key={i}
              onClick={() => day && onSelectDay(day)}
              className={`min-h-[100px] border-b border-r p-1.5 ${day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}`}
            >
              {day && (
                <>
                  <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>{day.getDate()}</p>
                  <div className="space-y-1">
                    {dayApts.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/appointments/${apt.id}`); }}
                        className="text-[10px] px-1.5 py-0.5 rounded text-white truncate"
                        style={{ backgroundColor: undefined }}
                      >
                        <span className={`inline-block w-full truncate rounded px-1 ${STATUS_COLORS[apt.status] || 'bg-gray-400'} text-white`}>
                          {new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {apt.Patient?.fullName}
                        </span>
                      </div>
                    ))}
                    {dayApts.length > 3 && <p className="text-[10px] text-gray-400 pl-1">+{dayApts.length - 3} more</p>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
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
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('list')} className={`p-2 rounded-md ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`} title="List view">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('calendar')} className={`p-2 rounded-md ${view === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`} title="Calendar view">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {canManageAppointments(user?.role) && (
            <Link href="/dashboard/appointments/new">
              <Button className="gap-2"><Plus className="w-4 h-4" />New Appointment</Button>
            </Link>
          )}
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="space-y-4">
          <MonthCalendar appointments={appointments} onSelectDay={setSelectedDay} />
          {selectedDay && (
            <div className="bg-white rounded-2xl border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{selectedDay.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              {(() => {
                const dayApts = appointments.filter((a) => new Date(a.scheduledAt).toDateString() === selectedDay.toDateString());
                return dayApts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No appointments this day</p>
                ) : (
                  <div className="space-y-2">
                    {dayApts.map((apt) => (
                      <div key={apt.id} onClick={() => router.push(`/dashboard/appointments/${apt.id}`)} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer border">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{apt.Patient?.fullName}</p>
                          <p className="text-xs text-gray-500">Dr. {apt.User?.fullName} • {new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <Badge className={getStatusColor(apt.status)}>{apt.status.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
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
                          <CalendarIcon className="w-4 h-4" />
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
      )}
    </div>
  );
}

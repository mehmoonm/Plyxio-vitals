'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageStaff } from '@/lib/permissions';
import type { DbUser } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit } from 'lucide-react';

export default function DoctorsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('User').select('*').eq('role', 'DOCTOR');
      setDoctors((data as DbUser[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredDoctors = doctors.filter(
    (d) =>
      d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.specialty || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Directory</h1>
          <p className="text-gray-500 mt-2">Hospital physicians and specializations</p>
        </div>
        {canManageStaff(user?.role) && (
          <Link href="/dashboard/staff/new">
            <Button className="gap-2"><Plus className="w-4 h-4" />New Doctor</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search doctors by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 py-8 text-center">Loading…</p>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-8"><p className="text-gray-500">No doctors found</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doctor) => (
                <div key={doctor.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <h3 className="font-semibold text-gray-900">{doctor.fullName}</h3>
                  <p className="text-sm text-gray-500">{doctor.specialty || 'General'}</p>
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p>License: {doctor.licenseNo || '—'}</p>
                    <p>Email: {doctor.email}</p>
                    <p>Phone: {doctor.phone || '—'}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={doctor.isActive ? 'default' : 'secondary'}>
                      {doctor.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {canManageStaff(user?.role) && (
                      <Link href={`/dashboard/staff/${doctor.id}/edit`}>
                        <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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

export default function StaffPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('User').select('*').order('role');
      setStaff((data as DbUser[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredStaff = staff.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = staff.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Directory</h1>
          <p className="text-gray-500 mt-2">All hospital staff across departments</p>
        </div>
        {canManageStaff(user?.role) && (
          <Link href="/dashboard/staff/new">
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Staff</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-gray-500 text-sm">Total Staff</p><p className="text-2xl font-bold text-gray-900 mt-2">{staff.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-gray-500 text-sm">Active</p><p className="text-2xl font-bold text-green-600 mt-2">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-gray-500 text-sm">Roles</p><p className="text-2xl font-bold text-blue-600 mt-2">{new Set(staff.map((s) => s.role)).size}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input placeholder="Search staff by name or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Status</th>
                  {canManageStaff(user?.role) && <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading…</td></tr>
                ) : filteredStaff.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">No staff found</td></tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{member.fullName}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{member.role.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{member.email}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{member.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge className={member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {member.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </td>
                      {canManageStaff(user?.role) && (
                        <td className="py-3 px-4">
                          <Link href={`/dashboard/staff/${member.id}/edit`}>
                            <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
                          </Link>
                        </td>
                      )}
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

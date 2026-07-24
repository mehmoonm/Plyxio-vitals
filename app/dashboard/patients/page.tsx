'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManagePatients, isAdmin } from '@/lib/permissions';
import type { DbPatient } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, RotateCcw, Archive, Upload } from 'lucide-react';

export default function PatientsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<DbPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('Patient').select('*').order('createdAt', { ascending: false });
    setPatients((data as DbPatient[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredPatients = patients
    .filter((p) => (showArchived ? true : p.isActive !== false))
    .filter(
      (p) =>
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.phone || '').includes(searchTerm) ||
        (p.cnic || '').includes(searchTerm)
    );

  const handleDelete = async (patient: DbPatient) => {
    if (!confirm(`Delete ${patient.fullName}? This can't be undone.`)) return;
    setBusyId(patient.id);
    setError('');

    const { error: deleteError } = await supabase.from('Patient').delete().eq('id', patient.id);

    if (deleteError) {
      // Postgres 23503 = foreign key violation. This patient has real
      // history (appointments, invoices, records, etc) that can't be
      // deleted out from under -- offer to archive instead, which hides
      // them from the active list without touching their medical/billing
      // history.
      if (deleteError.code === '23503') {
        if (confirm(`${patient.fullName} has existing medical or billing records, so they can't be permanently deleted. Archive them instead? (Hides them from the active list, keeps all history intact.)`)) {
          const { error: archiveError } = await supabase.from('Patient').update({ isActive: false }).eq('id', patient.id);
          if (archiveError) setError(archiveError.message);
        }
      } else {
        setError(deleteError.message);
      }
    }

    setBusyId(null);
    await load();
  };

  const handleReactivate = async (patient: DbPatient) => {
    setBusyId(patient.id);
    await supabase.from('Patient').update({ isActive: true }).eq('id', patient.id);
    setBusyId(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-bold heading-gradient">
            Patient Management
          </h1>
          <p className="text-gray-400 mt-2">Manage all patient records and information</p>
        </div>
        {canManagePatients(user?.role) && (
          <div className="flex gap-2">
            <Link href="/dashboard/patients/import">
              <Button variant="outline" className="gap-2"><Upload className="w-4 h-4" />Import CSV</Button>
            </Link>
            <Link href="/dashboard/patients/new">
              <Button className="gradient-primary text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Patient</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10 focus-within:border-white/30 transition-all flex-1">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search patients by name, MRN, phone, CNIC, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input border-0 bg-transparent focus-visible:ring-0 text-white placeholder-gray-400"
          />
        </div>
        {isAdmin(user?.role) && (
          <label className="flex items-center gap-2 text-sm text-gray-300 whitespace-nowrap px-2">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="w-4 h-4" />
            Show archived
          </label>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-indigo-600/10 to-cyan-600/10">
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">MRN</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Phone</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Blood Group</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400">Loading…</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <p className="text-lg font-semibold">No patients found</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gradient-to-r hover:from-indigo-600/10 hover:to-cyan-600/10 transition-colors duration-300 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{patient.fullName}</p>
                        {patient.isActive === false && <Badge className="bg-gray-200 text-gray-700">Archived</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</p>
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm">{patient.mrn}</td>
                    <td className="py-4 px-6 text-gray-300 text-sm">{patient.phone || '—'}</td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-400/50 text-cyan-200">
                        {patient.bloodGroup || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/patients/${patient.id}`}>
                          <button className="p-2 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 transition-all duration-300" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        {canManagePatients(user?.role) && (
                          <Link href={`/dashboard/patients/${patient.id}/edit`}>
                            <button className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/50 text-indigo-300 transition-all duration-300" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                          </Link>
                        )}
                        {isAdmin(user?.role) && (
                          patient.isActive === false ? (
                            <button
                              onClick={() => handleReactivate(patient)}
                              disabled={busyId === patient.id}
                              className="p-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/50 text-emerald-300 transition-all duration-300"
                              title="Reactivate"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(patient)}
                              disabled={busyId === patient.id}
                              className="p-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-400/50 text-red-300 transition-all duration-300"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { mockPatients } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState(mockPatients);

  const filteredPatients = patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setPatients(patients.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            Patient Management
          </h1>
          <p className="text-gray-400 mt-2">Manage all patient records and information</p>
        </div>
        <Link href="/dashboard/patients/new">
          <Button className="gradient-primary text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Patient</span>
          </Button>
        </Link>
      </div>

      {/* Search Card */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10 focus-within:border-white/30 transition-all">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search patients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input border-0 bg-transparent focus-visible:ring-0 text-white placeholder-gray-400"
            />
        </div>
      </div>

      {/* Patients Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-indigo-600/10 to-cyan-600/10">
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Email</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Phone</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Blood Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-200 text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <p className="text-lg font-semibold">No patients found</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gradient-to-r hover:from-indigo-600/10 hover:to-cyan-600/10 transition-colors duration-300 group">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{patient.dateOfBirth}</p>
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm">{patient.email}</td>
                    <td className="py-4 px-6 text-gray-300 text-sm">{patient.phone}</td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-400/50 text-cyan-200">
                        {patient.bloodType}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Link href={`/dashboard/patients/${patient.id}`}>
                          <button className="p-2 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 transition-all duration-300">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={`/dashboard/patients/${patient.id}/edit`}>
                          <button className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/50 text-indigo-300 transition-all duration-300">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(patient.id)}
                          className="p-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-400/50 text-red-300 transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

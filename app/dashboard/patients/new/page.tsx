'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logAudit } from '@/lib/audit-log';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { canManagePatients } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';

const empty = {
  fullName: '', dateOfBirth: '', gender: 'MALE', bloodGroup: 'O+',
  phone: '', email: '', address: '', city: '', cnic: '',
  knownConditions: '', allergies: '', emergencyContactName: '', emergencyContactPhone: '',
};

export default function NewPatientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(empty);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const mrn = `MRN-${Date.now().toString().slice(-8)}`;
    const { data: newPatient, error: insertError } = await supabase.from('Patient').insert({
      hospitalId: user?.hospitalId,
      mrn,
      ...formData,
      dateOfBirth: formData.dateOfBirth || null,
    }).select().single();

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    logAudit({
      hospitalId: user?.hospitalId,
      userId: user?.id,
      action: 'PATIENT_CREATED',
      entityType: 'Patient',
      entityId: newPatient?.id,
      metadata: { fullName: formData.fullName, mrn },
    });
    router.push('/dashboard/patients');
  };

  return (
    <RoleGuard allowed={canManagePatients(user?.role)}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold heading-gradient">Add New Patient</h1>
          <p className="text-gray-400 mt-2">Create a new patient record in the system</p>
        </div>
        <Link href="/dashboard/patients">
          <Button variant="outline" className="gap-2 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20">
            <ArrowLeft className="w-4 h-4" />Cancel
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6">
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg text-sm">{error}</div>}

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Full Name *</label>
              <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full name" required className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">CNIC</label>
              <Input name="cnic" value={formData.cnic} onChange={handleChange} placeholder="XXXXX-XXXXXXX-X" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Date of Birth</label>
              <Input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="glass-input w-full px-4 py-3 rounded-lg text-white">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Email</label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email address" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Phone</label>
              <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="address" value={formData.address} onChange={handleChange} placeholder="Street address" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Medical Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Blood Group</label>
              <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="glass-input w-full px-4 py-3 rounded-lg text-white">
                {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-300 block mb-2">Known Conditions</label>
            <textarea name="knownConditions" value={formData.knownConditions} onChange={handleChange} rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-300 block mb-2">Allergies</label>
            <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="Contact name" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} placeholder="Contact phone" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex gap-4">
          <Button type="submit" disabled={loading} className="gradient-primary text-white font-semibold py-3 px-6 rounded-lg gap-2 flex-1">
            <Save className="w-4 h-4" />{loading ? 'Creating...' : 'Create Patient'}
          </Button>
          <Link href="/dashboard/patients" className="flex-1">
            <Button type="button" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
    </RoleGuard>
  );
}

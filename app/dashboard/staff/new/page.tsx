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

const ROLES = [
  'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN',
  'RADIOLOGIST', 'BILLING_CLERK', 'ACCOUNTANT', 'HOSPITAL_ADMIN',
];

export default function NewStaffPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', role: 'DOCTOR', specialty: '', licenseNo: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Creates the staff profile row. Login access (Supabase Auth) must be
    // set up separately by an admin via the Supabase dashboard — this only
    // creates the directory/profile entry.
    const { data: newStaff, error: insertError } = await supabase.from('User').insert({
      hospitalId: user?.hospitalId,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || null,
      role: form.role,
      specialty: form.role === 'DOCTOR' ? form.specialty || null : null,
      licenseNo: form.licenseNo || null,
      passwordHash: 'PENDING_INVITE',
      isActive: true,
    }).select().single();

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    logAudit({
      hospitalId: user?.hospitalId,
      userId: user?.id,
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: newStaff?.id,
      metadata: { fullName: form.fullName, role: form.role },
    });
    router.push(form.role === 'DOCTOR' ? '/dashboard/doctors' : '/dashboard/staff');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Staff Member</h1>
          <p className="text-gray-500 mt-2">Create a new staff or doctor profile</p>
        </div>
        <Link href="/dashboard/staff">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-2xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Full Name *</label>
          <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full name" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Email *</label>
            <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email address" required />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Phone</label>
            <Input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Role *</label>
          <select name="role" value={form.role} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300">
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </div>

        {form.role === 'DOCTOR' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Specialty</label>
              <Input name="specialty" value={form.specialty} onChange={handleChange} placeholder="e.g. Cardiology" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">License Number</label>
              <Input name="licenseNo" value={form.licenseNo} onChange={handleChange} placeholder="License #" />
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Note: this creates the staff directory profile only. Login access needs to be set up separately via Supabase Auth.
        </div>

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Creating...' : 'Create Profile'}
        </Button>
      </form>
    </div>
  );
}

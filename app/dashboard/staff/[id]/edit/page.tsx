'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('User').select('*').eq('id', params.id).single();
      setForm(data);
      setFetching(false);
    })();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: updateError } = await supabase
      .from('User')
      .update({
        fullName: form.fullName,
        phone: form.phone,
        specialty: form.specialty,
        licenseNo: form.licenseNo,
        isActive: form.isActive,
      })
      .eq('id', params.id);
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.push('/dashboard/staff');
  };

  if (fetching) return <div className="text-gray-500">Loading…</div>;
  if (!form) return <div className="text-gray-500">Staff member not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Edit Staff Member</h1>
        <Link href="/dashboard/staff">
          <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-6 max-w-2xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Full Name</label>
          <Input name="fullName" value={form.fullName || ''} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Email (read-only)</label>
            <Input value={form.email} disabled />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Phone</label>
            <Input name="phone" value={form.phone || ''} onChange={handleChange} />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Role (read-only)</label>
          <Input value={form.role?.replace('_', ' ')} disabled />
        </div>
        {form.role === 'DOCTOR' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Specialty</label>
              <Input name="specialty" value={form.specialty || ''} onChange={handleChange} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">License Number</label>
              <Input name="licenseNo" value={form.licenseNo || ''} onChange={handleChange} />
            </div>
          </div>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" checked={!!form.isActive} onChange={handleChange} className="w-4 h-4" />
          <span className="text-sm font-semibold text-gray-700">Active</span>
        </label>

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}

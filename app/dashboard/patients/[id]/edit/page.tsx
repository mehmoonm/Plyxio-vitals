'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditPatientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('Patient').select('*').eq('id', params.id).single();
      if (data) {
        setFormData({
          ...data,
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
        });
      }
      setFetching(false);
    })();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { id, hospitalId, mrn, createdAt, updatedAt, ...updates } = formData;
    const { error: updateError } = await supabase
      .from('Patient')
      .update({ ...updates, dateOfBirth: updates.dateOfBirth || null })
      .eq('id', params.id);
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.push(`/dashboard/patients/${params.id}`);
  };

  if (fetching) return <div className="text-gray-400">Loading…</div>;
  if (!formData) return <div className="text-gray-400">Patient not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">Edit Patient</h1>
          <p className="text-gray-400 mt-2">Update patient information</p>
        </div>
        <Link href={`/dashboard/patients/${params.id}`}>
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
            <Input name="fullName" value={formData.fullName || ''} onChange={handleChange} placeholder="Full name" required className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Input name="cnic" value={formData.cnic || ''} onChange={handleChange} placeholder="CNIC" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Input type="date" name="dateOfBirth" value={formData.dateOfBirth || ''} onChange={handleChange} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <select name="gender" value={formData.gender || 'MALE'} onChange={handleChange} className="glass-input w-full px-4 py-3 rounded-lg text-white">
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="Email" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Phone" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="address" value={formData.address || ''} onChange={handleChange} placeholder="Street address" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Input name="city" value={formData.city || ''} onChange={handleChange} placeholder="City" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Medical Information</h2>
          <select name="bloodGroup" value={formData.bloodGroup || 'O+'} onChange={handleChange} className="glass-input w-full px-4 py-3 rounded-lg text-white mb-4">
            {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </select>
          <textarea name="knownConditions" value={formData.knownConditions || ''} onChange={handleChange} placeholder="Known conditions" rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none mb-4" />
          <textarea name="allergies" value={formData.allergies || ''} onChange={handleChange} placeholder="Allergies" rows={3} className="glass-input w-full px-4 py-3 rounded-lg text-white resize-none" />
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} placeholder="Contact name" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
            <Input name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} onChange={handleChange} placeholder="Contact phone" className="glass-input w-full px-4 py-3 rounded-lg text-white" />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex gap-4">
          <Button type="submit" disabled={loading} className="gradient-primary text-white font-semibold py-3 px-6 rounded-lg gap-2 flex-1">
            <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Patient'}
          </Button>
          <Link href={`/dashboard/patients/${params.id}`} className="flex-1">
            <Button type="button" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

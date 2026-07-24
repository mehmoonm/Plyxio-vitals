'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Upload, FileText, Trash2, Eye } from 'lucide-react';
import { isAdmin } from '@/lib/permissions';
import { RoleGuard } from '@/components/dashboard/role-guard';

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docType, setDocType] = useState('CONTRACT');
  const [docExpiry, setDocExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState('');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  const loadDocuments = async () => {
    const { data } = await supabase.from('StaffDocument').select('*').eq('userId', params.id).order('uploadedAt', { ascending: false });
    setDocuments(data || []);
  };

  useEffect(() => {
    (async () => {
      const [userRes, deptRes] = await Promise.all([
        supabase.from('User').select('*').eq('id', params.id).single(),
        supabase.from('Department').select('*').order('name'),
      ]);
      setForm(userRes.data);
      setDepartments(deptRes.data || []);
      setFetching(false);
      await loadDocuments();
    })();
  }, [params.id]);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.hospitalId) return;
    setUploading(true);
    setDocError('');

    const path = `${user.hospitalId}/${params.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('staff-documents').upload(path, file);
    if (uploadError) { setDocError(uploadError.message); setUploading(false); return; }

    const { error: insertError } = await supabase.from('StaffDocument').insert({
      hospitalId: user.hospitalId,
      userId: params.id,
      type: docType,
      title: file.name,
      fileUrl: path,
      expiryDate: docExpiry || null,
      uploadedById: user.id,
    });
    setUploading(false);
    if (insertError) { setDocError(insertError.message); return; }
    setDocExpiry('');
    e.target.value = '';
    await loadDocuments();
  };

  const handleDocView = async (doc: any) => {
    const { data, error } = await supabase.storage.from('staff-documents').createSignedUrl(doc.fileUrl, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else setDocError(error?.message || 'Could not open document');
  };

  const handleDocDelete = async (doc: any) => {
    if (!confirm('Delete this document?')) return;
    await supabase.storage.from('staff-documents').remove([doc.fileUrl]);
    await supabase.from('StaffDocument').delete().eq('id', doc.id);
    await loadDocuments();
  };

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
        departmentId: form.departmentId || null,
        isActive: form.isActive,
        messagingEnabled: form.messagingEnabled,
        compensationType: form.compensationType,
        fixedSalaryAmount: form.compensationType === 'FIXED' ? Number(form.fixedSalaryAmount) || null : null,
        perPatientRate: form.compensationType === 'PER_PATIENT' ? Number(form.perPatientRate) || null : null,
      })
      .eq('id', params.id);
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.push('/dashboard/staff');
  };

  if (fetching) return <div className="text-gray-500">Loading…</div>;
  if (!form) return <div className="text-gray-500">Staff member not found</div>;

  return (
    <RoleGuard allowed={isAdmin(user?.role) || user?.id === params.id}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Department</label>
          <select name="departmentId" value={form.departmentId || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300">
            <option value="">No department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {form.role === 'DOCTOR' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        {form.role === 'DOCTOR' && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="messagingEnabled" checked={!!form.messagingEnabled} onChange={handleChange} className="w-4 h-4" />
            <span className="text-sm font-semibold text-gray-700">Allow patients to message this doctor via the portal</span>
          </label>
        )}
        {isAdmin(user?.role) && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <label className="text-sm font-semibold text-gray-700 block">Compensation</label>
            <select name="compensationType" value={form.compensationType || 'FIXED'} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white">
              <option value="FIXED">Fixed Salary</option>
              <option value="PER_PATIENT">Per Patient Seen</option>
            </select>
            {(form.compensationType || 'FIXED') === 'FIXED' ? (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Monthly Salary (Rs)</label>
                <Input name="fixedSalaryAmount" type="number" min={0} value={form.fixedSalaryAmount || ''} onChange={handleChange} placeholder="e.g. 80000" />
              </div>
            ) : (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Rate per Completed Appointment (Rs)</label>
                <Input name="perPatientRate" type="number" min={0} value={form.perPatientRate || ''} onChange={handleChange} placeholder="e.g. 500" />
              </div>
            )}
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

      {isAdmin(user?.role) && (
        <div className="bg-white rounded-2xl border p-8 space-y-4 max-w-2xl">
          <h2 className="font-semibold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500">Contracts, licenses, certifications, and other staff records.</p>

          {docError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{docError}</div>}

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
                <option value="CONTRACT">Contract</option>
                <option value="LICENSE">License</option>
                <option value="CERTIFICATION">Certification</option>
                <option value="ID">ID Document</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Expiry (optional)</label>
              <Input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 cursor-pointer text-sm text-indigo-700">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload File'}
              <input type="file" onChange={handleDocUpload} disabled={uploading} className="hidden" />
            </label>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-900">{doc.title}</p>
                      <p className="text-xs text-gray-500">{doc.type}{doc.expiryDate ? ` • Expires ${new Date(doc.expiryDate).toLocaleDateString()}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleDocView(doc)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleDocDelete(doc)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}

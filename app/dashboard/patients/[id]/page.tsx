'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManageDocuments, canManageAllergies } from '@/lib/permissions';
import type { DbPatient } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Mail, MapPin, Heart, AlertCircle, Users, Stethoscope, FileText, Upload, Trash2, Download, Plus } from 'lucide-react';

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [patient, setPatient] = useState<DbPatient | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ substance: '', reaction: '', severity: 'MILD' });
  const [allergyError, setAllergyError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    const { data } = await supabase.from('PatientDocument').select('*').eq('patientId', params.id).order('uploadedAt', { ascending: false });
    setDocuments(data || []);
  };

  const loadAllergies = async () => {
    const { data } = await supabase.from('Allergy').select('*').eq('patientId', params.id).order('notedAt', { ascending: false });
    setAllergies(data || []);
  };

  const addAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allergyForm.substance.trim()) return;
    setAllergyError('');
    const { error } = await supabase.from('Allergy').insert({
      patientId: params.id,
      substance: allergyForm.substance.trim(),
      reaction: allergyForm.reaction || null,
      severity: allergyForm.severity,
      notedAt: new Date().toISOString(),
    });
    if (error) { setAllergyError(error.message); return; }
    setAllergyForm({ substance: '', reaction: '', severity: 'MILD' });
    setShowAllergyForm(false);
    await loadAllergies();
  };

  const deleteAllergy = async (id: string) => {
    await supabase.from('Allergy').delete().eq('id', id);
    await loadAllergies();
  };

  useEffect(() => {
    (async () => {
      const [p, enc] = await Promise.all([
        supabase.from('Patient').select('*').eq('id', params.id).single(),
        supabase.from('Encounter').select('id, createdAt, diagnosis, chiefComplaint, User(fullName)').eq('patientId', params.id).order('createdAt', { ascending: false }),
      ]);
      setPatient(p.data as DbPatient);
      setEncounters(enc.data || []);
      await loadDocuments();
      await loadAllergies();
      setLoading(false);
    })();
  }, [params.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.hospitalId) return;
    setUploading(true);
    setDocError('');

    const path = `${user.hospitalId}/${params.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('patient-documents').upload(path, file);
    if (uploadError) { setDocError(uploadError.message); setUploading(false); return; }

    const { error: insertError } = await supabase.from('PatientDocument').insert({
      patientId: params.id,
      title: file.name,
      fileUrl: path,
      category: 'General',
      uploadedAt: new Date().toISOString(),
    });
    setUploading(false);
    if (insertError) { setDocError(insertError.message); return; }
    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadDocuments();
  };

  const handleView = async (doc: any) => {
    const { data, error } = await supabase.storage.from('patient-documents').createSignedUrl(doc.fileUrl, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else setDocError(error?.message || 'Could not open document');
  };

  const handleDelete = async (doc: any) => {
    await supabase.storage.from('patient-documents').remove([doc.fileUrl]);
    await supabase.from('PatientDocument').delete().eq('id', doc.id);
    await loadDocuments();
  };

  if (loading) {
    return <div className="text-gray-400">Loading…</div>;
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/patients">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </Button>
        </Link>
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-lg font-semibold text-white">Patient not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/patients">
          <Button variant="outline" className="gap-2 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20">
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </Button>
        </Link>
        <Link href={`/dashboard/patients/${patient.id}/edit`}>
          <Button className="gradient-primary text-white font-semibold gap-2">
            <Edit className="w-4 h-4" />
            Edit Patient
          </Button>
        </Link>
      </div>

      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">{patient.fullName}</h1>
            <p className="text-slate-400 mt-2">MRN: {patient.mrn}</p>
          </div>
          <Badge className="px-4 py-2 bg-cyan-600/30 border border-cyan-400/50 text-cyan-200">
            {patient.isActive ? 'Active Patient' : 'Inactive'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              Contact Information
            </h2>
            <div className="space-y-3">
              <div><p className="text-slate-400 text-sm">Email</p><p className="text-white font-medium">{patient.email || '—'}</p></div>
              <div><p className="text-slate-400 text-sm">Phone</p><p className="text-white font-medium">{patient.phone || '—'}</p></div>
              <div><p className="text-slate-400 text-sm">CNIC</p><p className="text-white font-medium">{patient.cnic || '—'}</p></div>
              <div><p className="text-slate-400 text-sm">Date of Birth</p><p className="text-white font-medium">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</p></div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" />
              Medical Information
            </h2>
            <div className="space-y-3">
              <div><p className="text-slate-400 text-sm">Blood Group</p><p className="text-white font-medium">{patient.bloodGroup || '—'}</p></div>
              <div><p className="text-slate-400 text-sm">Gender</p><p className="text-white font-medium capitalize">{patient.gender?.toLowerCase()}</p></div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Address
          </h2>
          <p className="text-white font-medium">{patient.address || '—'}</p>
          <p className="text-slate-400">{patient.city || ''}</p>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Known Conditions</h2>
          <p className="text-slate-300 whitespace-pre-wrap">{patient.knownConditions || 'None recorded'}</p>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              Allergies
            </h2>
            {canManageAllergies(user?.role) && !showAllergyForm && (
              <Button onClick={() => setShowAllergyForm(true)} variant="outline" size="sm" className="gap-2 border-orange-400/50 text-orange-300 hover:bg-orange-500/10">
                <Plus className="w-4 h-4" />Add
              </Button>
            )}
          </div>

          {showAllergyForm && (
            <form onSubmit={addAllergy} className="bg-white/5 rounded-lg p-4 mb-3 space-y-3">
              {allergyError && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-2 rounded-lg text-sm">{allergyError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Substance (e.g. Penicillin)" value={allergyForm.substance} onChange={(e) => setAllergyForm({ ...allergyForm, substance: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" required />
                <input placeholder="Reaction (e.g. Rash, Anaphylaxis)" value={allergyForm.reaction} onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
              </div>
              <select value={allergyForm.severity} onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
                <option value="MILD" className="text-black">Mild</option>
                <option value="MODERATE" className="text-black">Moderate</option>
                <option value="SEVERE" className="text-black">Severe</option>
              </select>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="gradient-primary">Save</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAllergyForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {allergies.length === 0 ? (
            <p className="text-slate-400 text-sm">No known allergies recorded</p>
          ) : (
            <div className="space-y-2">
              {allergies.map((a) => (
                <div key={a.id} className="bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium">{a.substance}</p>
                      {a.severity && (
                        <Badge className={a.severity === 'SEVERE' ? 'bg-red-100 text-red-800' : a.severity === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                          {a.severity}
                        </Badge>
                      )}
                    </div>
                    {a.reaction && <p className="text-xs text-slate-400 mt-1">{a.reaction}</p>}
                  </div>
                  {canManageAllergies(user?.role) && (
                    <button onClick={() => deleteAllergy(a.id)} className="p-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-400" />
            Emergency Contact
          </h2>
          <div className="space-y-2">
            <div><p className="text-slate-400 text-sm">Contact Person</p><p className="text-white font-medium">{patient.emergencyContactName || '—'}</p></div>
            <div><p className="text-slate-400 text-sm">Phone Number</p><p className="text-white font-medium">{patient.emergencyContactPhone || '—'}</p></div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            Medical History
          </h2>
          {encounters.length === 0 ? (
            <p className="text-slate-400 text-sm">No past encounters recorded</p>
          ) : (
            <div className="space-y-2">
              {encounters.map((enc) => (
                <Link key={enc.id} href={`/dashboard/encounters/${enc.id}`}>
                  <div className="bg-white/5 hover:bg-white/10 rounded-lg px-4 py-3 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{enc.diagnosis || enc.chiefComplaint || 'Encounter'}</p>
                      <p className="text-xs text-slate-400">{new Date(enc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Dr. {enc.User?.fullName}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Documents
            </h2>
            {canManageDocuments(user?.role) && (
              <>
                <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline" size="sm" className="gap-2 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20">
                  <Upload className="w-4 h-4" />{uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </>
            )}
          </div>
          {docError && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm mb-3">{docError}</div>}
          {documents.length === 0 ? (
            <p className="text-slate-400 text-sm">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-slate-400">{doc.category} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleView(doc)} className="p-2 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300" title="View">
                      <Download className="w-4 h-4" />
                    </button>
                    {canManageDocuments(user?.role) && (
                      <button onClick={() => handleDelete(doc)} className="p-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

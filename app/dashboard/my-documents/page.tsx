'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { FileText, Eye, FolderOpen } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Contract',
  LICENSE: 'License',
  CERTIFICATION: 'Certification',
  ID: 'ID Document',
  OTHER: 'Other',
};

export default function MyDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from('StaffDocument').select('*').eq('userId', user.id).order('uploadedAt', { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const handleView = async (doc: any) => {
    const { data, error: err } = await supabase.storage.from('staff-documents').createSignedUrl(doc.fileUrl, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else setError(err?.message || 'Could not open document');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
          <FolderOpen className="w-7 h-7 text-indigo-300" />My Documents
        </h1>
        <p className="text-gray-400 mt-2">Your contracts, licenses, and certifications on file</p>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="text-gray-400 p-6">No documents on file yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-gray-400">
                      {TYPE_LABELS[doc.type] || doc.type}
                      {doc.expiryDate ? ` • Expires ${new Date(doc.expiryDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleView(doc)} className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300"><Eye className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { canManagePatients } from '@/lib/permissions';
import { exportToCsv } from '@/lib/csv-export';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Download, CheckCircle2, XCircle } from 'lucide-react';
import { RoleGuard } from '@/components/dashboard/role-guard';

interface ParsedRow {
  rowNumber: number;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  cnic: string;
  address: string;
  city: string;
  bloodGroup: string;
  fatherOrHusbandName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  error?: string;
}

const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export default function PatientImportPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  const downloadTemplate = () => {
    exportToCsv('patient-import-template', [
      {
        fullName: 'Ayesha Khan',
        phone: '03001234567',
        email: 'ayesha@example.com',
        dateOfBirth: '1990-05-14',
        gender: 'FEMALE',
        cnic: '3520112345671',
        address: 'House 12, Street 4',
        city: 'Lahore',
        bloodGroup: 'O+',
        fatherOrHusbandName: 'Ahmed Khan',
        emergencyContactName: 'Ahmed Khan',
        emergencyContactPhone: '03007654321',
      },
    ]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: ParsedRow[] = (results.data as any[]).map((row, i) => {
          const fullName = (row.fullName || '').trim();
          const gender = (row.gender || 'OTHER').trim().toUpperCase();
          let rowError: string | undefined;
          if (!fullName) rowError = 'Missing full name';
          else if (!VALID_GENDERS.includes(gender)) rowError = 'Gender must be MALE, FEMALE, or OTHER';

          return {
            rowNumber: i + 2, // account for header row
            fullName,
            phone: (row.phone || '').trim(),
            email: (row.email || '').trim(),
            dateOfBirth: (row.dateOfBirth || '').trim(),
            gender,
            cnic: (row.cnic || '').trim(),
            address: (row.address || '').trim(),
            city: (row.city || '').trim(),
            bloodGroup: (row.bloodGroup || '').trim(),
            fatherOrHusbandName: (row.fatherOrHusbandName || '').trim(),
            emergencyContactName: (row.emergencyContactName || '').trim(),
            emergencyContactPhone: (row.emergencyContactPhone || '').trim(),
            error: rowError,
          };
        });
        setRows(parsed);
      },
      error: (err) => setError(err.message),
    });
  };

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);

  const handleImport = async () => {
    setImporting(true);
    setError('');
    let success = 0;
    let failed = 0;

    for (const row of validRows) {
      const mrn = `MRN-${Date.now().toString().slice(-8)}-${success}`;
      const { error: insertError } = await supabase.from('Patient').insert({
        hospitalId: user?.hospitalId,
        mrn,
        fullName: row.fullName,
        phone: row.phone || null,
        email: row.email || null,
        dateOfBirth: row.dateOfBirth || null,
        gender: row.gender,
        cnic: row.cnic || null,
        address: row.address || null,
        city: row.city || null,
        bloodGroup: row.bloodGroup || null,
        fatherOrHusbandName: row.fatherOrHusbandName || null,
        emergencyContactName: row.emergencyContactName || null,
        emergencyContactPhone: row.emergencyContactPhone || null,
      });
      if (insertError) failed++;
      else success++;
    }

    setImporting(false);
    setResult({ success, failed });
    setRows([]);
  };

  return (
    <RoleGuard allowed={canManagePatients(user?.role)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold heading-gradient">Import Patients</h1>
            <p className="text-gray-400 mt-2">Bulk-import existing patient records from a CSV file</p>
          </div>
          <Link href="/dashboard/patients">
            <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Patients</Button>
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-white font-semibold">1. Download the template (optional)</p>
              <p className="text-xs text-gray-400">Only <span className="font-mono">fullName</span> and <span className="font-mono">gender</span> are required — everything else is optional.</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="w-4 h-4" />Download Template</Button>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-white font-semibold mb-2">2. Upload your CSV</p>
            <label className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer w-fit text-sm text-gray-200">
              <Upload className="w-4 h-4" />
              {fileName || 'Choose CSV file'}
              <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </label>
          </div>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        {result && (
          <div className="glass-card rounded-2xl p-6 flex items-center gap-6">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-5 h-5" /><span className="font-semibold">{result.success} imported</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2 text-red-300">
                <XCircle className="w-5 h-5" /><span className="font-semibold">{result.failed} failed</span>
              </div>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-white font-semibold">3. Review & Import</p>
                <p className="text-xs text-gray-400">
                  {validRows.length} row{validRows.length === 1 ? '' : 's'} ready to import
                  {invalidRows.length > 0 && `, ${invalidRows.length} with errors (will be skipped)`}
                </p>
              </div>
              <Button onClick={handleImport} disabled={importing || validRows.length === 0} className="gap-2 gradient-primary">
                {importing ? 'Importing...' : `Import ${validRows.length} Patients`}
              </Button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-white/10 text-left text-gray-400">
                    <th className="py-2 px-4">Row</th>
                    <th className="py-2 px-4">Name</th>
                    <th className="py-2 px-4">Gender</th>
                    <th className="py-2 px-4">Phone</th>
                    <th className="py-2 px-4">City</th>
                    <th className="py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNumber} className={`border-b border-white/5 ${r.error ? 'bg-red-500/5' : ''}`}>
                      <td className="py-2 px-4 text-gray-500">{r.rowNumber}</td>
                      <td className="py-2 px-4 text-white">{r.fullName || '—'}</td>
                      <td className="py-2 px-4 text-gray-300">{r.gender}</td>
                      <td className="py-2 px-4 text-gray-300">{r.phone || '—'}</td>
                      <td className="py-2 px-4 text-gray-300">{r.city || '—'}</td>
                      <td className="py-2 px-4">
                        {r.error ? (
                          <span className="text-red-400 text-xs">{r.error}</span>
                        ) : (
                          <span className="text-emerald-400 text-xs">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { currencySymbol } from '@/lib/currency';
import { canManageFinances } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Plus, Trash2, Pencil, Check, X, Repeat, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Equipment', 'Maintenance', 'Supplies', 'Marketing', 'Other'];

export default function ExpensesPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = currencySymbol(settings.currency);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: 'Rent', description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), departmentId: '' });
  const [departments, setDepartments] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ category: '', description: '', amount: '', expenseDate: '', departmentId: '' });

  const [recurring, setRecurring] = useState<any[]>([]);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ category: 'Rent', description: '', amount: '', departmentId: '', dayOfMonth: '1' });

  const load = async () => {
    const [expRes, deptRes, recRes] = await Promise.all([
      supabase.from('Expense').select('*, Department(name)').order('expenseDate', { ascending: false }).limit(200),
      supabase.from('Department').select('id, name').order('name'),
      supabase.from('RecurringExpense').select('*, Department(name)').order('dayOfMonth'),
    ]);
    setExpenses(expRes.data || []);
    setDepartments(deptRes.data || []);
    setRecurring(recRes.data || []);
    setLoading(false);
    return recRes.data || [];
  };

  // Generates this month's expense from any active recurring template that
  // hasn't already been generated for the current period. Since there's no
  // background job runner, this runs opportunistically whenever an admin
  // visits this page -- catches up automatically, even after a gap.
  const generateDueRecurringExpenses = async (templates: any[]) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const due = templates.filter((t) => t.isActive && (t.lastGeneratedMonth !== month || t.lastGeneratedYear !== year));
    if (due.length === 0) return false;

    for (const t of due) {
      const expenseDate = new Date(year, now.getMonth(), t.dayOfMonth).toISOString().slice(0, 10);
      await supabase.from('Expense').insert({
        hospitalId: user?.hospitalId,
        category: t.category,
        description: t.description ? `${t.description} (auto-generated)` : 'Recurring expense (auto-generated)',
        amount: t.amount,
        expenseDate,
        departmentId: t.departmentId,
        recordedById: user?.id,
      });
      await supabase.from('RecurringExpense').update({ lastGeneratedMonth: month, lastGeneratedYear: year }).eq('id', t.id);
    }
    return true;
  };

  useEffect(() => {
    (async () => {
      const templates = await load();
      const generated = await generateDueRecurringExpenses(templates);
      if (generated) await load();
    })();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('Expense').insert({
      hospitalId: user?.hospitalId,
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      departmentId: form.departmentId || null,
      recordedById: user?.id,
    });
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setForm({ category: 'Rent', description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10), departmentId: '' });
    setShowForm(false);
    await load();
  };

  const startEdit = (expense: any) => {
    setEditingId(expense.id);
    setEditForm({
      category: expense.category,
      description: expense.description || '',
      amount: String(expense.amount),
      expenseDate: expense.expenseDate,
      departmentId: expense.departmentId || '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.amount || Number(editForm.amount) <= 0) { setError('Enter a valid amount.'); return; }
    setError('');
    const { error: updateError } = await supabase.from('Expense').update({
      category: editForm.category,
      description: editForm.description || null,
      amount: Number(editForm.amount),
      expenseDate: editForm.expenseDate,
      departmentId: editForm.departmentId || null,
    }).eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setEditingId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('Expense').delete().eq('id', id);
    await load();
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.amount || Number(recurringForm.amount) <= 0) { setError('Enter a valid amount.'); return; }
    setError('');
    const { error: insertError } = await supabase.from('RecurringExpense').insert({
      hospitalId: user?.hospitalId,
      category: recurringForm.category,
      description: recurringForm.description || null,
      amount: Number(recurringForm.amount),
      departmentId: recurringForm.departmentId || null,
      dayOfMonth: Number(recurringForm.dayOfMonth),
      createdById: user?.id,
    });
    if (insertError) { setError(insertError.message); return; }
    setRecurringForm({ category: 'Rent', description: '', amount: '', departmentId: '', dayOfMonth: '1' });
    setShowRecurringForm(false);
    await load();
  };

  const toggleRecurringActive = async (id: string, isActive: boolean) => {
    await supabase.from('RecurringExpense').update({ isActive: !isActive }).eq('id', id);
    await load();
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm('Delete this recurring expense template? Past generated expenses are unaffected.')) return;
    await supabase.from('RecurringExpense').delete().eq('id', id);
    await load();
  };

  if (!canManageFinances(user?.role)) {
    return <div className="text-gray-400">This page is only available to admins and accountants.</div>;
  }

  const thisMonthTotal = expenses
    .filter((e) => {
      const d = new Date(e.expenseDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold heading-gradient flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-300" />Expenses
          </h1>
          <p className="text-gray-400 mt-2">Rent, utilities, supplies, and other operating costs</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2 gradient-primary"><Plus className="w-4 h-4" />Add Expense</Button>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <p className="text-xs text-gray-400 uppercase tracking-wider">This Month</p>
        <p className="text-2xl font-bold text-white">{currency} {thisMonthTotal.toLocaleString()}</p>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card rounded-2xl p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white">
              {CATEGORIES.map((c) => <option key={c} value={c} className="text-black">{c}</option>)}
            </select>
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white">
              <option value="" className="text-black">No department</option>
              {departments.map((d) => <option key={d.id} value={d.id} className="text-black">{d.name}</option>)}
            </select>
            <Input type="number" min={0} placeholder={`Amount (${currency})`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white" />
            <Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white" />
            <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="glass-input px-4 py-3 rounded-lg text-white sm:col-span-2" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="gradient-primary">{saving ? 'Saving...' : 'Save Expense'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <button onClick={() => setShowRecurring((v) => !v)} className="w-full flex items-center justify-between p-6">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-cyan-300" />
            <div className="text-left">
              <h2 className="text-lg font-bold text-white">Recurring Expenses</h2>
              <p className="text-xs text-gray-400">Set up once, auto-generated every month (e.g. rent on the 1st)</p>
            </div>
          </div>
          {showRecurring ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showRecurring && (
          <div className="px-6 pb-6 space-y-3">
            <Button type="button" size="sm" onClick={() => setShowRecurringForm((v) => !v)} className="gap-2 gradient-primary">
              <Plus className="w-3.5 h-3.5" />Add Recurring Expense
            </Button>

            {showRecurringForm && (
              <form onSubmit={handleAddRecurring} className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={recurringForm.category} onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c} className="text-black">{c}</option>)}
                  </select>
                  <select value={recurringForm.departmentId} onChange={(e) => setRecurringForm({ ...recurringForm, departmentId: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
                    <option value="" className="text-black">No department</option>
                    {departments.map((d) => <option key={d.id} value={d.id} className="text-black">{d.name}</option>)}
                  </select>
                  <Input type="number" min={0} placeholder={`Amount (${currency})`} value={recurringForm.amount} onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                  <Input type="number" min={1} max={28} placeholder="Day of month (1-28)" value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm({ ...recurringForm, dayOfMonth: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                  <Input placeholder="Description (optional)" value={recurringForm.description} onChange={(e) => setRecurringForm({ ...recurringForm, description: e.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm sm:col-span-2" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="gradient-primary">Save</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowRecurringForm(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {recurring.length === 0 ? (
              <p className="text-gray-400 text-sm">No recurring expenses set up yet.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {recurring.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${r.isActive ? 'text-white' : 'text-gray-500 line-through'}`}>
                        {r.category}{r.Department?.name ? ` · ${r.Department.name}` : ''}{r.description ? ` — ${r.description}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">Day {r.dayOfMonth} of every month</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-semibold text-sm">{currency} {Number(r.amount).toLocaleString()}</p>
                      <button onClick={() => toggleRecurringActive(r.id, r.isActive)} className={`text-xs px-2 py-1 rounded-lg ${r.isActive ? 'bg-emerald-600/30 text-emerald-300' : 'bg-gray-600/30 text-gray-400'}`}>
                        {r.isActive ? 'Active' : 'Paused'}
                      </button>
                      <button onClick={() => handleDeleteRecurring(r.id)} className="p-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-gray-400 p-6">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 p-6">No expenses recorded yet</p>
        ) : (
          <div className="divide-y divide-white/10">
            {expenses.map((e) => (
              <div key={e.id} className="p-4">
                {editingId === e.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select value={editForm.category} onChange={(ev) => setEditForm({ ...editForm, category: ev.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
                        {CATEGORIES.map((c) => <option key={c} value={c} className="text-black">{c}</option>)}
                      </select>
                      <select value={editForm.departmentId} onChange={(ev) => setEditForm({ ...editForm, departmentId: ev.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm">
                        <option value="" className="text-black">No department</option>
                        {departments.map((d) => <option key={d.id} value={d.id} className="text-black">{d.name}</option>)}
                      </select>
                      <Input type="number" min={0} value={editForm.amount} onChange={(ev) => setEditForm({ ...editForm, amount: ev.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                      <Input type="date" value={editForm.expenseDate} onChange={(ev) => setEditForm({ ...editForm, expenseDate: ev.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm" />
                      <Input placeholder="Description" value={editForm.description} onChange={(ev) => setEditForm({ ...editForm, description: ev.target.value })} className="glass-input px-3 py-2 rounded-lg text-white text-sm sm:col-span-2" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(e.id)} className="p-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{e.category}{e.Department?.name ? ` · ${e.Department.name}` : ''}{e.description ? ` — ${e.description}` : ''}</p>
                      <p className="text-xs text-gray-400">{new Date(e.expenseDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-semibold">{currency} {Number(e.amount).toLocaleString()}</p>
                      <button onClick={() => startEdit(e)} className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

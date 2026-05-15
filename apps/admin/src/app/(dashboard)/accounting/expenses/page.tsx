'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBDT, formatDate } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Logistics', 'Equipment', 'Software', 'Maintenance', 'Travel', 'Other'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', amount: 0, category: '', date: new Date().toISOString().slice(0,10), description: '', paymentMethod: 'BANK', reference: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get('/accounting/expenses?limit=100').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/accounting/expenses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setOpen(false); toast.success('Expense recorded'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounting/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Deleted'); },
  });

  const expenses = data?.items ?? data ?? [];
  const totalThisMonth = expenses.filter((e: any) => {
    const d = new Date(e.date ?? e.createdAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s: number, e: any) => s + e.amount, 0);

  const byCategory = CATEGORIES.map(c => ({
    category: c,
    total: expenses.filter((e: any) => e.category === c).reduce((s: number, x: any) => s + x.amount, 0),
  })).filter(c => c.total > 0).sort((a,b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6" />Expenses</h1><p className="text-muted-foreground text-sm">Track business expenses and costs</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Record Expense</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold text-red-600">{formatBDT(totalThisMonth)}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatBDT(expenses.reduce((s: number, e: any) => s + e.amount, 0))}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Records</p><p className="text-2xl font-bold">{expenses.length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses Table */}
        <div className="lg:col-span-2">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>{['Title', 'Category', 'Amount', 'Date', 'Method', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? Array.from({length:5}).map((_,i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                    expenses.map((e: any) => (
                      <tr key={e.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{e.title}</p>
                          {e.description && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{e.description}</p>}
                        </td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{e.category}</Badge></td>
                        <td className="px-4 py-3 font-semibold text-red-600">{formatBDT(e.amount)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(e.date ?? e.createdAt)}</td>
                        <td className="px-4 py-3 text-xs">{e.paymentMethod}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* By Category */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">By Category</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byCategory.map((c, i) => {
              const max = byCategory[0]?.total ?? 1;
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{c.category}</span>
                    <span className="text-muted-foreground">{formatBDT(c.total)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(c.total / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {byCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Office Rent - May" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Amount (৳)</Label><Input type="number" min={0} value={form.amount || ''} onChange={e => setForm(f => ({...f, amount: Number(e.target.value)}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({...f, paymentMethod: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['CASH','BANK','CARD','BKASH','NAGAD'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Reference (optional)</Label><Input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} placeholder="Receipt #, Voucher #" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.title || !form.amount || !form.category}>
              {createMutation.isPending ? 'Saving...' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

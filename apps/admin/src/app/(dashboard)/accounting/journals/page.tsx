'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBDT, formatDateTime } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface JournalLine { accountId: string; description: string; debit: number; credit: number; }

export default function JournalEntriesPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: '', reference: '', date: new Date().toISOString().slice(0,10), lines: [{ accountId: '', description: '', debit: 0, credit: 0 }, { accountId: '', description: '', debit: 0, credit: 0 }] as JournalLine[] });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => api.get('/accounting/journal-entries?limit=50').then(r => r.data.data),
  });

  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => api.get('/accounting/accounts').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/accounting/journal-entries', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal-entries'] }); setOpen(false); toast.success('Journal entry posted'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed — check debit/credit balance'),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => api.post(`/accounting/journal-entries/${id}/post`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal-entries'] }); toast.success('Entry posted'); },
  });

  const entries = data?.items ?? data ?? [];
  const accountList = accounts?.items ?? accounts ?? [];

  const totalDebit = form.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const balanced = totalDebit > 0 && totalDebit === totalCredit;

  const updateLine = (i: number, field: keyof JournalLine, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { accountId: '', description: '', debit: 0, credit: 0 }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" />Journal Entries</h1><p className="text-muted-foreground text-sm">Double-entry bookkeeping records</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New Entry</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Entry #', 'Date', 'Description', 'Reference', 'Lines', 'Total', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length:6}).map((_,i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                entries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{e.entryNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(e.date ?? e.createdAt)}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.description}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.reference ?? '—'}</td>
                    <td className="px-4 py-3">{e.lines?.length ?? 0}</td>
                    <td className="px-4 py-3 font-semibold">{formatBDT(e.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) ?? 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={e.isPosted ? 'default' : 'secondary'} className={`text-xs ${e.isPosted ? 'bg-emerald-100 text-emerald-700 border-0' : ''}`}>{e.isPosted ? 'Posted' : 'Draft'}</Badge>
                        {!e.isPosted && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => postMutation.mutate(e.id)}><CheckCircle className="w-3 h-3 mr-1" />Post</Button>}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Reference (optional)</Label><Input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} placeholder="Invoice #, PO #, etc." /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lines</Label>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {balanced ? '✓ Balanced' : `Unbalanced: Dr ${formatBDT(totalDebit)} vs Cr ${formatBDT(totalCredit)}`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span className="col-span-4">Account</span><span className="col-span-3">Description</span><span className="col-span-2 text-right">Debit</span><span className="col-span-2 text-right">Credit</span><span className="col-span-1" />
                </div>
                {form.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Select value={line.accountId} onValueChange={v => updateLine(i, 'accountId', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Account..." /></SelectTrigger>
                        <SelectContent>{accountList.map((a: any) => <SelectItem key={a.id} value={a.id} className="text-xs">{a.code} — {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input className="col-span-3 h-8 text-xs" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Note..." />
                    <Input className="col-span-2 h-8 text-xs text-right" type="number" min={0} value={line.debit || ''} onChange={e => updateLine(i, 'debit', Number(e.target.value))} placeholder="0" />
                    <Input className="col-span-2 h-8 text-xs text-right" type="number" min={0} value={line.credit || ''} onChange={e => updateLine(i, 'credit', Number(e.target.value))} placeholder="0" />
                    <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeLine(i)} disabled={form.lines.length <= 2}><XCircle className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={addLine}><Plus className="w-3 h-3 mr-1" />Add Line</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.description || !balanced}>
              {createMutation.isPending ? 'Posting...' : 'Post Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

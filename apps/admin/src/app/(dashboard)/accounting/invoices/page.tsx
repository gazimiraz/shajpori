'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Download, Send, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBDT, formatDate } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, status],
    queryFn: () => api.get('/accounting/invoices', { params: { search: search || undefined, status: status || undefined, limit: 50 } }).then(r => r.data.data),
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/accounting/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `invoice-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error('Failed to download'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/accounting/invoices/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice sent'); },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/accounting/invoices/${id}`, { status: 'PAID', paidAt: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Marked as paid'); },
  });

  const invoices = data?.items ?? data ?? [];
  const totalOutstanding = invoices.filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'CANCELLED').reduce((s: number, inv: any) => s + (inv.total - (inv.paidAmount ?? 0)), 0);
  const totalPaid = invoices.filter((inv: any) => inv.status === 'PAID').reduce((s: number, inv: any) => s + inv.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" />Invoices</h1><p className="text-muted-foreground text-sm">Customer invoices and payments</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length },
          { label: 'Outstanding', value: formatBDT(totalOutstanding), color: 'text-amber-600' },
          { label: 'Paid', value: formatBDT(totalPaid), color: 'text-emerald-600' },
          { label: 'Overdue', value: invoices.filter((inv: any) => inv.status === 'OVERDUE').length, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className={cn('text-2xl font-bold', s.color ?? '')}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice # or customer..." className="max-w-xs" />
        <div className="flex gap-2">
          {['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(s => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s || 'All'}</Button>
          ))}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Amount', 'Paid', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length:6}).map((_,i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.customer?.firstName} {inv.customer?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{inv.customer?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(inv.issuedAt ?? inv.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.dueAt ? formatDate(inv.dueAt) : '—'}</td>
                    <td className="px-4 py-3 font-semibold">{formatBDT(inv.total)}</td>
                    <td className="px-4 py-3">{formatBDT(inv.paidAmount ?? 0)}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status] ?? STATUS_COLOR['DRAFT']}`}>{inv.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadMutation.mutate(inv.id)} title="Download PDF"><Download className="w-3.5 h-3.5" /></Button>
                        {inv.status === 'DRAFT' && <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => sendMutation.mutate(inv.id)} title="Send"><Send className="w-3.5 h-3.5" /></Button>}
                        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => markPaidMutation.mutate(inv.id)} title="Mark Paid"><CheckCircle className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

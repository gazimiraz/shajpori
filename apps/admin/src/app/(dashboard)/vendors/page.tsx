'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, CheckCircle, XCircle, AlertCircle, Eye, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatBDT, formatDate } from '@shaj/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  SUSPENDED: 'bg-red-100 text-red-700 border-red-200',
  REJECTED: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function VendorsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', status, search],
    queryFn: () => api.get('/vendors', { params: { status: status || undefined, search: search || undefined, limit: 50 } }).then(r => r.data.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/vendors/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor approved'); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) => api.post(`/vendors/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor rejected'); },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/vendors/${id}/suspend`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor suspended'); },
  });

  const vendors = data?.items ?? data ?? [];
  const stats = { total: vendors.length, approved: vendors.filter((v: any) => v.status === 'APPROVED').length, pending: vendors.filter((v: any) => v.status === 'PENDING').length, suspended: vendors.filter((v: any) => v.status === 'SUSPENDED').length };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Vendors</h1><p className="text-muted-foreground text-sm">Manage marketplace vendors</p></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Vendors', value: stats.total, color: 'text-foreground' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
          { label: 'Suspended', value: stats.suspended, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={cn('text-2xl font-bold', s.color)}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="max-w-xs" />
        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'SUSPENDED'].map(s => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>
              {s || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Store', 'Contact', 'Products', 'Total Sales', 'Commission', 'Status', 'Joined', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length: 6}).map((_, i) => (
                <tr key={i}>{Array.from({length: 8}).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>
              )) : vendors.map((v: any) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {v.logoUrl ? <img src={v.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <Store className="w-4 h-4 text-primary" />}
                      </div>
                      <div><p className="font-medium">{v.storeName}</p><p className="text-xs text-muted-foreground">{v.storeSlug}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><p>{v.user?.firstName} {v.user?.lastName}</p><p className="text-xs text-muted-foreground">{v.email}</p></td>
                  <td className="px-4 py-3">{v._count?.products ?? 0}</td>
                  <td className="px-4 py-3 font-medium">{formatBDT(v.totalSales ?? 0)}</td>
                  <td className="px-4 py-3">{v.commissionRate}%</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-700')}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(v.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={`/vendors/${v.id}`}><Eye className="w-4 h-4" /></Link></Button>
                      {v.status === 'PENDING' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => approveMutation.mutate(v.id)}><CheckCircle className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => rejectMutation.mutate({ id: v.id, reason: 'Rejected by admin' })}><XCircle className="w-4 h-4" /></Button>
                        </>
                      )}
                      {v.status === 'APPROVED' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700" onClick={() => suspendMutation.mutate(v.id)}><AlertCircle className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

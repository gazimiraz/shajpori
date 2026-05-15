'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Plus, CheckCircle, Truck, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  PENDING: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  IN_TRANSIT: { color: 'bg-blue-100 text-blue-700', icon: Truck },
  COMPLETED: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  CANCELLED: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function TransfersPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: 1, notes: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: () => api.get('/warehouse/transfers?limit=50').then(r => r.data.data),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouse').then(r => r.data.data),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-simple'],
    queryFn: () => api.get('/products?limit=200&select=id,name,sku').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/warehouse/transfer', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); setOpen(false); toast.success('Transfer initiated'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/warehouse/transfer/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Transfer approved'); },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/warehouse/transfer/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Transfer completed'); },
  });

  const transfers = data?.items ?? data ?? [];
  const warehouses = warehousesData?.items ?? warehousesData ?? [];
  const products = productsData?.items ?? productsData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><ArrowRightLeft className="w-6 h-6" />Stock Transfers</h1><p className="text-muted-foreground text-sm">Move inventory between warehouses</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New Transfer</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Transfer #', 'From', 'To', 'Product', 'Qty', 'Status', 'Date', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length:5}).map((_,i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                transfers.map((t: any) => {
                  const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG['PENDING'];
                  const Icon = cfg.icon;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{t.transferNumber ?? t.id.slice(0,8)}</td>
                      <td className="px-4 py-3">{t.fromWarehouse?.name}</td>
                      <td className="px-4 py-3">{t.toWarehouse?.name}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[160px]">{t.product?.name}</p>
                        <p className="text-xs text-muted-foreground">{t.product?.sku}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold">{t.quantity}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {t.status === 'PENDING' && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => approveMutation.mutate(t.id)}>Approve</Button>}
                          {t.status === 'IN_TRANSIT' && <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => completeMutation.mutate(t.id)}>Complete</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Warehouse</Label>
                <Select value={form.fromWarehouseId} onValueChange={v => setForm(f => ({...f, fromWarehouseId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To Warehouse</Label>
                <Select value={form.toWarehouseId} onValueChange={v => setForm(f => ({...f, toWarehouseId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{warehouses.filter((w: any) => w.id !== form.fromWarehouseId).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({...f, productId: v}))}>
                <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: Number(e.target.value)}))} min={1} /></div>
            <div className="space-y-1.5"><Label>Notes (optional)</Label><Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.fromWarehouseId || !form.toWarehouseId || !form.productId}>
              {createMutation.isPending ? 'Creating...' : 'Initiate Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

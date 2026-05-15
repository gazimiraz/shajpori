'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Warehouse, Plus, MapPin, Package, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function WarehousesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', isDefault: false });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouse').then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? api.patch(`/warehouse/${editing.id}`, d) : api.post('/warehouse', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setOpen(false); setEditing(null); toast.success(editing ? 'Warehouse updated' : 'Warehouse created'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/warehouse/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); toast.success('Deleted'); },
  });

  const warehouses = data?.items ?? data ?? [];

  const openEdit = (w: any) => { setEditing(w); setForm({ name: w.name, code: w.code, address: w.address ?? '', city: w.city ?? '', isDefault: w.isDefault }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ name: '', code: '', address: '', city: '', isDefault: false }); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Warehouse className="w-6 h-6" />Warehouses</h1><p className="text-muted-foreground text-sm">Manage storage locations</p></div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Warehouse</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-40 rounded-xl" />) :
          warehouses.map((w: any) => (
            <Card key={w.id} className={w.isDefault ? 'ring-2 ring-primary' : ''}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Warehouse className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1">
                    {w.isDefault && <Badge variant="default" className="text-xs">Default</Badge>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(w.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <p className="font-semibold">{w.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{w.code}</p>
                {(w.address || w.city) && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{[w.address, w.city].filter(Boolean).join(', ')}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>{w._count?.inventoryItems ?? 0} SKUs</span>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="WH01" /></div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({...f, isDefault: e.target.checked}))} className="rounded" />
              Set as default warehouse
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.code}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

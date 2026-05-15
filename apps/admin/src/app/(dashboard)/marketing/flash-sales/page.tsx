'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Plus, Clock, Percent, Trash2, Edit, Play, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatBDT, formatDateTime } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff <= 0) return <span className="text-red-500 text-xs font-mono">Ended</span>;
  return <span className="font-mono text-sm font-bold text-amber-600">{h}h {m}m {s}s</span>;
}

export default function FlashSalesPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', discountType: 'PERCENTAGE', discountValue: 10, startsAt: '', endsAt: '', isActive: true });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['flash-sales'],
    queryFn: () => api.get('/marketing/flash-sales').then(r => r.data.data ?? []),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/marketing/flash-sales', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flash-sales'] }); setOpen(false); toast.success('Flash sale created'); },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => api.post(`/marketing/flash-sales/${id}/end`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flash-sales'] }); toast.success('Flash sale ended'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/flash-sales/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flash-sales'] }); toast.success('Deleted'); },
  });

  const flashSales = Array.isArray(data) ? data : (data?.items ?? []);
  const active = flashSales.filter((s: any) => s.isActive && new Date(s.endsAt) > new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-amber-500" />Flash Sales</h1><p className="text-muted-foreground text-sm">Time-limited discount events</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Flash Sale</Button>
      </div>

      {/* Active Sales */}
      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">🔥 Active Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map((sale: any) => (
              <motion.div key={sale.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-base">{sale.name}</p>
                        {sale.description && <p className="text-xs text-muted-foreground mt-0.5">{sale.description}</p>}
                      </div>
                      <Badge className="bg-amber-500 text-white border-0 text-lg px-3">{sale.discountValue}{sale.discountType === 'PERCENTAGE' ? '%' : '৳'} OFF</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Ends in:</span>
                      <CountdownTimer endsAt={sale.endsAt} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => endMutation.mutate(sale.id)}>
                        <Square className="w-3 h-3 mr-1" />End Now
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(sale.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Sales */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">All Flash Sales</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Name', 'Discount', 'Start', 'End', 'Products', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length:4}).map((_,i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                flashSales.map((sale: any) => {
                  const now = new Date();
                  const isRunning = sale.isActive && new Date(sale.startsAt) <= now && new Date(sale.endsAt) > now;
                  const isScheduled = sale.isActive && new Date(sale.startsAt) > now;
                  const isEnded = !sale.isActive || new Date(sale.endsAt) <= now;
                  return (
                    <tr key={sale.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{sale.name}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{sale.discountValue}{sale.discountType === 'PERCENTAGE' ? '%' : '৳'} OFF</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(sale.startsAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(sale.endsAt)}</td>
                      <td className="px-4 py-3">{sale._count?.products ?? 0}</td>
                      <td className="px-4 py-3">
                        {isRunning && <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>}
                        {isScheduled && <Badge className="bg-blue-100 text-blue-700 border-0">Scheduled</Badge>}
                        {isEnded && <Badge variant="secondary">Ended</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {!isEnded && <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => endMutation.mutate(sale.id)}><Square className="w-3 h-3" /></Button>}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(sale.id)}><Trash2 className="w-3 h-3" /></Button>
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

      {/* Create Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Flash Sale</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Sale Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Eid Mega Sale" /></div>
            <div className="space-y-1.5"><Label>Description (optional)</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <select value={form.discountType} onChange={e => setForm(f => ({...f, discountType: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed Amount (৳)</option>
                </select>
              </div>
              <div className="space-y-1.5"><Label>Value</Label><Input type="number" value={form.discountValue} onChange={e => setForm(f => ({...f, discountValue: Number(e.target.value)}))} min={0} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start Date & Time</Label><Input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({...f, startsAt: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>End Date & Time</Label><Input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({...f, endsAt: e.target.value}))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name || !form.startsAt || !form.endsAt}>
              {createMutation.isPending ? 'Creating...' : 'Create Flash Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface Brand { id: string; name: string; slug: string; logoUrl?: string; websiteUrl?: string; isActive: boolean; _count?: { products: number } }

export default function BrandsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', websiteUrl: '', isActive: true });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands').then(r => r.data.data?.items ?? r.data.data ?? []),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editing
      ? api.patch(`/brands/${editing.id}`, payload)
      : api.post('/brands', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); setOpen(false); toast.success(editing ? 'Brand updated' : 'Brand created'); },
    onError: () => toast.error('Failed to save brand'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success('Brand deleted'); },
  });

  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', websiteUrl: '', isActive: true }); setOpen(true); };
  const openEdit = (b: Brand) => { setEditing(b); setForm({ name: b.name, slug: b.slug, websiteUrl: b.websiteUrl || '', isActive: b.isActive }); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Brands</h1><p className="text-muted-foreground text-sm">Manage product brands</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Brand</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({length: 12}).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(data ?? []).map(brand => (
            <motion.div key={brand.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="w-16 h-16 bg-muted rounded-lg mx-auto mb-3 flex items-center justify-center overflow-hidden">
                    {brand.logoUrl
                      ? <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain" />
                      : <span className="text-2xl font-bold text-muted-foreground">{brand.name[0]}</span>
                    }
                  </div>
                  <p className="font-semibold text-sm truncate">{brand.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{brand._count?.products ?? 0} products</p>
                  <Badge variant={brand.isActive ? 'default' : 'secondary'} className="mt-2 text-xs">{brand.isActive ? 'Active' : 'Inactive'}</Badge>
                  <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(brand)}><Pencil className="w-3 h-3" /></Button>
                    {brand.websiteUrl && <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={brand.websiteUrl} target="_blank"><ExternalLink className="w-3 h-3" /></a></Button>}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(brand.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Brand' : 'Add Brand'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Brand Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')}))} placeholder="e.g. Urban Style" /></div>
            <div className="space-y-1.5"><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({...f, slug: e.target.value}))} /></div>
            <div className="space-y-1.5"><Label>Website URL (optional)</Label><Input value={form.websiteUrl} onChange={e => setForm(f => ({...f, websiteUrl: e.target.value}))} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}>{saveMutation.isPending ? 'Saving...' : 'Save Brand'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

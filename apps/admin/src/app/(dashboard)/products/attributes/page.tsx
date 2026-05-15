'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface AttributeValue { id: string; value: string; colorHex?: string; sortOrder: number }
interface Attribute { id: string; name: string; slug: string; type: string; values: AttributeValue[] }

export default function AttributesPage() {
  const [open, setOpen] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);
  const [selectedAttr, setSelectedAttr] = useState<Attribute | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: '', type: 'select' });
  const [valueForm, setValueForm] = useState({ value: '', colorHex: '' });
  const qc = useQueryClient();

  const { data: attributes = [], isLoading } = useQuery<Attribute[]>({
    queryKey: ['attributes'],
    queryFn: () => api.get('/products/attributes').then(r => r.data.data ?? []),
  });

  const createAttr = useMutation({
    mutationFn: (d: any) => api.post('/products/attributes', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setOpen(false); toast.success('Attribute created'); },
  });

  const deleteAttr = useMutation({
    mutationFn: (id: string) => api.delete(`/products/attributes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); toast.success('Deleted'); },
  });

  const addValue = useMutation({
    mutationFn: ({ attrId, ...d }: any) => api.post(`/products/attributes/${attrId}/values`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setValueOpen(false); toast.success('Value added'); },
  });

  const deleteValue = useMutation({
    mutationFn: ({ attrId, valueId }: any) => api.delete(`/products/attributes/${attrId}/values/${valueId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attributes'] }),
  });

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Product Attributes</h1><p className="text-muted-foreground text-sm">Define size, color and other variation attributes</p></div>
        <Button onClick={() => { setForm({ name: '', type: 'select' }); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Attribute</Button>
      </div>

      <div className="space-y-3">
        {isLoading ? Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />) :
          attributes.map(attr => (
            <Card key={attr.id}>
              <CardContent className="p-0">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggle(attr.id)}>
                  {expanded.has(attr.id) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-medium flex-1">{attr.name}</span>
                  <Badge variant="outline" className="text-xs">{attr.type}</Badge>
                  <Badge variant="secondary" className="text-xs">{attr.values.length} values</Badge>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedAttr(attr); setValueForm({ value: '', colorHex: '' }); setValueOpen(true); }}><Plus className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteAttr.mutate(attr.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                {expanded.has(attr.id) && (
                  <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    {attr.values.map(v => (
                      <div key={v.id} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-sm group">
                        {v.colorHex && <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: v.colorHex }} />}
                        <span>{v.value}</span>
                        <button onClick={() => deleteValue.mutate({ attrId: attr.id, valueId: v.id })} className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">×</button>
                      </div>
                    ))}
                    {attr.values.length === 0 && <p className="text-sm text-muted-foreground">No values yet. Click + to add.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* Create Attribute Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Attribute</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Size, Color, Material" /></div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createAttr.mutate({ ...form, slug: form.name.toLowerCase().replace(/\s+/g,'-') })} disabled={!form.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Value Modal */}
      <Dialog open={valueOpen} onOpenChange={setValueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Value to "{selectedAttr?.name}"</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Value</Label><Input value={valueForm.value} onChange={e => setValueForm(f => ({...f, value: e.target.value}))} placeholder="e.g. Small, Red, Cotton" /></div>
            {selectedAttr?.type === 'color' && (
              <div className="space-y-1.5"><Label>Color Hex</Label>
                <div className="flex gap-2 items-center">
                  <Input type="color" value={valueForm.colorHex || '#000000'} onChange={e => setValueForm(f => ({...f, colorHex: e.target.value}))} className="w-14 h-9 p-1 cursor-pointer" />
                  <Input value={valueForm.colorHex} onChange={e => setValueForm(f => ({...f, colorHex: e.target.value}))} placeholder="#000000" className="flex-1" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueOpen(false)}>Cancel</Button>
            <Button onClick={() => addValue.mutate({ attrId: selectedAttr?.id, ...valueForm })} disabled={!valueForm.value}>Add Value</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

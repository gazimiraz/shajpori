'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Copy, Edit, Trash2, Tag, BarChart2, DollarSign, Loader2, Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatBDT, formatDate } from '@shaj/utils';
import toast from 'react-hot-toast';

interface Coupon {
  id: string;
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usageCount: number;
  usageLimit?: number;
  expiresAt?: string;
  isActive: boolean;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
}

interface CouponForm {
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  expiresAt: string;
  isActive: boolean;
}

const defaultForm: CouponForm = {
  code: '',
  name: '',
  discountType: 'percentage',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: 0,
  usageLimit: 0,
  expiresAt: '',
  isActive: true,
};

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: coupons, isLoading } = useQuery<{ coupons: Coupon[]; stats: any }>({
    queryKey: ['coupons'],
    queryFn: () => api.get('/marketing/coupons').then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingCoupon
        ? api.patch(`/marketing/coupons/${editingCoupon.id}`, form)
        : api.post('/marketing/coupons', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
      setModalOpen(false);
      setEditingCoupon(null);
      setForm(defaultForm);
    },
    onError: () => toast.error('Failed to save coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/marketing/coupons/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Code copied!');
  };

  const openCreate = () => {
    setEditingCoupon(null);
    setForm({ ...defaultForm, code: generateCode() });
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setForm({
      code: c.code,
      name: c.name,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount ?? 0,
      maxDiscountAmount: c.maxDiscountAmount ?? 0,
      usageLimit: c.usageLimit ?? 0,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : '',
      isActive: c.isActive,
    });
    setModalOpen(true);
  };

  const stats = coupons?.stats ?? {};
  const statCards = [
    { label: 'Active Coupons', value: stats.activeCoupons, icon: Tag, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Usage', value: stats.totalUsage?.toLocaleString(), icon: BarChart2, color: 'text-green-600 bg-green-50' },
    { label: 'Discount Given', value: formatBDT(stats.totalDiscount ?? 0), icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage discount codes and promotions</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                {isLoading ? <Skeleton className="h-6 w-16 mt-1" /> : <p className="text-xl font-bold">{value ?? 0}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : (coupons?.coupons ?? []).map((coupon) => (
                  <TableRow key={coupon.id} className="hover:bg-muted/50">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{coupon.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(coupon.id, coupon.code)}
                        >
                          {copiedId === coupon.id
                            ? <Check className="h-3 w-3 text-green-500" />
                            : <Copy className="h-3 w-3" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{coupon.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{coupon.discountType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}%`
                        : formatBDT(coupon.discountValue)
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {coupon.usageCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={coupon.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: coupon.id, isActive: v })}
                      />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(coupon)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(coupon.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SUMMER20"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, code: generateCode() }))}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Summer Sale" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm((f) => ({ ...f, discountType: v as 'percentage' | 'fixed' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value {form.discountType === 'percentage' ? '(%)' : '(BDT)'}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Order (BDT)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minOrderAmount}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Discount (BDT)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: Number(e.target.value) }))}
                  placeholder="0 = unlimited"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: Number(e.target.value) }))}
                  placeholder="0 = unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Expires At</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.code}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCoupon ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

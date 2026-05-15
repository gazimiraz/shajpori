'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Minus, Trash2, ShoppingBag, Clock, DollarSign, Eye, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { name: string };
  warehouse: { name: string };
  status: 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';
  itemsCount: number;
  totalAmount: number;
  expectedDate?: string;
  createdAt: string;
}

interface POItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

const statusVariant: Record<string, any> = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'info',
  received: 'success',
  cancelled: 'destructive',
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [poForm, setPOForm] = useState({
    supplierId: '',
    warehouseId: '',
    expectedDate: '',
    notes: '',
  });
  const [items, setItems] = useState<POItem[]>([{ productId: '', productName: '', quantity: 1, unitPrice: 0 }]);

  const { data, isLoading } = useQuery<{ orders: PurchaseOrder[]; stats: any }>({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchasing/orders').then((r) => r.data),
  });

  const { data: suppliers } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/purchasing/suppliers?limit=100').then((r) => r.data.suppliers ?? r.data),
  });

  const { data: warehouses } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data.data ?? r.data),
  });

  const createMutation = useMutation({
    mutationFn: (sendToSupplier: boolean) =>
      api.post('/purchasing/orders', {
        ...poForm,
        items: items.filter((i) => i.productId && i.quantity > 0),
        sendToSupplier,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created');
      setModalOpen(false);
      setPOForm({ supplierId: '', warehouseId: '', expectedDate: '', notes: '' });
      setItems([{ productId: '', productName: '', quantity: 1, unitPrice: 0 }]);
    },
    onError: () => toast.error('Failed to create PO'),
  });

  const addItem = () =>
    setItems((prev) => [...prev, { productId: '', productName: '', quantity: 1, unitPrice: 0 }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof POItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const stats = data?.stats ?? {};
  const statCards = [
    { label: 'Total POs', value: stats.total, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Value This Month', value: formatBDT(stats.valueThisMonth ?? 0), icon: DollarSign, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage supplier purchase orders</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Create PO
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
              <TableHead className="pl-4">PO #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Expected Date</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : (data?.orders ?? []).map((po) => (
                  <TableRow key={po.id} className="hover:bg-muted/50">
                    <TableCell className="pl-4 font-medium text-primary">#{po.poNumber}</TableCell>
                    <TableCell className="text-sm">{po.supplier.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.warehouse.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[po.status] ?? 'secondary'} className="capitalize">{po.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.itemsCount} items</TableCell>
                    <TableCell className="font-medium">{formatBDT(po.totalAmount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {po.expectedDate ? formatDate(po.expectedDate) : '—'}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create PO Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={poForm.supplierId} onValueChange={(v) => setPOForm((f) => ({ ...f, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {(suppliers ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse *</Label>
                <Select value={poForm.warehouseId} onValueChange={(v) => setPOForm((f) => ({ ...f, warehouseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <Label>Order Items</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Product</th>
                      <th className="text-left px-3 py-2 font-medium w-20">Qty</th>
                      <th className="text-left px-3 py-2 font-medium w-28">Unit Price</th>
                      <th className="text-left px-3 py-2 font-medium w-24">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                            placeholder="Product name"
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs font-medium">
                          {formatBDT(item.quantity * item.unitPrice)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
              <div className="text-right font-bold">Total: {formatBDT(totalAmount)}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input
                  type="date"
                  value={poForm.expectedDate}
                  onChange={(e) => setPOForm((f) => ({ ...f, expectedDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={poForm.notes}
                onChange={(e) => setPOForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="outline"
              onClick={() => createMutation.mutate(false)}
              disabled={createMutation.isPending}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => createMutation.mutate(true)}
              disabled={createMutation.isPending || !poForm.supplierId}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send to Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

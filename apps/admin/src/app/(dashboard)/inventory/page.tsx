'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, AlertTriangle, XCircle, DollarSign, Download, X, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatBDT } from '@shaj/utils';
import toast from 'react-hot-toast';

interface InventoryItem {
  id: string;
  product: { id: string; name: string; imageUrl?: string };
  sku: string;
  warehouseId: string;
  warehouseName: string;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  unitCost: number;
  totalValue: number;
}

interface Warehouse { id: string; name: string }

interface AdjustForm {
  type: 'add' | 'remove' | 'set';
  quantity: number;
  notes: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [warehouseTab, setWarehouseTab] = useState('all');
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ type: 'add', quantity: 0, notes: '' });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data.data ?? r.data),
  });

  const { data: inventory, isLoading } = useQuery<{ items: InventoryItem[]; stats: any }>({
    queryKey: ['inventory', warehouseTab],
    queryFn: () =>
      api.get('/inventory', {
        params: warehouseTab !== 'all' ? { warehouseId: warehouseTab } : undefined,
      }).then((r) => r.data),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      api.post(`/inventory/${adjustingItem?.id}/adjust`, adjustForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock adjusted');
      setAdjustingItem(null);
    },
    onError: () => toast.error('Failed to adjust stock'),
  });

  const handleExport = async () => {
    const res = await api.get('/inventory/export?format=csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = inventory?.stats ?? {};
  const statCards = [
    { label: 'Total Items', value: stats.totalItems?.toLocaleString(), icon: Package, color: 'text-blue-600 bg-blue-50' },
    { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
    { label: 'Out of Stock', value: stats.outOfStock, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Total Value', value: formatBDT(stats.totalValue ?? 0), icon: DollarSign, color: 'text-green-600 bg-green-50' },
  ];

  const stockColor = (qty: number, threshold: number) => {
    if (qty === 0) return 'text-red-600 font-bold';
    if (qty <= threshold) return 'text-orange-500 font-semibold';
    return 'text-green-600 font-medium';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monitor and manage stock levels</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Warehouse Tabs */}
      <Tabs value={warehouseTab} onValueChange={setWarehouseTab}>
        <TabsList>
          <TabsTrigger value="all">All Warehouses</TabsTrigger>
          {(warehouses ?? []).map((w) => (
            <TabsTrigger key={w.id} value={w.id}>{w.name}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={warehouseTab} className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (inventory?.items ?? []).map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            {item.product.imageUrl ? (
                              <img src={item.product.imageUrl} alt={item.product.name} className="h-9 w-9 rounded object-cover border" />
                            ) : (
                              <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium text-sm">{item.product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="text-sm">{item.warehouseName}</TableCell>
                        <TableCell>
                          <span className={stockColor(item.availableQuantity, item.lowStockThreshold)}>
                            {item.availableQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.reservedQuantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.lowStockThreshold}</TableCell>
                        <TableCell className="text-sm">{formatBDT(item.unitCost)}</TableCell>
                        <TableCell className="text-sm font-medium">{formatBDT(item.totalValue)}</TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAdjustingItem(item);
                              setAdjustForm({ type: 'add', quantity: 0, notes: '' });
                            }}
                          >
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjust Stock Modal */}
      <Dialog open={!!adjustingItem} onOpenChange={(open) => !open && setAdjustingItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {adjustingItem?.product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select
                value={adjustForm.type}
                onValueChange={(v) => setAdjustForm((f) => ({ ...f, type: v as AdjustForm['type'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                  <SelectItem value="set">Set Quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Reason for adjustment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustingItem(null)}>Cancel</Button>
            <Button onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

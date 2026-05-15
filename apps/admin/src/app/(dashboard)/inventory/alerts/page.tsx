'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShoppingCart, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LowStockAlert {
  id: string;
  product: { id: string; name: string; imageUrl?: string };
  sku: string;
  warehouseName: string;
  currentStock: number;
  threshold: number;
  reorderSuggestion: number;
}

export default function InventoryAlertsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const { data: alerts, isLoading } = useQuery<LowStockAlert[]>({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get('/inventory/alerts').then((r) => r.data.data ?? r.data),
    refetchInterval: 60000,
  });

  const createPOMutation = useMutation({
    mutationFn: (itemIds: string[]) => api.post('/purchasing/orders/quick', { itemIds }),
    onSuccess: () => {
      toast.success('Purchase order created');
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    },
    onError: () => toast.error('Failed to create PO'),
  });

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleAll = () => {
    const ids = (alerts ?? []).map((a) => a.id);
    setSelected(selected.length === ids.length ? [] : ids);
  };

  const urgencyColor = (current: number, threshold: number) => {
    if (current === 0) return 'text-red-600 bg-red-50';
    if (current <= threshold * 0.5) return 'text-red-500 bg-red-50';
    return 'text-orange-500 bg-orange-50';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Low Stock Alerts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Products below their reorder threshold</p>
        </div>
        {selected.length > 0 && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => createPOMutation.mutate(selected)}
            disabled={createPOMutation.isPending}
          >
            {createPOMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ShoppingCart className="h-4 w-4" />
            }
            Create Purchase Order ({selected.length})
          </Button>
        )}
      </div>

      {!isLoading && (alerts?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-20 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">All stocked up!</h3>
            <p className="text-muted-foreground text-sm">No products are currently below their reorder threshold.</p>
          </CardContent>
        </Card>
      )}

      {(isLoading || (alerts?.length ?? 0) > 0) && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={selected.length === (alerts?.length ?? 0) && (alerts?.length ?? 0) > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Reorder Qty</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
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
                : (alerts ?? []).map((alert) => (
                    <TableRow key={alert.id} className="hover:bg-muted/50">
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.includes(alert.id)}
                          onCheckedChange={() => toggleSelect(alert.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {alert.product.imageUrl ? (
                            <img src={alert.product.imageUrl} alt={alert.product.name} className="h-9 w-9 rounded object-cover border" />
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-sm">{alert.product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{alert.sku}</TableCell>
                      <TableCell className="text-sm">{alert.warehouseName}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-semibold',
                          urgencyColor(alert.currentStock, alert.threshold)
                        )}>
                          {alert.currentStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{alert.threshold}</TableCell>
                      <TableCell className="text-sm font-medium text-blue-600">{alert.reorderSuggestion}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => createPOMutation.mutate([alert.id])}
                          disabled={createPOMutation.isPending}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" /> Create PO
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

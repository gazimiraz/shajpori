'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Eye, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatBDT } from '@shaj/utils';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const PERIODS = [{ label: '7D', value: '7d' }, { label: '30D', value: '30d' }, { label: '90D', value: '90d' }, { label: '1Y', value: 'year' }];

export default function ProductAnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data: topProducts, isLoading } = useQuery({
    queryKey: ['top-products', period],
    queryFn: () => api.get(`/analytics/top-products?period=${period}&limit=15`).then(r => r.data.data),
  });

  const { data: bottomProducts } = useQuery({
    queryKey: ['bottom-products', period],
    queryFn: () => api.get(`/analytics/bottom-products?period=${period}&limit=10`).then(r => r.data.data),
  });

  const { data: categoryData } = useQuery({
    queryKey: ['category-analytics', period],
    queryFn: () => api.get(`/analytics/categories?period=${period}`).then(r => r.data.data),
  });

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Product Analytics</h1><p className="text-muted-foreground text-sm">Performance metrics per product and category</p></div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} className={cn('px-3 py-1 rounded-md text-sm font-medium transition-colors', period === p.value ? 'bg-background shadow-sm' : 'hover:bg-background/50')}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64" /> : (
              <div className="space-y-2">
                {(topProducts ?? []).slice(0,10).map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i+1}</span>
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.unitsSold} units</p>
                    </div>
                    <p className="text-sm font-bold">{formatBDT(p.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Sales by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData ?? []} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: any) => [formatBDT(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {(categoryData ?? []).map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dead Stock / Bottom Performers */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" />Low-Performing Products</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">{['Product', 'SKU', 'Category', 'Revenue', 'Units Sold', 'Views', 'Conversion', 'Stock'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {(bottomProducts ?? []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{p.categoryName ?? 'N/A'}</Badge></td>
                      <td className="px-3 py-2">{formatBDT(p.revenue ?? 0)}</td>
                      <td className="px-3 py-2">{p.unitsSold ?? 0}</td>
                      <td className="px-3 py-2">{p.views ?? 0}</td>
                      <td className="px-3 py-2">{p.views ? `${((p.unitsSold/p.views)*100).toFixed(1)}%` : '0%'}</td>
                      <td className="px-3 py-2"><span className={cn('font-medium', (p.stockQuantity ?? 0) < 5 ? 'text-red-500' : 'text-foreground')}>{p.stockQuantity ?? 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

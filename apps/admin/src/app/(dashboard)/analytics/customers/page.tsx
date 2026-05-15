'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, TrendingUp, ShoppingBag, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatBDT, formatDate } from '@shaj/utils';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const PERIODS = [{ label: '7D', value: '7d' }, { label: '30D', value: '30d' }, { label: '90D', value: '90d' }, { label: '1Y', value: 'year' }];
const RFM_COLORS: Record<string, string> = { Champions: '#10b981', 'Loyal': '#3b82f6', 'At Risk': '#f59e0b', 'Churned': '#ef4444', 'New': '#8b5cf6' };
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function CustomerAnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data: stats } = useQuery({
    queryKey: ['customer-stats', period],
    queryFn: () => api.get(`/analytics/customers?period=${period}`).then(r => r.data.data).catch(() => null),
  });

  const { data: topCustomers, isLoading: topLoading } = useQuery({
    queryKey: ['top-customers', period],
    queryFn: () => api.get(`/analytics/top-customers?period=${period}&limit=10`).then(r => r.data.data),
  });

  const { data: rfmData } = useQuery({
    queryKey: ['rfm-segments'],
    queryFn: () => api.get('/ai/rfm-segments').then(r => r.data.data).catch(() => null),
  });

  const { data: retentionData } = useQuery({
    queryKey: ['retention', period],
    queryFn: () => api.get(`/analytics/retention?period=${period}`).then(r => r.data.data).catch(() => []),
  });

  const rfmSegments = rfmData?.segments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Customer Analytics</h1><p className="text-muted-foreground text-sm">Customer behavior, segments, and lifetime value</p></div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} className={cn('px-3 py-1 rounded-md text-sm font-medium transition-colors', period === p.value ? 'bg-background shadow-sm' : 'hover:bg-background/50')}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: stats?.totalCustomers ?? '—', icon: Users, color: 'text-blue-500' },
          { label: 'New This Period', value: stats?.newCustomers ?? '—', icon: UserPlus, color: 'text-emerald-500' },
          { label: 'Avg Order Value', value: stats?.avgOrderValue ? formatBDT(stats.avgOrderValue) : '—', icon: ShoppingBag, color: 'text-purple-500' },
          { label: 'Avg LTV', value: stats?.avgLifetimeValue ? formatBDT(stats.avgLifetimeValue) : '—', icon: TrendingUp, color: 'text-amber-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1"><s.icon className={`w-4 h-4 ${s.color}`} /><p className="text-xs text-muted-foreground">{s.label}</p></div>
            <p className="text-2xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RFM Segments */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />RFM Segments</CardTitle></CardHeader>
          <CardContent>
            {rfmSegments.length > 0 ? (
              <div className="space-y-3">
                {rfmSegments.map((seg: any, i: number) => (
                  <div key={seg.segment} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{seg.segment}</span>
                        <span className="text-muted-foreground">{seg.count} ({seg.percentage?.toFixed(1)}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${seg.percentage}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No RFM data available</div>
            )}
          </CardContent>
        </Card>

        {/* Retention */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Customer Retention</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={retentionData ?? []} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Retention']} />
                <Bar dataKey="retention" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Top Customers by Revenue</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Customer', 'Email', 'Orders', 'Total Spent', 'Avg Order', 'Last Order', 'Segment'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topLoading ? Array.from({length:5}).map((_,i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                (topCustomers ?? []).map((c: any) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{c.firstName?.[0]}{c.lastName?.[0]}</div>
                        <span className="font-medium">{c.firstName} {c.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.email}</td>
                    <td className="px-4 py-3">{c.orderCount}</td>
                    <td className="px-4 py-3 font-semibold">{formatBDT(c.totalSpent)}</td>
                    <td className="px-4 py-3">{formatBDT(c.avgOrderValue)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}</td>
                    <td className="px-4 py-3">
                      {c.rfmSegment && <Badge variant="secondary" className="text-xs">{c.rfmSegment}</Badge>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

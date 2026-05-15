'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ShoppingCart, Package, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatBDT } from '@shaj/utils';

type Range = '7D' | '30D' | '90D' | '1Y' | 'custom';

const RANGES: Range[] = ['7D', '30D', '90D', '1Y', 'custom'];

const DAYS_MAP: Record<Exclude<Range, 'custom'>, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0;
  const bg = intensity === 0
    ? 'bg-muted'
    : intensity < 0.25 ? 'bg-blue-100'
    : intensity < 0.5 ? 'bg-blue-300'
    : intensity < 0.75 ? 'bg-blue-500'
    : 'bg-blue-700';
  return (
    <div
      title={`Orders: ${value}`}
      className={cn('w-5 h-5 rounded-sm cursor-default', bg)}
    />
  );
}

export default function SalesAnalyticsPage() {
  const [range, setRange] = useState<Range>('30D');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const params = range === 'custom'
    ? { startDate: customStart, endDate: customEnd }
    : { days: DAYS_MAP[range as Exclude<Range, 'custom'>] };

  const { data, isLoading } = useQuery({
    queryKey: ['sales-analytics', range, customStart, customEnd],
    queryFn: () => api.get('/analytics/sales', { params }).then((r) => r.data.data),
    enabled: range !== 'custom' || (!!customStart && !!customEnd),
  });

  const metrics = [
    { label: 'Revenue', value: formatBDT(data?.totals?.revenue ?? 0), icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Orders', value: data?.totals?.orders ?? 0, icon: ShoppingCart, color: 'text-blue-500' },
    { label: 'Units Sold', value: data?.totals?.unitsSold ?? 0, icon: Package, color: 'text-violet-500' },
    { label: 'Avg Order Value', value: formatBDT(data?.totals?.avgOrderValue ?? 0), icon: TrendingUp, color: 'text-orange-500' },
    { label: 'New Customers', value: data?.totals?.newCustomers ?? 0, icon: Users, color: 'text-pink-500' },
  ];

  const heatmapMax = Math.max(...(data?.heatmap ?? []).flatMap((row: number[]) => row), 1);

  return (
    <div className="space-y-6 p-6">
      {/* Header + Date Range */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Revenue, orders, and performance trends</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'outline'}
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-36 text-sm" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className={cn('mb-2', color)}><Icon className="h-5 w-5" /></div>
              {isLoading ? <Skeleton className="h-7 w-20 mb-1" /> : <p className="text-xl font-bold">{value}</p>}
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue + Orders Line Chart */}
      <Card>
        <CardHeader><CardTitle>Revenue & Orders Trend</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data?.timeSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'revenue' ? formatBDT(value) : value
                  }
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Channel */}
        <Card>
          <CardHeader><CardTitle>Sales by Channel</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.byChannel ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBDT(v)} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Hourly Heatmap */}
        <Card>
          <CardHeader><CardTitle>Order Heatmap (Hour × Day)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <div className="flex gap-1 mb-1 ml-12">
                    {HOURS.map((h) => (
                      <div key={h} className="w-5 text-center text-[9px] text-muted-foreground">{h}</div>
                    ))}
                  </div>
                  {DAYS_OF_WEEK.map((day, dIdx) => (
                    <div key={day} className="flex items-center gap-1 mb-1">
                      <span className="w-10 text-xs text-muted-foreground text-right pr-2">{day}</span>
                      {HOURS.map((h) => (
                        <HeatmapCell
                          key={h}
                          value={data?.heatmap?.[dIdx]?.[h] ?? 0}
                          max={heatmapMax}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Products */}
      <Card>
        <CardHeader><CardTitle>Top 5 Products</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead className="pr-4">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : (data?.topProducts ?? []).slice(0, 5).map((p: any, i: number) => (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="pl-4 font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell>{p.unitsSold?.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{formatBDT(p.revenue)}</TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${p.percentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{(p.percentage ?? 0).toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

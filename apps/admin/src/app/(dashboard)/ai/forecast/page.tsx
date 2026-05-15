'use client';

import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@shaj/utils';
import { api } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

export default function ForecastPage() {
  const { data: forecast, isLoading } = useQuery({
    queryKey: ['ai-forecast'],
    queryFn: () => api.get('/ai/forecast?days=30').then(r => r.data.data),
  });

  const { data: segments } = useQuery({
    queryKey: ['ai-segments'],
    queryFn: () => api.get('/ai/segments').then(r => r.data.data),
  });

  const trendIcon = forecast?.trend === 'up'
    ? <TrendingUp className="w-4 h-4 text-emerald-500" />
    : forecast?.trend === 'down'
    ? <TrendingDown className="w-4 h-4 text-red-500" />
    : <Minus className="w-4 h-4 text-yellow-500" />;

  const segmentColors: Record<string, string> = {
    Champions: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Loyal: 'bg-blue-100 text-blue-700 border-blue-200',
    'Potential Loyalists': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
    'Cannot Lose': 'bg-red-100 text-red-700 border-red-200',
    Hibernating: 'bg-gray-100 text-gray-700 border-gray-200',
    'New Customers': 'bg-sky-100 text-sky-700 border-sky-200',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="w-6 h-6 text-primary" />Sales Forecast</h1>
        <p className="text-muted-foreground text-sm">AI-powered 30-day revenue prediction</p>
      </div>

      {/* Forecast Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Predicted Revenue (30d)</p>
                <p className="text-3xl font-bold mt-1 text-primary">{formatBDT(forecast?.predicted?.reduce((a: number, b: number) => a + b, 0) ?? 0)}</p>
                <div className="flex items-center gap-1 mt-2 text-sm">{trendIcon}<span className="capitalize text-muted-foreground">{forecast?.trend ?? 'stable'} trend</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Confidence Score</p>
                <p className="text-3xl font-bold mt-1">{((forecast?.confidence ?? 0) * 100).toFixed(0)}%</p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(forecast?.confidence ?? 0) * 100}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Forecast Period</p>
                <p className="text-3xl font-bold mt-1">30 days</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Calendar className="w-3 h-3" />Updated: Just now</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast</CardTitle>
          <CardDescription>Historical data + AI-predicted next 30 days (dashed)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-72" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={forecast?.chartData ?? []}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={d => { try { return format(parseISO(d), 'MMM d'); } catch { return d; }}} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [formatBDT(v), '']} labelFormatter={l => { try { return format(parseISO(l), 'MMM dd, yyyy'); } catch { return l; }}} />
                <Legend />
                <Area type="monotone" dataKey="actual" name="Actual Revenue" stroke="#3b82f6" fill="url(#colorActual)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="predicted" name="Predicted Revenue" stroke="#8b5cf6" fill="url(#colorPredicted)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Customer Segments */}
      {segments && (
        <Card>
          <CardHeader>
            <CardTitle>Customer RFM Segments</CardTitle>
            <CardDescription>Recency, Frequency, Monetary segmentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(segments ?? []).map((seg: any) => (
                <div key={seg.segment} className={`rounded-lg border p-3 ${segmentColors[seg.segment] ?? 'bg-muted'}`}>
                  <p className="font-semibold text-sm">{seg.segment}</p>
                  <p className="text-2xl font-bold mt-1">{seg.count}</p>
                  <p className="text-xs mt-0.5 opacity-70">Avg LTV: {formatBDT(seg.avgLTV ?? 0)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

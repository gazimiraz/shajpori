'use client';

import { useQuery } from '@tanstack/react-query';
import { Store, ExternalLink, TrendingUp, ShoppingCart, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT, formatDateTime } from '@shaj/utils';
import { api } from '@/lib/api';

export default function POSOverviewPage() {
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['pos-shifts'],
    queryFn: () => api.get('/pos/shifts?limit=10').then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['pos-stats'],
    queryFn: () => api.get('/pos/daily-report').then(r => r.data.data).catch(() => null),
  });

  const shiftList = shifts?.items ?? shifts ?? [];
  const openShifts = shiftList.filter((s: any) => s.status === 'OPEN');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Point of Sale</h1><p className="text-muted-foreground text-sm">Manage POS terminals and shifts</p></div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/pos/shifts">View All Shifts</Link>
          </Button>
          <Button asChild>
            <a href={process.env.NEXT_PUBLIC_POS_URL || 'http://localhost:3002'} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />Open POS Terminal
            </a>
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: formatBDT(stats?.revenue ?? 0), icon: DollarSign, color: 'text-emerald-500' },
          { label: "Today's Orders", value: stats?.orders ?? 0, icon: ShoppingCart, color: 'text-blue-500' },
          { label: 'Open Shifts', value: openShifts.length, icon: Clock, color: 'text-amber-500' },
          { label: 'Avg Transaction', value: formatBDT(stats?.avgTransaction ?? 0), icon: TrendingUp, color: 'text-purple-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Open Shifts */}
      {openShifts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Open Shifts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openShifts.map((shift: any) => (
              <Card key={shift.id} className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-emerald-500 text-white border-0">OPEN</Badge>
                    <span className="text-xs text-muted-foreground">{shift.store?.name}</span>
                  </div>
                  <p className="font-medium">{shift.operator?.firstName} {shift.operator?.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Since {formatDateTime(shift.openedAt)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Sales</p><p className="font-semibold">{formatBDT(shift.totalSales)}</p></div>
                    <div><p className="text-muted-foreground">Orders</p><p className="font-semibold">{shift.totalOrders}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Shifts Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Recent Shifts</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Operator', 'Store', 'Status', 'Opening Cash', 'Total Sales', 'Orders', 'Opened', 'Closed'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length:5}).map((_,i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                shiftList.map((shift: any) => (
                  <tr key={shift.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{shift.operator?.firstName} {shift.operator?.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{shift.store?.name}</td>
                    <td className="px-4 py-3"><Badge variant={shift.status === 'OPEN' ? 'default' : 'secondary'} className={shift.status === 'OPEN' ? 'bg-emerald-500 text-white border-0' : ''}>{shift.status}</Badge></td>
                    <td className="px-4 py-3">{formatBDT(shift.openingCash)}</td>
                    <td className="px-4 py-3 font-semibold">{formatBDT(shift.totalSales)}</td>
                    <td className="px-4 py-3">{shift.totalOrders}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(shift.openedAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{shift.closedAt ? formatDateTime(shift.closedAt) : '—'}</td>
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

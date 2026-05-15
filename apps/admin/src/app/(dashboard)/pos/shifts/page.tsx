'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, DollarSign, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { formatBDT, formatDateTime } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function POSShiftsPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pos-shifts-all'],
    queryFn: () => api.get('/pos/shifts?limit=100').then(r => r.data.data),
  });

  const shifts = (data?.items ?? data ?? []).filter((s: any) => {
    if (!search) return true;
    const name = `${s.operator?.firstName} ${s.operator?.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || s.store?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const openShifts = shifts.filter((s: any) => s.status === 'OPEN');
  const totalRevenue = shifts.filter((s: any) => s.status === 'CLOSED').reduce((sum: number, s: any) => sum + (s.totalSales ?? 0), 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6" />POS Shifts</h1><p className="text-muted-foreground text-sm">All cashier shifts and session history</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Shifts', value: shifts.length, icon: Clock, color: 'text-blue-500' },
          { label: 'Open Now', value: openShifts.length, icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Total Revenue', value: formatBDT(totalRevenue), icon: DollarSign, color: 'text-purple-500' },
          { label: 'Total Orders', value: shifts.reduce((s: number, sh: any) => s + (sh.totalOrders ?? 0), 0), icon: ShoppingCart, color: 'text-amber-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1"><s.icon className={`w-4 h-4 ${s.color}`} /><p className="text-xs text-muted-foreground">{s.label}</p></div>
            <p className="text-2xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="mb-4">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by operator or store..." className="max-w-xs" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Operator', 'Store', 'Status', 'Opening Cash', 'Total Sales', 'Orders', 'Opened', 'Closed', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length:8}).map((_,i) => <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                shifts.map((shift: any) => (
                  <>
                    <tr key={shift.id} className={cn('hover:bg-muted/30 cursor-pointer', expanded === shift.id && 'bg-muted/20')} onClick={() => setExpanded(exp => exp === shift.id ? null : shift.id)}>
                      <td className="px-4 py-3 font-medium">{shift.operator?.firstName} {shift.operator?.lastName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{shift.store?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={shift.status === 'OPEN' ? 'default' : 'secondary'} className={shift.status === 'OPEN' ? 'bg-emerald-500 text-white border-0 text-xs' : 'text-xs'}>{shift.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{formatBDT(shift.openingCash)}</td>
                      <td className="px-4 py-3 font-semibold">{formatBDT(shift.totalSales)}</td>
                      <td className="px-4 py-3">{shift.totalOrders}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(shift.openedAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{shift.closedAt ? formatDateTime(shift.closedAt) : '—'}</td>
                      <td className="px-4 py-3">{expanded === shift.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</td>
                    </tr>
                    {expanded === shift.id && (
                      <tr key={`${shift.id}-detail`} className="bg-muted/20">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><p className="text-muted-foreground text-xs mb-0.5">Closing Cash</p><p className="font-semibold">{shift.closingCash !== null ? formatBDT(shift.closingCash) : '—'}</p></div>
                            <div><p className="text-muted-foreground text-xs mb-0.5">Cash Collected</p><p className="font-semibold">{formatBDT(shift.cashCollected ?? 0)}</p></div>
                            <div><p className="text-muted-foreground text-xs mb-0.5">Card Sales</p><p className="font-semibold">{formatBDT(shift.cardSales ?? 0)}</p></div>
                            <div><p className="text-muted-foreground text-xs mb-0.5">Returns</p><p className="font-semibold text-red-600">-{formatBDT(shift.totalReturns ?? 0)}</p></div>
                          </div>
                          {shift.notes && <p className="text-xs text-muted-foreground mt-3 italic">{shift.notes}</p>}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

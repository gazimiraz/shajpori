'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@shaj/utils';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

function AccountRow({ name, amount, indent = 0, isBold = false }: { name: string; amount: number; indent?: number; isBold?: boolean }) {
  return (
    <div className={cn('flex justify-between py-1.5 text-sm border-b border-border/50', isBold && 'font-bold text-base')} style={{ paddingLeft: indent * 16 }}>
      <span className={cn(isBold ? 'text-foreground' : 'text-muted-foreground')}>{name}</span>
      <span className={cn(isBold && 'text-foreground', amount < 0 && 'text-red-500')}>{formatBDT(Math.abs(amount))}{amount < 0 ? ' (Dr)' : ''}</span>
    </div>
  );
}

export default function BalanceSheetPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['balance-sheet', date],
    queryFn: () => api.get(`/accounting/balance-sheet?date=${date}`).then(r => r.data.data),
  });

  const handleExport = async () => {
    const res = await api.get(`/reports/export?type=balance-sheet&format=pdf&date=${date}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = `balance-sheet-${date}.pdf`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" />Balance Sheet</h1>
          <p className="text-muted-foreground text-sm">Financial position as of selected date</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background" />
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" /><Skeleton className="h-96" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ASSETS */}
          <Card>
            <CardHeader><CardTitle className="text-blue-600">Assets</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Assets</p>
              {(report?.assets?.current ?? []).map((a: any) => <AccountRow key={a.code} name={a.name} amount={a.balance} indent={1} />)}
              <AccountRow name="Total Current Assets" amount={report?.assets?.totalCurrent ?? 0} isBold />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Non-Current Assets</p>
              {(report?.assets?.nonCurrent ?? []).map((a: any) => <AccountRow key={a.code} name={a.name} amount={a.balance} indent={1} />)}
              <AccountRow name="Total Non-Current Assets" amount={report?.assets?.totalNonCurrent ?? 0} isBold />
              <div className="border-t-2 border-foreground mt-2 pt-2">
                <AccountRow name="TOTAL ASSETS" amount={report?.assets?.total ?? 0} isBold />
              </div>
            </CardContent>
          </Card>

          {/* LIABILITIES & EQUITY */}
          <Card>
            <CardHeader><CardTitle className="text-red-600">Liabilities & Equity</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Liabilities</p>
              {(report?.liabilities?.current ?? []).map((a: any) => <AccountRow key={a.code} name={a.name} amount={a.balance} indent={1} />)}
              <AccountRow name="Total Current Liabilities" amount={report?.liabilities?.totalCurrent ?? 0} isBold />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Equity</p>
              {(report?.equity ?? []).map((a: any) => <AccountRow key={a.code} name={a.name} amount={a.balance} indent={1} />)}
              <AccountRow name="Total Equity" amount={report?.totalEquity ?? 0} isBold />
              <div className="border-t-2 border-foreground mt-2 pt-2">
                <AccountRow name="TOTAL LIABILITIES & EQUITY" amount={report?.total ?? 0} isBold />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Check */}
      {report && (
        <Card className={cn('border-2', Math.abs((report.assets?.total ?? 0) - (report.total ?? 0)) < 1 ? 'border-emerald-400 bg-emerald-50/50' : 'border-red-400 bg-red-50/50')}>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <p className="font-semibold text-sm">Balance Check</p>
            {Math.abs((report.assets?.total ?? 0) - (report.total ?? 0)) < 1
              ? <p className="text-emerald-600 font-medium text-sm">✓ Balance sheet is balanced</p>
              : <p className="text-red-600 font-medium text-sm">⚠ Imbalance detected — review journal entries</p>
            }
          </CardContent>
        </Card>
      )}
    </div>
  );
}

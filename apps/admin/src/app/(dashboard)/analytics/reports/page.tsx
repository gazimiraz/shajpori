'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileDown, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDate } from '@shaj/utils';
import toast from 'react-hot-toast';

interface RecentExport {
  id: string;
  reportType: string;
  format: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  downloadUrl?: string;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [format, setFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: recentExports, isLoading, refetch } = useQuery<RecentExport[]>({
    queryKey: ['report-exports'],
    queryFn: () => api.get('/reports/exports').then((r) => r.data.data ?? r.data),
    refetchInterval: 10000,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post('/reports/generate', { reportType, format, startDate, endDate }),
    onSuccess: (res) => {
      if (format === 'csv' && res.data.downloadUrl) {
        const a = document.createElement('a');
        a.href = res.data.downloadUrl;
        a.download = `${reportType}-report.${format}`;
        a.click();
      }
      toast.success('Report generation started');
      refetch();
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const statusIcon = (status: RecentExport['status']) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === 'pending') return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    return <Clock className="h-4 w-4 text-red-500" />;
  };

  const statusVariant: Record<RecentExport['status'], 'success' | 'info' | 'destructive'> = {
    completed: 'success',
    pending: 'info',
    failed: 'destructive',
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Reports Generator</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Generate and download business reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Generate Report</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Report</SelectItem>
                    <SelectItem value="inventory">Inventory Report</SelectItem>
                    <SelectItem value="customers">Customers Report</SelectItem>
                    <SelectItem value="products">Products Report</SelectItem>
                    <SelectItem value="finance">Finance Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Format</Label>
                <div className="flex gap-2">
                  {['csv', 'excel', 'pdf'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                        format === f
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <FileDown className="h-4 w-4" />
                }
                Generate & Download
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Exports */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Recent Exports</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (recentExports?.length ?? 0) === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No exports yet. Generate your first report above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(recentExports ?? []).map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        {statusIcon(exp.status)}
                        <div>
                          <p className="text-sm font-medium capitalize">{exp.reportType} Report</p>
                          <p className="text-xs text-muted-foreground">
                            {exp.format.toUpperCase()} · {formatDate(exp.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant[exp.status]}>{exp.status}</Badge>
                        {exp.status === 'completed' && exp.downloadUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            asChild
                          >
                            <a href={exp.downloadUrl} download>
                              <FileDown className="h-3.5 w-3.5" /> Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

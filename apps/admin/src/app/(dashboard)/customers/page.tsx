'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCheck, UserPlus, TrendingUp, Search, Eye, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatBDT, formatDate } from '@shaj/utils';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  ordersCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  status: 'active' | 'inactive' | 'blocked';
  registeredAt: string;
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  stats: { total: number; active: number; newThisMonth: number; avgLtv: number };
}

const statusVariant: Record<string, 'success' | 'secondary' | 'destructive'> = {
  active: 'success',
  inactive: 'secondary',
  blocked: 'destructive',
};

function Avatar({ name, url, size = 8 }: { name: string; url?: string; size?: number }) {
  if (url) return <img src={url} alt={name} className={`h-${size} w-${size} rounded-full object-cover`} />;
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`h-${size} w-${size} rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold`}>
      {initials}
    </div>
  );
}

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery<CustomersResponse>({
    queryKey: ['customers', page, search, status],
    queryFn: () =>
      api.get('/customers', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
        },
      }).then((r) => r.data),
  });

  const handleExport = async () => {
    const res = await api.get('/customers/export?format=csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: 'Total Customers', value: data?.stats.total, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active', value: data?.stats.active, icon: UserCheck, color: 'text-green-600 bg-green-50' },
    { label: 'New This Month', value: data?.stats.newThisMonth, icon: UserPlus, color: 'text-violet-600 bg-violet-50' },
    { label: 'Avg LTV', value: formatBDT(data?.stats.avgLtv ?? 0), icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your customer base</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export CSV
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Loyalty Pts</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : (data?.customers ?? []).map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/50">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={customer.name} url={customer.avatarUrl} />
                        <span className="font-medium text-sm">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.phone ?? '—'}</TableCell>
                    <TableCell className="text-sm font-medium">{customer.ordersCount}</TableCell>
                    <TableCell className="font-medium text-sm">{formatBDT(customer.totalSpent)}</TableCell>
                    <TableCell className="text-sm text-violet-600 font-medium">{customer.loyaltyPoints.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(customer.registeredAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[customer.status] ?? 'secondary'}>{customer.status}</Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/customers/${customer.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            {isLoading ? <Skeleton className="h-4 w-40" /> : `Page ${data?.page ?? 1} of ${data?.totalPages ?? 1} (${data?.total ?? 0} total)`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!data || page >= data.totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

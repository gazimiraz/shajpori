'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatBDT } from '@shaj/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId?: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  children?: Account[];
}

const TYPE_COLORS: Record<Account['type'], string> = {
  asset: 'text-blue-600 bg-blue-50',
  liability: 'text-red-600 bg-red-50',
  equity: 'text-purple-600 bg-purple-50',
  revenue: 'text-green-600 bg-green-50',
  expense: 'text-orange-600 bg-orange-50',
};

interface AccountRowProps {
  account: Account;
  depth?: number;
  onAdd: (parentId: string) => void;
}

function AccountRow({ account, depth = 0, onAdd }: AccountRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (account.children?.length ?? 0) > 0;

  return (
    <>
      <tr className="border-b hover:bg-muted/40">
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            {hasChildren ? (
              <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : <span className="w-4" />}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{account.code}</code>
          </div>
        </td>
        <td className="py-2.5 px-4 text-sm font-medium">{account.name}</td>
        <td className="py-2.5 px-4">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', TYPE_COLORS[account.type])}>
            {account.type}
          </span>
        </td>
        <td className="py-2.5 px-4 text-sm font-medium text-right">{formatBDT(account.debitTotal)}</td>
        <td className="py-2.5 px-4 text-sm font-medium text-right">{formatBDT(account.creditTotal)}</td>
        <td className="py-2.5 px-4 text-right">
          <span className={cn('text-sm font-bold', account.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatBDT(Math.abs(account.balance))}{account.balance < 0 ? ' (Cr)' : ''}
          </span>
        </td>
        <td className="py-2.5 px-4 text-right">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onAdd(account.id)}>
            <Plus className="h-3 w-3 mr-1" /> Sub
          </Button>
        </td>
      </tr>
      {hasChildren && expanded && account.children?.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} onAdd={onAdd} />
      ))}
    </>
  );
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', parentId: '' });

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: () => api.get('/accounting/accounts?tree=true').then((r) => r.data.data ?? r.data),
  });

  const flatAccounts: Account[] = [];
  const flatten = (accs: Account[]) => accs.forEach((a) => {
    flatAccounts.push(a);
    if (a.children) flatten(a.children);
  });
  if (accounts) flatten(accounts);

  const createMutation = useMutation({
    mutationFn: () => api.post('/accounting/accounts', {
      ...form,
      parentId: form.parentId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created');
      setModalOpen(false);
      setForm({ code: '', name: '', type: 'asset', parentId: '' });
    },
    onError: () => toast.error('Failed to create account'),
  });

  const openAddSub = (parentId: string) => {
    setForm((f) => ({ ...f, parentId }));
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Account hierarchy and balances</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setForm({ code: '', name: '', type: 'asset', parentId: '' }); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Code</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Debit Total</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Credit Total</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Balance</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : (accounts ?? []).map((account) => (
                    <AccountRow key={account.id} account={account} onAdd={openAddSub} />
                  ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Account Code *</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. 1001" />
            </div>
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Cash" />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent Account</Label>
              <Select value={form.parentId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None (root)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root)</SelectItem>
                  {flatAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.code || !form.name}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

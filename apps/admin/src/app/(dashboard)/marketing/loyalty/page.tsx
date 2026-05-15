'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Users, TrendingUp, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatBDT } from '@shaj/utils';
import toast from 'react-hot-toast';

interface LoyaltySettings {
  pointsPerTaka: number;
  redemptionRate: number;
  minPointsToRedeem: number;
}

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  pointsBalance: number;
  totalEarned: number;
  totalRedeemed: number;
}

interface AdjustForm {
  customerId: string;
  type: 'add' | 'remove';
  points: number;
  reason: string;
}

export default function LoyaltyPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<LoyaltySettings>({ pointsPerTaka: 1, redemptionRate: 100, minPointsToRedeem: 500 });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ customerId: '', type: 'add', points: 0, reason: '' });

  const { data: programData, isLoading } = useQuery<{ stats: any; settings: LoyaltySettings; topCustomers: TopCustomer[] }>({
    queryKey: ['loyalty-program'],
    queryFn: () => api.get('/marketing/loyalty').then((r) => r.data),
    onSuccess: (d) => setSettings(d.settings),
  } as any);

  const { data: customers } = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ['customers-search'],
    queryFn: () => api.get('/customers?limit=100').then((r) => r.data.customers),
  });

  const settingsMutation = useMutation({
    mutationFn: () => api.patch('/marketing/loyalty/settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const adjustMutation = useMutation({
    mutationFn: () => api.post('/marketing/loyalty/adjust', adjustForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
      toast.success('Points adjusted');
      setAdjustOpen(false);
      setAdjustForm({ customerId: '', type: 'add', points: 0, reason: '' });
    },
    onError: () => toast.error('Failed to adjust points'),
  });

  const stats = programData?.stats ?? {};
  const statCards = [
    { label: 'Total Points Issued', value: stats.totalIssued?.toLocaleString(), icon: Star, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Points Redeemed', value: stats.totalRedeemed?.toLocaleString(), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Active Members', value: stats.activeMembers?.toLocaleString(), icon: Users, color: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loyalty Program</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage points and rewards</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setAdjustOpen(true)}>
          <Star className="h-4 w-4" /> Adjust Points
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <Card>
          <CardHeader><CardTitle>Program Settings</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Points per Taka spent</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={settings.pointsPerTaka}
                onChange={(e) => setSettings((s) => ({ ...s, pointsPerTaka: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Customer earns {settings.pointsPerTaka} point(s) for every ৳1 spent</p>
            </div>
            <div className="space-y-2">
              <Label>Redemption Rate (points per ৳1)</Label>
              <Input
                type="number"
                min={1}
                value={settings.redemptionRate}
                onChange={(e) => setSettings((s) => ({ ...s, redemptionRate: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">{settings.redemptionRate} points = ৳1 discount</p>
            </div>
            <div className="space-y-2">
              <Label>Minimum Points to Redeem</Label>
              <Input
                type="number"
                min={0}
                value={settings.minPointsToRedeem}
                onChange={(e) => setSettings((s) => ({ ...s, minPointsToRedeem: Number(e.target.value) }))}
              />
            </div>
            <Button className="w-full gap-2" onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending}>
              {settingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Top Loyalty Members</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">#</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Points Balance</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead className="pr-4">Total Redeemed</TableHead>
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
                    : (programData?.topCustomers ?? []).map((c, i) => (
                        <TableRow key={c.id} className="hover:bg-muted/50">
                          <TableCell className="pl-4 text-muted-foreground font-medium">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-yellow-600">{c.pointsBalance.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-sm text-green-600">{c.totalEarned.toLocaleString()}</TableCell>
                          <TableCell className="pr-4 text-sm text-muted-foreground">{c.totalRedeemed.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adjust Points Modal */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adjust Points</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={adjustForm.customerId} onValueChange={(v) => setAdjustForm((f) => ({ ...f, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={adjustForm.type} onValueChange={(v) => setAdjustForm((f) => ({ ...f, type: v as 'add' | 'remove' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Points</SelectItem>
                  <SelectItem value="remove">Remove Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min={1}
                value={adjustForm.points}
                onChange={(e) => setAdjustForm((f) => ({ ...f, points: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
                placeholder="Reason for adjustment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button
              onClick={() => adjustMutation.mutate()}
              disabled={adjustMutation.isPending || !adjustForm.customerId || !adjustForm.points}
            >
              {adjustMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

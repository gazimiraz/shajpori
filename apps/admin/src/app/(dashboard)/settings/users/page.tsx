'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, Activity, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'POS_OPERATOR'];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-sky-100 text-sky-700',
  ACCOUNTANT: 'bg-green-100 text-green-700',
  WAREHOUSE_MANAGER: 'bg-amber-100 text-amber-700',
  POS_OPERATOR: 'bg-indigo-100 text-indigo-700',
  CUSTOMER: 'bg-gray-100 text-gray-700',
  VENDOR: 'bg-pink-100 text-pink-700',
};

export default function UsersSettingsPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'STAFF', password: '' });
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => api.get('/users', { params: { search: search || undefined, roles: ROLES.join(','), limit: 50 } }).then(r => r.data.data),
  });

  const { data: activityLogs } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => api.get('/audit-logs?limit=20').then(r => r.data.data),
  });

  const inviteMutation = useMutation({
    mutationFn: (d: any) => api.post('/auth/register', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setInviteOpen(false); toast.success('User created successfully'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create user'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: any) => api.patch(`/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role updated'); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User deactivated'); },
  });

  const users = data?.items ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" />Users & Roles</h1><p className="text-muted-foreground text-sm">Manage staff accounts and permissions</p></div>
        <Button onClick={() => setInviteOpen(true)}><UserPlus className="w-4 h-4 mr-2" />Add User</Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList><TabsTrigger value="users">Staff Users</TabsTrigger><TabsTrigger value="activity">Activity Log</TabsTrigger></TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="mb-4"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="max-w-xs" /></div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>{['User', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? Array.from({length:6}).map((_,i) => (
                    <tr key={i}>{Array.from({length:6}).map((_,j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}</tr>
                  )) : users.filter((u: any) => ROLES.includes(u.role)).map((user: any) => (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                          <div><p className="font-medium">{user.firstName} {user.lastName}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={user.role} onValueChange={role => updateRoleMutation.mutate({ id: user.id, role })}>
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">{user.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive h-7" onClick={() => deactivateMutation.mutate(user.id)}>Deactivate</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4" />Recent Activity</CardTitle></CardHeader>
            <div className="divide-y divide-border">
              {(activityLogs?.items ?? activityLogs ?? []).map((log: any) => (
                <div key={log.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {log.user?.firstName?.[0] ?? '?'}
                  </div>
                  <div className="flex-1">
                    <p><span className="font-medium">{log.user?.firstName} {log.user?.lastName}</span> <span className="text-muted-foreground">{log.action?.toLowerCase()} {log.entity?.toLowerCase()}</span></p>
                    <p className="text-xs text-muted-foreground">{log.ipAddress} · {formatDateTime(log.createdAt)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{log.action}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Staff User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>First Name</Label><Input value={inviteForm.firstName} onChange={e => setInviteForm(f => ({...f, firstName: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Last Name</Label><Input value={inviteForm.lastName} onChange={e => setInviteForm(f => ({...f, lastName: e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="space-y-1.5"><Label>Temporary Password</Label><Input type="password" value={inviteForm.password} onChange={e => setInviteForm(f => ({...f, password: e.target.value}))} placeholder="Min 8 characters" /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({...f, role: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.filter(r => r !== 'SUPER_ADMIN').map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => inviteMutation.mutate(inviteForm)} disabled={inviteMutation.isPending || !inviteForm.email || !inviteForm.password}>
              {inviteMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

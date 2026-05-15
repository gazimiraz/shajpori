'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Send, Users, Mail, Eye, MousePointer, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '@shaj/utils';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const AUDIENCE_OPTIONS = ['ALL', 'NEW_CUSTOMERS', 'VIP', 'AT_RISK', 'INACTIVE'];
const TYPE_OPTIONS = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function CampaignsPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'EMAIL', subject: '', content: '', audience: 'ALL', scheduledAt: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/marketing/campaigns?limit=50').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/marketing/campaigns', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setOpen(false); toast.success('Campaign created'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/marketing/campaigns/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign sent!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to send'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Deleted'); },
  });

  const campaigns = data?.items ?? data ?? [];
  const stats = { total: campaigns.length, sent: campaigns.filter((c: any) => c.status === 'SENT').length, draft: campaigns.filter((c: any) => c.status === 'DRAFT').length };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-purple-500" />Campaigns</h1><p className="text-muted-foreground text-sm">Email, SMS, and push notification campaigns</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Megaphone, color: 'text-purple-500' },
          { label: 'Sent', value: stats.sent, icon: Send, color: 'text-emerald-500' },
          { label: 'Drafts', value: stats.draft, icon: Mail, color: 'text-blue-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>{['Campaign', 'Type', 'Audience', 'Sent', 'Opens', 'Clicks', 'Status', 'Date', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? Array.from({length:5}).map((_,i) => <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>) :
                campaigns.map((c: any) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      {c.subject && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>}
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.type}</Badge></td>
                    <td className="px-4 py-3 text-xs">{c.audience}</td>
                    <td className="px-4 py-3 text-xs">{c.recipientCount ?? 0}</td>
                    <td className="px-4 py-3 text-xs flex items-center gap-1"><Eye className="w-3 h-3" />{c.openCount ?? 0}</td>
                    <td className="px-4 py-3 text-xs"><span className="flex items-center gap-1"><MousePointer className="w-3 h-3" />{c.clickCount ?? 0}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status] ?? STATUS_COLOR['DRAFT']}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {c.status === 'DRAFT' && <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => sendMutation.mutate(c.id)}><Send className="w-3 h-3 mr-1" />Send</Button>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Campaign Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Eid Special Offer" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm(f => ({...f, audience: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a.replace('_',' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.type === 'EMAIL' && <div className="space-y-1.5"><Label>Subject Line</Label><Input value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} /></div>}
            <div className="space-y-1.5"><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} rows={4} placeholder="Campaign message..." /></div>
            <div className="space-y-1.5"><Label>Schedule (optional)</Label><Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({...f, scheduledAt: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name || !form.content}>
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

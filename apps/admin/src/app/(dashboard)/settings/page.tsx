'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Loader2, Upload, Store, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface StoreSettings {
  general: {
    storeName: string;
    tagline: string;
    logoUrl: string;
    currency: string;
    timezone: string;
    country: string;
  };
  store: {
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'INR'];
const TIMEZONES = ['Asia/Dhaka', 'Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'];
const COUNTRIES = ['Bangladesh', 'India', 'United States', 'United Kingdom'];

export default function SettingsPage() {
  const [generalForm, setGeneralForm] = useState({
    storeName: '',
    tagline: '',
    logoUrl: '',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    country: 'Bangladesh',
  });

  const [storeForm, setStoreForm] = useState({
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Bangladesh',
  });

  const { data: settings, isLoading } = useQuery<StoreSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data ?? r.data),
  });

  useEffect(() => {
    if (settings) {
      if (settings.general) setGeneralForm((f) => ({ ...f, ...settings.general }));
      if (settings.store) setStoreForm((f) => ({ ...f, ...settings.store }));
    }
  }, [settings]);

  const generalMutation = useMutation({
    mutationFn: () => api.patch('/settings/general', generalForm),
    onSuccess: () => toast.success('General settings saved'),
    onError: () => toast.error('Failed to save settings'),
  });

  const storeMutation = useMutation({
    mutationFn: () => api.patch('/settings/store', storeForm),
    onSuccess: () => toast.success('Store details saved'),
    onError: () => toast.error('Failed to save settings'),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGeneralForm((f) => ({ ...f, logoUrl: res.data.url }));
      toast.success('Logo uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure your store settings</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-2"><Globe className="h-4 w-4" />General</TabsTrigger>
          <TabsTrigger value="store" className="gap-2"><Store className="h-4 w-4" />Store Details</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Store Logo</Label>
                <div className="flex items-center gap-4">
                  {generalForm.logoUrl ? (
                    <img src={generalForm.logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-contain border" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                      <Store className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="h-4 w-4" /> Upload Logo
                    </Button>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 2MB</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Store Name *</Label>
                  <Input
                    value={generalForm.storeName}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, storeName: e.target.value }))}
                    placeholder="Shaj Fashion"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={generalForm.tagline}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, tagline: e.target.value }))}
                    placeholder="Premium Lifestyle & Fashion"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={generalForm.currency} onValueChange={(v) => setGeneralForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={generalForm.timezone} onValueChange={(v) => setGeneralForm((f) => ({ ...f, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={generalForm.country} onValueChange={(v) => setGeneralForm((f) => ({ ...f, country: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="gap-2"
                  onClick={() => generalMutation.mutate()}
                  disabled={generalMutation.isPending}
                >
                  {generalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="store">
          <Card>
            <CardHeader><CardTitle>Store Contact & Address</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={storeForm.email}
                    onChange={(e) => setStoreForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="store@shaj.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+880 1234-567890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address Line 1</Label>
                <Input
                  value={storeForm.addressLine1}
                  onChange={(e) => setStoreForm((f) => ({ ...f, addressLine1: e.target.value }))}
                  placeholder="Street address, P.O. Box"
                />
              </div>

              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={storeForm.addressLine2}
                  onChange={(e) => setStoreForm((f) => ({ ...f, addressLine2: e.target.value }))}
                  placeholder="Apartment, suite, unit, floor"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="col-span-2 space-y-2">
                  <Label>City</Label>
                  <Input value={storeForm.city} onChange={(e) => setStoreForm((f) => ({ ...f, city: e.target.value }))} placeholder="Dhaka" />
                </div>
                <div className="space-y-2">
                  <Label>State / Division</Label>
                  <Input value={storeForm.state} onChange={(e) => setStoreForm((f) => ({ ...f, state: e.target.value }))} placeholder="Dhaka Division" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input value={storeForm.postalCode} onChange={(e) => setStoreForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="1200" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={storeForm.country} onValueChange={(v) => setStoreForm((f) => ({ ...f, country: v }))}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button
                  className="gap-2"
                  onClick={() => storeMutation.mutate()}
                  disabled={storeMutation.isPending}
                >
                  {storeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Store Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

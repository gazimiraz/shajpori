'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Barcode, QrCode, Printer, Download, Search, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PrintQueueItem { productId: string; productName: string; sku: string; barcode: string; quantity: number }

export default function BarcodePage() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [barcodeType, setBarcodeType] = useState('EAN13');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const { data: searchResults } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn: () => api.get(`/products?search=${productSearch}&limit=10`).then(r => r.data.data?.items ?? []),
    enabled: productSearch.length >= 2,
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => api.post('/barcode/generate', data),
    onSuccess: (res) => { toast.success('Barcode generated!'); },
    onError: () => toast.error('Failed to generate barcode'),
  });

  const lookupMutation = useMutation({
    mutationFn: (code: string) => api.get(`/barcode/lookup/${code}`),
    onSuccess: (res) => setLookupResult(res.data.data),
    onError: () => { setLookupResult(null); toast.error('Not found'); },
  });

  const generateQRMutation = useMutation({
    mutationFn: (productId: string) => api.get(`/barcode/qr/${productId}`),
    onSuccess: (res) => setQrDataUrl(res.data.data),
  });

  const addToQueue = (product: any) => {
    if (!product.barcode) { toast.error('Generate a barcode first'); return; }
    setPrintQueue(q => [...q, { productId: product.id, productName: product.name, sku: product.sku, barcode: product.barcode, quantity: 1 }]);
  };

  const printLabels = async () => {
    try {
      const res = await api.post('/barcode/labels/generate-pdf', { items: printQueue }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'labels.pdf'; a.click();
      toast.success('Labels downloaded');
    } catch { toast.error('Failed to generate labels'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Barcode className="w-6 h-6" />Barcode System</h1>
        <p className="text-muted-foreground text-sm">Generate, scan and manage barcodes & QR codes</p>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="lookup">Lookup</TabsTrigger>
          <TabsTrigger value="qr">QR Code</TabsTrigger>
          <TabsTrigger value="print">Print Queue {printQueue.length > 0 && <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">{printQueue.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader><CardTitle>Generate Barcode</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Search Product</Label>
                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Type product name..." />
                  {productSearch.length >= 2 && (searchResults ?? []).length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {(searchResults ?? []).map((p: any) => (
                        <button key={p.id} onClick={() => { setSelectedProduct(p.id); setProductSearch(p.name); }} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between">
                          <span>{p.name}</span><span className="text-muted-foreground text-xs">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Barcode Type</Label>
                  <Select value={barcodeType} onValueChange={setBarcodeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EAN13">EAN-13 (Standard)</SelectItem>
                      <SelectItem value="CODE128">Code 128</SelectItem>
                      <SelectItem value="QR">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={!selectedProduct || generateMutation.isPending} onClick={() => generateMutation.mutate({ productId: selectedProduct, type: barcodeType })}>
                  {generateMutation.isPending ? 'Generating...' : 'Generate Barcode'}
                </Button>
                {generateMutation.isSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-green-700 font-mono text-lg font-bold">{(generateMutation.data as any)?.data?.data?.code}</p>
                    <p className="text-green-600 text-sm mt-1">Barcode generated and saved</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Bulk Generate</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Generate barcodes for all products that don't have one yet.</p>
                <Button variant="outline" className="w-full" onClick={() => api.post('/barcode/generate-bulk', { all: true }).then(() => toast.success('Bulk generation started'))}>
                  Generate for All Unassigned Products
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LOOKUP TAB */}
        <TabsContent value="lookup">
          <Card className="mt-4">
            <CardHeader><CardTitle>Barcode Lookup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={lookupCode} onChange={e => setLookupCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupMutation.mutate(lookupCode)} placeholder="Scan or type barcode..." className="flex-1 font-mono" />
                <Button onClick={() => lookupMutation.mutate(lookupCode)} disabled={!lookupCode}><Search className="w-4 h-4 mr-2" />Lookup</Button>
              </div>
              {lookupResult && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-4">
                    {lookupResult.product?.images?.[0]?.url && <img src={lookupResult.product.images[0].url} alt="" className="w-16 h-16 object-cover rounded" />}
                    <div>
                      <p className="font-semibold">{lookupResult.product?.name ?? 'Unknown Product'}</p>
                      <p className="text-sm text-muted-foreground">SKU: {lookupResult.product?.sku}</p>
                      <p className="text-sm text-muted-foreground">Barcode: <span className="font-mono">{lookupResult.barcode?.code}</span></p>
                      <Badge className="mt-1">{lookupResult.barcode?.type}</Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR CODE TAB */}
        <TabsContent value="qr">
          <Card className="mt-4">
            <CardHeader><CardTitle>QR Code Generator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Search Product</Label>
                <div className="flex gap-2">
                  <Input placeholder="Type product name..." className="flex-1" onChange={e => setProductSearch(e.target.value)} />
                  <Button onClick={() => generateQRMutation.mutate(selectedProduct)} disabled={!selectedProduct}>Generate QR</Button>
                </div>
              </div>
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                  <Button variant="outline" onClick={() => { const a = document.createElement('a'); a.href = qrDataUrl; a.download = 'qr-code.png'; a.click(); }}>
                    <Download className="w-4 h-4 mr-2" />Download QR Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRINT QUEUE TAB */}
        <TabsContent value="print">
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Print Queue ({printQueue.length} labels)</CardTitle>
              {printQueue.length > 0 && (
                <Button onClick={printLabels}><Printer className="w-4 h-4 mr-2" />Print All Labels</Button>
              )}
            </CardHeader>
            <CardContent>
              {printQueue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Printer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No items in print queue</p>
                  <p className="text-sm mt-1">Add products from the Generate tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {printQueue.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Barcode className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                      </div>
                      <Input type="number" min={1} value={item.quantity} onChange={e => setPrintQueue(q => q.map((x, j) => j===i ? {...x, quantity: Number(e.target.value)} : x))} className="w-16 h-8 text-center" />
                      <button onClick={() => setPrintQueue(q => q.filter((_,j) => j!==i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

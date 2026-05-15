'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.string(),
  status: z.string(),
  description: z.string().optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().optional(),
  costPrice: z.number().optional(),
  taxClass: z.string().optional(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  stockQuantity: z.number().min(0),
  lowStockThreshold: z.number().min(0),
  trackInventory: z.boolean(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function generateSKU() {
  return 'SKU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: 'simple',
      status: 'draft',
      price: 0,
      stockQuantity: 0,
      lowStockThreshold: 5,
      trackInventory: true,
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        slug: product.slug,
        type: product.type ?? 'simple',
        status: product.status,
        description: product.description ?? '',
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        costPrice: product.costPrice,
        taxClass: product.taxClass ?? 'standard',
        sku: product.sku,
        barcode: product.barcode ?? '',
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold ?? 5,
        trackInventory: product.trackInventory ?? true,
        metaTitle: product.metaTitle ?? '',
        metaDescription: product.metaDescription ?? '',
      });
    }
  }, [product, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProductFormData) => api.patch(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success('Product updated!');
    },
    onError: () => toast.error('Failed to update product'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{product?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <Tabs defaultValue="basic">
          <TabsList className="mb-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      {...register('name')}
                      onChange={(e) => {
                        register('name').onChange(e);
                        setValue('slug', slugify(e.target.value));
                      }}
                    />
                    {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input {...register('slug')} />
                    {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Product Type</Label>
                    <Select
                      value={watch('type')}
                      onValueChange={(v) => setValue('type', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={watch('status')}
                      onValueChange={(v) => setValue('status', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea {...register('description')} rows={5} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label>Price (BDT) *</Label>
                    <Input type="number" min={0} step={0.01} {...register('price', { valueAsNumber: true })} />
                    {errors.price && <p className="text-destructive text-xs">{errors.price.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Compare At Price</Label>
                    <Input type="number" min={0} step={0.01} {...register('compareAtPrice', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price</Label>
                    <Input type="number" min={0} step={0.01} {...register('costPrice', { valueAsNumber: true })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax Class</Label>
                  <Select value={watch('taxClass')} onValueChange={(v) => setValue('taxClass', v)}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (15%)</SelectItem>
                      <SelectItem value="reduced">Reduced (7.5%)</SelectItem>
                      <SelectItem value="zero">Zero Rated (0%)</SelectItem>
                      <SelectItem value="exempt">Tax Exempt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <div className="flex gap-2">
                      <Input {...register('sku')} />
                      <Button type="button" variant="outline" size="icon" onClick={() => setValue('sku', generateSKU())}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.sku && <p className="text-destructive text-xs">{errors.sku.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Barcode</Label>
                    <Input {...register('barcode')} placeholder="UPC, EAN, ISBN..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Stock Quantity</Label>
                    <Input type="number" min={0} {...register('stockQuantity', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Low Stock Threshold</Label>
                    <Input type="number" min={0} {...register('lowStockThreshold', { valueAsNumber: true })} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={watch('trackInventory')}
                    onCheckedChange={(v) => setValue('trackInventory', v)}
                  />
                  <Label>Track Inventory</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images placeholder */}
          <TabsContent value="images">
            <Card>
              <CardHeader><CardTitle>Images</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Image management available after save.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants placeholder */}
          <TabsContent value="variants">
            <Card>
              <CardHeader><CardTitle>Variants</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Variant management available after save.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo">
            <Card>
              <CardHeader><CardTitle>SEO Settings</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input {...register('metaTitle')} placeholder="SEO title" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea {...register('metaDescription')} rows={3} placeholder="SEO description" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories placeholder */}
          <TabsContent value="categories">
            <Card>
              <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Category assignments managed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

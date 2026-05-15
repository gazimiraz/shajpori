'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Minus, RefreshCw, X, ChevronRight, Loader2, ImagePlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  type: z.string(),
  status: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().optional(),
  costPrice: z.number().optional(),
  taxClass: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  stockQuantity: z.number().min(0),
  lowStockThreshold: z.number().min(0).default(5),
  trackInventory: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface VariantAttribute {
  name: string;
  values: string[];
}

interface Variant {
  combination: Record<string, string>;
  sku: string;
  price: number;
  stock: number;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function generateSKU() {
  return 'SKU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateProductPage() {
  const router = useRouter();
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
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

  const nameValue = watch('name');

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, String(v));
      });
      tags.forEach((t) => formData.append('tags[]', t));
      images.forEach((img) => formData.append('images', img));
      if (variants.length) formData.append('variants', JSON.stringify(variants));
      return api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      toast.success('Product created!');
      router.push('/products');
    },
    onError: () => toast.error('Failed to create product'),
  });

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    addImages(files);
  };

  const addImages = (files: File[]) => {
    setImages((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addAttribute = () =>
    setAttributes((prev) => [...prev, { name: '', values: [] }]);

  const updateAttribute = (index: number, field: 'name' | 'values', value: string | string[]) => {
    setAttributes((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const addAttributeValue = (attrIndex: number, value: string) => {
    if (!value.trim()) return;
    setAttributes((prev) => {
      const next = [...prev];
      next[attrIndex].values = [...next[attrIndex].values, value.trim()];
      return next;
    });
  };

  const removeAttributeValue = (attrIndex: number, valIndex: number) => {
    setAttributes((prev) => {
      const next = [...prev];
      next[attrIndex].values = next[attrIndex].values.filter((_, i) => i !== valIndex);
      return next;
    });
  };

  const generateVariants = () => {
    const filled = attributes.filter((a) => a.name && a.values.length > 0);
    if (filled.length === 0) return;

    const combine = (arrays: string[][]): Record<string, string>[] => {
      if (arrays.length === 0) return [{}];
      const [first, ...rest] = arrays;
      const restCombinations = combine(rest);
      return first.flatMap((val) =>
        restCombinations.map((combo) => ({ [filled[arrays.length - rest.length - 1].name]: val, ...combo }))
      );
    };

    const combinations = combine(filled.map((a) => a.values));
    const basePrice = watch('price') ?? 0;
    const newVariants: Variant[] = combinations.map((combo) => ({
      combination: combo,
      sku: generateSKU(),
      price: basePrice,
      stock: 0,
    }));
    setVariants(newVariants);
    toast.success(`Generated ${newVariants.length} variants`);
  };

  const updateVariant = (index: number, field: keyof Omit<Variant, 'combination'>, value: string | number) => {
    setVariants((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const onSubmit = (data: ProductFormData) => mutation.mutate(data);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Product</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Add a new product to your catalog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* Basic */}
          <TabsContent value="basic">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      {...register('name')}
                      placeholder="e.g. Floral Midi Dress"
                      onChange={(e) => {
                        register('name').onChange(e);
                        setValue('slug', slugify(e.target.value));
                      }}
                    />
                    {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input {...register('slug')} placeholder="floral-midi-dress" />
                    {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Product Type</Label>
                    <Select defaultValue="simple" onValueChange={(v) => setValue('type', v)}>
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
                    <Select defaultValue="draft" onValueChange={(v) => setValue('status', v)}>
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
                  <Textarea {...register('description')} placeholder="Product description..." rows={5} />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => setTags((t) => t.filter((x) => x !== tag))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tagInput.trim()) { setTags((t) => [...t, tagInput.trim()]); setTagInput(''); }
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => {
                      if (tagInput.trim()) { setTags((t) => [...t, tagInput.trim()]); setTagInput(''); }
                    }}>
                      Add
                    </Button>
                  </div>
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
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      {...register('price', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {errors.price && <p className="text-destructive text-xs">{errors.price.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Compare At Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      {...register('compareAtPrice', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      {...register('costPrice', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax Class</Label>
                  <Select defaultValue="standard" onValueChange={(v) => setValue('taxClass', v)}>
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
                      <Input {...register('sku')} placeholder="SKU-XXXXX" />
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
                    <Input
                      type="number"
                      min={0}
                      {...register('stockQuantity', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Low Stock Threshold</Label>
                    <Input
                      type="number"
                      min={0}
                      {...register('lowStockThreshold', { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    defaultChecked
                    onCheckedChange={(v) => setValue('trackInventory', v)}
                  />
                  <Label>Track Inventory</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images */}
          <TabsContent value="images">
            <Card>
              <CardHeader><CardTitle>Product Images</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleImageDrop}
                  onClick={() => document.getElementById('image-input')?.click()}
                >
                  <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Drag & drop images here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse (PNG, JPG, WEBP)</p>
                  <input
                    id="image-input"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => addImages(Array.from(e.target.files ?? []))}
                  />
                </div>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative group aspect-square">
                        <img src={src} alt={`Preview ${i}`} className="w-full h-full object-cover rounded-md border" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-white px-1 rounded">Main</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants */}
          <TabsContent value="variants">
            <Card>
              <CardHeader><CardTitle>Product Variants</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {attributes.map((attr, attrIdx) => (
                  <div key={attrIdx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        value={attr.name}
                        onChange={(e) => updateAttribute(attrIdx, 'name', e.target.value)}
                        placeholder="Attribute name (e.g. Size, Color)"
                        className="max-w-xs"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setAttributes((prev) => prev.filter((_, i) => i !== attrIdx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {attr.values.map((val, valIdx) => (
                        <Badge key={valIdx} variant="secondary" className="gap-1">
                          {val}
                          <button type="button" onClick={() => removeAttributeValue(attrIdx, valIdx)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <Input
                        className="w-32 h-7 text-sm"
                        placeholder="Add value..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addAttributeValue(attrIdx, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={addAttribute} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Attribute
                  </Button>
                  {attributes.length > 0 && (
                    <Button type="button" size="sm" onClick={generateVariants} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Generate Variants
                    </Button>
                  )}
                </div>

                {variants.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Variant</th>
                          <th className="text-left px-4 py-2 font-medium">SKU</th>
                          <th className="text-left px-4 py-2 font-medium">Price</th>
                          <th className="text-left px-4 py-2 font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((variant, vIdx) => (
                          <tr key={vIdx} className="border-t">
                            <td className="px-4 py-2 font-medium">
                              {Object.values(variant.combination).join(' / ')}
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={variant.sku}
                                onChange={(e) => updateVariant(vIdx, 'sku', e.target.value)}
                                className="h-7 text-xs"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                value={variant.price}
                                onChange={(e) => updateVariant(vIdx, 'price', Number(e.target.value))}
                                className="h-7 text-xs w-24"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                value={variant.stock}
                                onChange={(e) => updateVariant(vIdx, 'stock', Number(e.target.value))}
                                className="h-7 text-xs w-20"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                  <Input {...register('metaTitle')} placeholder="SEO title (leave empty to use product name)" />
                  <p className="text-xs text-muted-foreground">Recommended: 50-60 characters</p>
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea
                    {...register('metaDescription')}
                    placeholder="SEO description..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 150-160 characters</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Search Preview</p>
                  <p className="text-blue-600 text-sm font-medium truncate">
                    {watch('metaTitle') || watch('name') || 'Product Name'}
                  </p>
                  <p className="text-green-700 text-xs">shaj.com.bd/products/{watch('slug') || 'product-slug'}</p>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                    {watch('metaDescription') || watch('description') || 'Product description will appear here...'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="outline"
              onClick={() => setValue('status', 'draft')}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Draft
            </Button>
            <Button
              type="submit"
              onClick={() => setValue('status', 'active')}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publish Product
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

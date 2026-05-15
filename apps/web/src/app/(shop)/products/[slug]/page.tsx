"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star, Heart, ShoppingCart, Zap, Minus, Plus, Truck,
  RotateCcw, Shield, Share2, ChevronRight, Check, Package, ThumbsUp,
} from "lucide-react";
import { cn, formatBDT, formatDate } from "@/lib/utils";
import { ProductCard } from "@/components/product/product-card";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const STAR_INDICES = [0, 1, 2, 3, 4];

/* ─── Derive unique attribute values from variants ───────────────────────── */
function getAttrValues(variants: any[], attrName: string): string[] {
  const seen = new Set<string>();
  for (const v of variants) {
    for (const av of v.attributeValues ?? []) {
      if (av.attributeValue?.attribute?.name === attrName) {
        seen.add(av.attributeValue.value);
      }
    }
  }
  return [...seen];
}

/* ─── Rating bar ─────────────────────────────────────────────────────────── */
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-3">{stars}</span>
      <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="container-fluid py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
        <div className="space-y-4">
          <div className="aspect-[3/4] rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <div key={i} className="aspect-square rounded-xl bg-slate-200 dark:bg-slate-800" />)}
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-20" />
          </div>
          <div className="h-4 bg-slate-200 rounded w-48" />
          <div className="h-8 bg-slate-200 rounded w-32" />
          <div className="h-12 bg-slate-200 rounded-full" />
          <div className="h-12 bg-slate-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const qc = useQueryClient();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "reviews">("description");
  const [addedToCart, setAddedToCart] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");

  const addItem = useCartStore(s => s.addItem);
  const { toggle: toggleWishlist, has } = useWishlistStore();

  /* ── Product query ───────────────────────────────────────────────────── */
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get(`/products/${slug}`).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  /* ── Variants query (depends on product.id) ──────────────────────────── */
  const { data: variants = [] } = useQuery({
    queryKey: ["variants", product?.id],
    queryFn: () => api.get(`/products/${product!.id}/variants`).then(r => r.data.data ?? r.data),
    enabled: !!product?.id,
    staleTime: 5 * 60 * 1000,
  });

  /* ── Related query (depends on product.id) ───────────────────────────── */
  const { data: relatedRes } = useQuery({
    queryKey: ["related", product?.id],
    queryFn: () => api.get(`/products/${product!.id}/related`, { params: { limit: 4 } }).then(r => r.data.data ?? r.data),
    enabled: !!product?.id,
    staleTime: 5 * 60 * 1000,
  });
  const relatedProducts: any[] = (relatedRes ?? []).map((p: any) => ({
    ...p,
    sku: p.sku ?? p.id.slice(0, 8).toUpperCase(),
  }));

  /* ── Reviews query (depends on product.id, only when tab is active) ─── */
  const { data: reviewsRes } = useQuery({
    queryKey: ["reviews", product?.id],
    queryFn: () => api.get("/reviews", { params: { productId: product!.id, limit: 20 } }).then(r => r.data),
    enabled: !!product?.id && activeTab === "reviews",
    staleTime: 2 * 60 * 1000,
  });
  const reviews: any[] = reviewsRes?.data ?? [];

  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { counts[r.rating] = (counts[r.rating] || 0) + 1; });
    return counts;
  }, [reviews]);

  /* ── Submit review mutation ──────────────────────────────────────────── */
  const reviewMutation = useMutation({
    mutationFn: (data: { productId: string; rating: number; title: string; body: string }) =>
      api.post("/reviews", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", product?.id] });
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewTitle("");
      setReviewBody("");
      toast.success("Review submitted! It will appear after approval.");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to submit review"),
  });

  /* ── Derived values ──────────────────────────────────────────────────── */
  const images: string[] = useMemo(
    () => (product?.images ?? []).sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((i: any) => i.url),
    [product],
  );

  const colors = useMemo(() => getAttrValues(variants, "Color"), [variants]);
  const sizes  = useMemo(() => getAttrValues(variants, "Size"),  [variants]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v: any) => {
      const attrs: Record<string, string> = {};
      for (const av of v.attributeValues ?? []) {
        attrs[av.attributeValue.attribute.name] = av.attributeValue.value;
      }
      const colorMatch = !selectedColor || attrs.Color === selectedColor;
      const sizeMatch  = !selectedSize  || attrs.Size  === selectedSize;
      return colorMatch && sizeMatch;
    }) ?? null;
  }, [variants, selectedColor, selectedSize]);

  const displayPrice   = selectedVariant?.price ?? product?.price ?? 0;
  const compareAtPrice = product?.compareAtPrice ?? null;
  const discount       = compareAtPrice ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100) : 0;
  const inWishlist     = has(product?.id ?? "");
  const hasVariants    = variants.length > 0;
  const requiresSize   = sizes.length > 0;

  const wishlistItem = {
    id: product?.id ?? "",
    productId: product?.id ?? "",
    name: product?.name ?? "",
    slug,
    image: images[0],
    price: displayPrice,
  };

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleAddToCart = () => {
    if (requiresSize && !selectedSize) { toast.error("Please select a size"); return; }
    addItem({
      id: selectedVariant?.id ?? `${product.id}-default`,
      productId: product.id,
      name: product.name,
      slug,
      image: images[0],
      price: displayPrice,
      quantity,
      sku: selectedVariant?.sku ?? product.sku ?? product.id.slice(0, 8).toUpperCase(),
      attributes: {
        ...(selectedColor ? { Color: selectedColor } : {}),
        ...(selectedSize  ? { Size: selectedSize }   : {}),
      },
    });
    setAddedToCart(true);
    toast.success("Added to cart!");
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (requiresSize && !selectedSize) { toast.error("Please select a size"); return; }
    handleAddToCart();
    window.location.href = "/checkout";
  };

  /* ── States ──────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="container-fluid py-3">
            <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
          </div>
        </div>
        <Skeleton />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <Package className="w-16 h-16 text-gray-200 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Product not found</h1>
        <p className="text-gray-500 mb-6">This product doesn&apos;t exist or has been removed.</p>
        <Link href="/products" className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  const rating      = product.averageRating ?? 0;
  const reviewCount = product.reviewCount   ?? 0;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Breadcrumb */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container-fluid py-3">
          <nav className="text-sm text-slate-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-primary-600">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/products" className="hover:text-primary-600">Products</Link>
            {product.categories?.[0] && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href={`/products?categoryId=${product.categories[0].id}`} className="hover:text-primary-600">
                  {product.categories[0].name}
                </Link>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-medium truncate max-w-48">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container-fluid py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* ── Image Gallery ────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImageIdx}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
                >
                  {images[selectedImageIdx] ? (
                    <Image src={images[selectedImageIdx]} alt={product.name} fill className="object-cover" priority />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-20 h-20" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discount}% OFF
                </div>
              )}

              <button
                onClick={() => toggleWishlist(wishlistItem)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-md flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Heart className={cn("w-5 h-5 transition-colors", inWishlist ? "fill-red-500 text-red-500" : "text-slate-400")} />
              </button>

              <button
                onClick={() => { navigator.share?.({ title: product.name, url: window.location.href }) ?? navigator.clipboard.writeText(window.location.href).then(() => toast.success("Link copied!")); }}
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-md flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.slice(0, 4).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIdx(i)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200",
                      selectedImageIdx === i
                        ? "border-primary-600 ring-2 ring-primary-300"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary-300"
                    )}
                  >
                    <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ─────────────────────────────────────────── */}
          <div className="space-y-6">
            <div>
              {product.brand && (
                <p className="text-primary-600 text-sm font-semibold uppercase tracking-wider mb-1">{product.brand.name}</p>
              )}
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">{product.name}</h1>
              {product.sku && <p className="text-slate-400 text-xs mt-1">SKU: {product.sku}</p>}
            </div>

            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {STAR_INDICES.map(i => (
                    <Star key={i} className={cn("w-4 h-4", i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{rating.toFixed(1)}</span>
                <span className="text-sm text-slate-400">({reviewCount} reviews)</span>
                {reviewCount > 0 && (
                  <button onClick={() => setActiveTab("reviews")} className="text-xs text-primary-600 font-semibold underline">
                    Read Reviews
                  </button>
                )}
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatBDT(displayPrice)}</span>
              {compareAtPrice && (
                <>
                  <span className="text-xl text-slate-400 line-through">{formatBDT(compareAtPrice)}</span>
                  <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">{discount}% OFF</span>
                </>
              )}
            </div>

            {/* Stock status */}
            {(product.stockQuantity ?? 1) <= 0 && (
              <div className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Out of Stock
              </div>
            )}

            {/* Color selector */}
            {colors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Color:</span>
                  {selectedColor && <span className="text-sm text-slate-500">{selectedColor}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(c => c === color ? "" : color)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all duration-150",
                        selectedColor === color
                          ? "border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Size:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(s => s === size ? "" : size)}
                      className={cn(
                        "w-12 h-10 rounded-lg border text-sm font-semibold transition-all duration-150",
                        selectedSize === size
                          ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                          : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-400"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block mb-3">Quantity:</span>
              <div className="flex items-center gap-0 border border-slate-300 dark:border-slate-700 rounded-xl w-fit overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-bold tabular-nums">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddToCart}
                disabled={(product.stockQuantity ?? 1) <= 0}
                className={cn(
                  "btn flex-1 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                  addedToCart ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "btn-primary"
                )}
              >
                {addedToCart
                  ? <><Check className="w-5 h-5" /> Added to Cart</>
                  : <><ShoppingCart className="w-5 h-5" /> Add to Cart</>
                }
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleBuyNow}
                disabled={(product.stockQuantity ?? 1) <= 0}
                className="btn btn-accent flex-1 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" /> Buy Now
              </motion.button>
              <button
                onClick={() => toggleWishlist(wishlistItem)}
                className={cn(
                  "btn border-2 w-12 sm:w-12 flex-shrink-0",
                  inWishlist
                    ? "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20"
                    : "border-slate-300 dark:border-slate-700 text-slate-400 hover:border-red-300 hover:text-red-400"
                )}
              >
                <Heart className={cn("w-5 h-5", inWishlist && "fill-red-500")} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Truck,     label: "Free Delivery", sub: "On orders ৳2,000+" },
                { icon: RotateCcw, label: "Easy Returns",  sub: "7-day policy" },
                { icon: Shield,    label: "Secure Pay",    sub: "100% protected" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <Icon className="w-5 h-5 text-primary-600 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="mt-14">
            <div className="border-b border-slate-200 dark:border-slate-800 flex gap-1">
              {(["description", "specs", "reviews"] as const).map(tab => {
                if (tab === "specs" && !product.specifications?.length) return null;
                if (tab === "description" && !product.description) return null;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-6 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px",
                      activeTab === tab
                        ? "border-primary-600 text-primary-600"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    {tab === "specs" ? "Specifications" : tab === "reviews" ? `Reviews (${reviewCount})` : tab}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="py-8"
              >
                {activeTab === "description" && product.description && (
                  <div
                    className="prose prose-slate dark:prose-invert max-w-3xl text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                )}

                {activeTab === "specs" && product.specifications?.length > 0 && (
                  <div className="max-w-2xl">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {product.specifications.map(({ key, value }: any) => (
                          <tr key={key}>
                            <td className="py-3 pr-6 font-semibold text-slate-700 dark:text-slate-300 w-40">{key}</td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="max-w-3xl space-y-8">
                    {/* Summary + Write button */}
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                      <div className="text-center shrink-0">
                        <div className="text-6xl font-extrabold text-slate-900 dark:text-white">{rating.toFixed(1)}</div>
                        <div className="flex justify-center gap-0.5 my-2">
                          {STAR_INDICES.map(i => (
                            <Star key={i} className={cn("w-5 h-5", i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                          ))}
                        </div>
                        <p className="text-slate-400 text-sm">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex-1 space-y-2 min-w-0">
                        {[5, 4, 3, 2, 1].map(stars => (
                          <RatingBar key={stars} stars={stars} count={starCounts[stars] ?? 0} total={reviews.length} />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (!localStorage.getItem("web_token")) { toast.error("Sign in to write a review"); return; }
                          setShowReviewForm(f => !f);
                        }}
                        className="shrink-0 px-5 py-2.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
                      >
                        Write a Review
                      </button>
                    </div>

                    {/* Submit review form */}
                    {showReviewForm && (
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Your Review</h3>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Rating</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button
                                key={s}
                                onMouseEnter={() => setHoverRating(s)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setReviewRating(s)}
                                className="p-0.5"
                              >
                                <Star className={cn("w-7 h-7 transition-colors", s <= (hoverRating || reviewRating) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                          <input
                            value={reviewTitle}
                            onChange={e => setReviewTitle(e.target.value)}
                            placeholder="Summarize your experience"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:border-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Review</label>
                          <textarea
                            value={reviewBody}
                            onChange={e => setReviewBody(e.target.value)}
                            rows={4}
                            placeholder="What did you like or dislike?"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:border-black resize-none"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => reviewMutation.mutate({ productId: product.id, rating: reviewRating, title: reviewTitle, body: reviewBody })}
                            disabled={reviewMutation.isPending || reviewRating === 0}
                            className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                          </button>
                          <button
                            onClick={() => setShowReviewForm(false)}
                            className="px-4 py-2.5 border border-slate-200 rounded-full text-sm font-medium hover:border-slate-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reviews list */}
                    {reviews.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        <Star className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                        <p className="font-medium text-slate-600 dark:text-slate-400">No reviews yet</p>
                        <p className="text-sm mt-1">Be the first to review this product</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {reviews.map((review: any) => (
                          <div key={review.id} className="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                {review.user?.firstName?.[0]}{review.user?.lastName?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                    {review.user?.firstName} {review.user?.lastName}
                                  </span>
                                  {review.isVerified && (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Verified Purchase
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
                                </div>
                                <div className="flex gap-0.5 mt-1 mb-2">
                                  {STAR_INDICES.map(i => (
                                    <Star key={i} className={cn("w-3.5 h-3.5", i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                                  ))}
                                </div>
                                {review.title && <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">{review.title}</p>}
                                {review.body && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{review.body}</p>}
                                {review.helpfulCount > 0 && (
                                  <button
                                    onClick={() => api.patch(`/reviews/${review.id}/helpful`)}
                                    className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" /> {review.helpfulCount} found this helpful
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        {/* ── Related products ──────────────────────────────────────────── */}
        {relatedProducts.length > 0 && (
          <div className="mt-14">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6">You May Also Like</h2>
            <div className="product-grid">
              {relatedProducts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

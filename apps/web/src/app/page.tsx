"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ChevronLeft, ChevronRight, Truck, Headphones, RefreshCw, ShoppingCart,
} from "lucide-react";
import { ProductCard } from "@/components/product/product-card";

/* ─── Hero slides ─────────────────────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
    title: "SHAJ BRAND",
    subtitle: "Bangladesh's most trusted fashion destination",
    cta: "Shop Now",
    href: "/products",
    bg: "from-amber-900/80 to-amber-700/60",
  },
  {
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
    title: "New Arrivals",
    subtitle: "Fresh styles every week — be the first to wear what's trending",
    cta: "Explore",
    href: "/products?sort=newest",
    bg: "from-pink-900/80 to-pink-700/50",
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
    title: "Summer Sale",
    subtitle: "Up to 50% off on selected items — limited time only",
    cta: "See Deals",
    href: "/products?sale=true",
    bg: "from-indigo-900/80 to-indigo-700/50",
  },
];

/* ─── Category icons (fallback) ───────────────────────────────────────────── */
const FALLBACK_CATS = [
  { name: "Women",       image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&q=75", slug: "women" },
  { name: "Men",         image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&q=75", slug: "men" },
  { name: "Kids",        image: "https://images.unsplash.com/photo-1471286174890-9c112ac6476d?w=200&q=75", slug: "kids" },
  { name: "Accessories", image: "https://images.unsplash.com/photo-1523779105320-d1cd346ff52b?w=200&q=75", slug: "accessories" },
  { name: "Footwear",    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=75", slug: "footwear" },
  { name: "Beauty",      image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=75", slug: "beauty" },
];

/* ─── Features ────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Truck,       title: "Free Shipping & Delivery", desc: "Free delivery on orders over ৳2,000" },
  { icon: Headphones,  title: "24/7 Customer Support",    desc: "Always available for any questions" },
  { icon: RefreshCw,   title: "Easy Return Policy",       desc: "7-day hassle-free return policy" },
];

/* ─── Hero slider ─────────────────────────────────────────────────────────── */
function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const len = HERO_SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % len), 5000);
    return () => clearInterval(t);
  }, []);

  const prev = () => setCurrent(p => (p - 1 + len) % len);
  const next = () => setCurrent(p => (p + 1) % len);
  const s = HERO_SLIDES[current];

  return (
    <div className="relative w-full overflow-hidden bg-gray-900" style={{ aspectRatio: "16/6" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <Image src={s.image} alt={s.title} fill className="object-cover object-top" priority />
          <div className={`absolute inset-0 bg-gradient-to-r ${s.bg}`} />
          <div className="absolute inset-0 flex items-center px-10 sm:px-16 lg:px-24">
            <div className="max-w-md">
              <motion.h2
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3 leading-tight"
              >
                {s.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="text-white/80 text-sm sm:text-base mb-6 leading-relaxed"
              >
                {s.subtitle}
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-colors"
                >
                  {s.cta} <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors z-10">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors z-10">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i} onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Category icon row ───────────────────────────────────────────────────── */
function CategoryIcons({ categories }: { categories: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cats = categories.length > 0 ? categories : FALLBACK_CATS;

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center">
      <button onClick={() => scroll("left")} className="absolute left-0 z-10 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-md flex-shrink-0 -ml-4">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar px-6 py-2">
        {cats.map((cat: any, i: number) => {
          const slug  = cat.slug ?? cat.name?.toLowerCase();
          const image = cat.image ?? FALLBACK_CATS[i % FALLBACK_CATS.length]?.image;
          return (
            <Link key={cat.id ?? i} href={`/products?category=${slug}`} className="flex flex-col items-center gap-2 flex-shrink-0 group">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-pink-400 transition-colors bg-gray-100 shadow">
                <Image src={image} alt={cat.name} width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs text-gray-600 font-medium text-center whitespace-nowrap">{cat.name}</span>
            </Link>
          );
        })}
      </div>

      <button onClick={() => scroll("right")} className="absolute right-0 z-10 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-md flex-shrink-0 -mr-4">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Product section (category row) ─────────────────────────────────────── */
function ProductSection({ title, href, products, loading }: {
  title: string; href: string; products: any[]; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-pink-500 uppercase tracking-wide">{title}</h2>
        <Link href={href} className="text-xs text-gray-500 hover:text-pink-500 transition-colors font-medium">
          View All →
        </Link>
      </div>
      {/* Products */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-100">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-3 animate-pulse">
                <div className="aspect-square bg-gray-100 rounded-lg mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))
          : products.slice(0, 4).map((p: any) => (
              <div key={p.id} className="bg-white p-3">
                <ProductCard product={p} />
              </div>
            ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories", { params: { limit: 10 } }).then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  const { data: womenData, isLoading: loadingWomen } = useQuery({
    queryKey: ["products", "women"],
    queryFn: () => api.get("/products", { params: { category: "women", limit: 4, status: "ACTIVE" } }).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: newData, isLoading: loadingNew } = useQuery({
    queryKey: ["products", "new"],
    queryFn: () => api.get("/products", { params: { sortBy: "createdAt", sortOrder: "desc", limit: 4, status: "ACTIVE" } }).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredData, isLoading: loadingFeatured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => api.get("/products", { params: { isFeatured: true, limit: 8, status: "ACTIVE" } }).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const toCard = (p: any) => ({ ...p, sku: p.sku ?? p.id.slice(0, 8).toUpperCase() });
  const categories  = categoriesData ?? [];
  const women       = (womenData    ?? []).map(toCard);
  const newArrivals = (newData      ?? []).map(toCard);
  const featured    = (featuredData ?? []).map(toCard);

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Hero Slider ───────────────────────────────────────────────── */}
      <HeroSlider />

      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 space-y-4 py-4">

        {/* ── Category Icons ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-4 overflow-hidden">
          <CategoryIcons categories={categories} />
        </div>

        {/* ── Women Section ─────────────────────────────────────────── */}
        <ProductSection
          title="Women"
          href="/products?category=women"
          products={women}
          loading={loadingWomen}
        />

        {/* ── New Arrivals Section ───────────────────────────────────── */}
        <ProductSection
          title="New Arrivals"
          href="/products?sort=newest"
          products={newArrivals}
          loading={loadingNew}
        />

        {/* ── All Products ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />
              All Products
            </h2>
            <Link href="/products" className="text-xs text-gray-500 hover:text-pink-500 transition-colors font-medium">
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-100">
            {loadingFeatured
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white p-3 animate-pulse">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))
              : featured.map((p: any) => (
                  <div key={p.id} className="bg-white p-3">
                    <ProductCard product={p} />
                  </div>
                ))}
          </div>

          {featured.length > 0 && (
            <div className="text-center py-5 border-t border-gray-100">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-8 py-2.5 rounded-full text-sm font-bold transition-colors"
              >
                <ShoppingCart className="w-4 h-4" /> View All Products
              </Link>
            </div>
          )}
        </div>

        {/* ── Features Bar ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

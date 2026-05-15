"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/product/product-card";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Filters {
  categories: string[];
  priceMin: number;
  priceMax: number;
  brands: string[];
  ratings: number[];
  sizes: string[];
  colors: string[];
}

interface SortOption {
  value: string;
  label: string;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const SORT_OPTIONS: SortOption[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest First" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "best-selling", label: "Best Selling" },
  { value: "rating", label: "Highest Rated" },
];

const CATEGORIES = ["Women", "Men", "Kids", "Accessories", "Footwear", "Beauty", "Home & Living"];
const BRANDS = ["Shaj Collection", "Shaj Men", "Shaj Ethnic", "Shaj Active", "Shaj Accessories", "Shaj Jewels", "Shaj Premium"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "28", "30", "32", "34", "36", "38"];
const COLORS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Red", hex: "#e11d48" },
  { name: "Green", hex: "#059669" },
  { name: "Yellow", hex: "#f59e0b" },
  { name: "Pink", hex: "#f472b6" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Grey", hex: "#9ca3af" },
  { name: "Beige", hex: "#d2b48c" },
];


/* ─── Filter Accordion ──────────────────────────────────────────────────── */
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between w-full text-sm font-semibold
                   text-slate-800 dark:text-slate-200 mb-3 hover:text-primary-600 transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sidebar ───────────────────────────────────────────────────────────── */
function FilterSidebar({
  filters,
  setFilters,
  onReset,
  categoryNames,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  onReset: () => void;
  categoryNames: string[];
}) {
  const toggle = useCallback(
    (key: keyof Filters, value: string | number) => {
      const arr = filters[key] as (string | number)[];
      const next = arr.includes(value as never)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      setFilters({ ...filters, [key]: next });
    },
    [filters, setFilters]
  );

  const activeCount =
    filters.categories.length +
    filters.brands.length +
    filters.ratings.length +
    filters.sizes.length +
    filters.colors.length +
    (filters.priceMin > 0 || filters.priceMax < 20000 ? 1 : 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sticky top-24">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {activeCount > 0 && (
            <span className="badge-new text-xs">{activeCount}</span>
          )}
        </h3>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-xs text-primary-600 font-semibold hover:underline">
            Reset All
          </button>
        )}
      </div>

      {/* Categories */}
      <FilterSection title="Category">
        <div className="space-y-2">
          {(categoryNames.length > 0 ? categoryNames : CATEGORIES).map((cat) => (
            <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.categories.includes(cat)}
                onChange={() => toggle("categories", cat)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-primary-600 transition-colors">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>৳ {filters.priceMin.toLocaleString()}</span>
            <span>৳ {filters.priceMax.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={0}
            max={20000}
            step={100}
            value={filters.priceMax}
            onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
            className="w-full accent-primary-600"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceMin || ""}
              onChange={(e) => setFilters({ ...filters, priceMin: Number(e.target.value) })}
              className="input text-xs py-1.5 px-2"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.priceMax || ""}
              onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
              className="input text-xs py-1.5 px-2"
            />
          </div>
        </div>
      </FilterSection>

      {/* Brands */}
      <FilterSection title="Brand">
        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
          {BRANDS.map((brand) => (
            <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.brands.includes(brand)}
                onChange={() => toggle("brands", brand)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-primary-600 transition-colors">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Customer Rating">
        <div className="space-y-2">
          {[4, 3, 2, 1].map((r) => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.ratings.includes(r)}
                onChange={() => toggle("ratings", r)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn("w-3.5 h-3.5", i < r ? "star-filled" : "star-empty")}
                  />
                ))}
                <span className="text-xs text-slate-500 ml-1">& up</span>
              </div>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Sizes */}
      <FilterSection title="Size">
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => toggle("sizes", size)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all duration-150",
                filters.sizes.includes(size)
                  ? "bg-primary-600 border-primary-600 text-white"
                  : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-400"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Colors */}
      <FilterSection title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => toggle("colors", color.name)}
              title={color.name}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all duration-150 relative",
                filters.colors.includes(color.name)
                  ? "border-primary-600 scale-110 ring-2 ring-primary-300"
                  : "border-slate-200 dark:border-slate-700 hover:scale-110"
              )}
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_FILTERS: Filters = {
  categories: [],
  priceMin: 0,
  priceMax: 20000,
  brands: [],
  ratings: [],
  sizes: [],
  colors: [],
};

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  /* ── Categories from API ─────────────────────────────────────────────── */
  const { data: categoriesRes } = useQuery({
    queryKey: ["categories", "filter"],
    queryFn: () => api.get("/categories", { params: { limit: 50 } }).then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
  const apiCategories: Array<{ id: string; name: string; slug: string }> = categoriesRes ?? [];
  const categoryNames = apiCategories.map(c => c.name);

  /* ── Build API params from filter state ──────────────────────────────── */
  const apiParams = useMemo(() => {
    const p: Record<string, any> = { page, limit: ITEMS_PER_PAGE, status: "ACTIVE" };
    if (search) p.search = search;
    if (filters.priceMin > 0) p.minPrice = filters.priceMin;
    if (filters.priceMax < 20000) p.maxPrice = filters.priceMax;
    if (sort === "price-asc")  { p.sortBy = "price";     p.sortOrder = "asc"; }
    else if (sort === "price-desc") { p.sortBy = "price"; p.sortOrder = "desc"; }
    else if (sort === "newest")     { p.sortBy = "createdAt"; p.sortOrder = "desc"; }
    else                            { p.sortBy = "createdAt"; p.sortOrder = "desc"; }
    if (filters.categories.length === 1) {
      const cat = apiCategories.find(c => c.name === filters.categories[0]);
      if (cat) p.categoryId = cat.id;
    }
    return p;
  }, [page, search, filters.priceMin, filters.priceMax, filters.categories, sort, apiCategories]);

  /* ── Products query ──────────────────────────────────────────────────── */
  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "listing", apiParams],
    queryFn: () => api.get("/products", { params: apiParams }).then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  /* ── Client-side brand/rating filter on returned page ───────────────── */
  const paginatedProducts = useMemo(() => {
    let items: any[] = (productsRes?.data ?? []).map((p: any) => ({
      ...p,
      sku: p.sku ?? p.id.slice(0, 8).toUpperCase(),
    }));
    if (filters.brands.length) items = items.filter(p => p.brand && filters.brands.includes(p.brand.name));
    if (filters.ratings.length) items = items.filter(p => p.averageRating && filters.ratings.some((r: number) => p.averageRating >= r));
    return items;
  }, [productsRes, filters.brands, filters.ratings]);

  const totalPages  = productsRes?.meta?.totalPages ?? 1;
  const totalCount  = productsRes?.meta?.total ?? 0;

  /* Reset page when filters/search/sort change */
  useEffect(() => { setPage(1); }, [search, filters, sort]);

  /* ── Active chips ────────────────────────────────────────────────────── */
  const activeChips: { key: keyof Filters; value: string }[] = [
    ...filters.categories.map((v) => ({ key: "categories" as const, value: v })),
    ...filters.brands.map((v) => ({ key: "brands" as const, value: v })),
    ...filters.ratings.map((v) => ({ key: "ratings" as const, value: `${v}★ & up` })),
    ...filters.sizes.map((v) => ({ key: "sizes" as const, value: `Size: ${v}` })),
    ...filters.colors.map((v) => ({ key: "colors" as const, value: v })),
    ...(filters.priceMin > 0 || filters.priceMax < 20000
      ? [{ key: "priceMax" as const, value: `৳${filters.priceMin}–৳${filters.priceMax}` }]
      : []),
  ];

  const removeChip = (key: keyof Filters, value: string) => {
    if (key === "priceMax") {
      setFilters({ ...filters, priceMin: 0, priceMax: 20000 });
    } else {
      const rawVal = value.startsWith("Size: ") ? value.replace("Size: ", "") :
                     value.endsWith("★ & up") ? Number(value[0]) : value;
      setFilters({
        ...filters,
        [key]: (filters[key] as (string | number)[]).filter((v) => v !== rawVal),
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container-fluid py-3">
          <nav className="text-sm text-slate-500">
            <span className="hover:text-primary-600 cursor-pointer">Home</span>
            <span className="mx-2">/</span>
            <span className="text-slate-900 dark:text-white font-medium">Products</span>
          </nav>
        </div>
      </div>

      <div className="container-fluid py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">All Products</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {productsLoading ? "Loading..." : `${totalCount} results found`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 pr-4 py-2 text-sm w-52"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="input py-2 pr-8 text-sm appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* View mode */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2", viewMode === "grid" ? "bg-primary-600 text-white" : "text-slate-400 hover:text-slate-700")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2", viewMode === "list" ? "bg-primary-600 text-white" : "text-slate-400 hover:text-slate-700")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden btn-outline btn-sm flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {activeChips.length > 0 && (
                <span className="badge-new">{activeChips.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {activeChips.map(({ key, value }) => (
              <span
                key={`${key}-${value}`}
                className="inline-flex items-center gap-1.5 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800
                           text-primary-700 dark:text-primary-300 rounded-full px-3 py-1 text-xs font-medium"
              >
                {value}
                <button onClick={() => removeChip(key, value)}>
                  <X className="w-3 h-3 hover:text-accent-500" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs text-slate-500 hover:text-accent-500 font-medium underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-7">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              categoryNames={categoryNames}
            />
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-3 space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No products found</h3>
                <p className="text-slate-500 text-sm">Try adjusting your filters or search query.</p>
                <button onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(""); }} className="btn-primary mt-6">
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5"
                      : "flex flex-col gap-4"
                  )}
                >
                  {paginatedProducts.map((product: any, i: number) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.35 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn-ghost btn-sm disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "w-9 h-9 rounded-lg text-sm font-semibold transition-all",
                          p === page
                            ? "bg-primary-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn-ghost btn-sm disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="overlay lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 z-50 overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-5">
                <FilterSidebar
                  filters={filters}
                  setFilters={setFilters}
                  onReset={() => setFilters(DEFAULT_FILTERS)}
                  categoryNames={categoryNames}
                />
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="btn-primary w-full"
                >
                  Show {totalCount} Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageContent />
    </Suspense>
  );
}

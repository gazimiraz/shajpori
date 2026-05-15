'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Heart, Search, Menu, X, User, ChevronDown, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cart.store';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Women',       href: '/products?category=women' },
  { label: 'Men',         href: '/products?category=men' },
  { label: 'Promotion',   href: '/products?sale=true' },
  { label: 'New Arrivals',href: '/products?sort=newest' },
  { label: 'Buy 1 Get 1', href: '/products?offer=b1g1' },
  { label: 'Track Order', href: '/track' },
];

export function Navbar() {
  const pathname   = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQ, setSearchQ]       = useState('');
  const itemCount  = useCartStore(s => s.itemCount());

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        {/* ── Row 1: Logo + Search + Icons ─────────────────────────────── */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 items-center h-14">
            {/* Logo — left */}
            <Link href="/" className="flex-shrink-0 justify-self-start">
              <span className="text-2xl font-black text-pink-500 tracking-tight leading-none">Shaj</span>
              <span className="text-[10px] text-gray-400 block -mt-1 tracking-widest uppercase">Fashion</span>
            </Link>

            {/* Search — center */}
            <form action="/products" method="get" className="w-full max-w-lg justify-self-center">
              <div className="relative">
                <input
                  name="q" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Enter product name..."
                  className="w-full border border-gray-200 rounded-full px-4 py-2 text-sm pr-10
                             focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Icons — right */}
            <div className="flex items-center gap-1 justify-self-end">
              <Link href="/account" className="flex flex-col items-center p-2 text-gray-600 hover:text-pink-500 transition-colors hidden sm:flex">
                <User className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Account</span>
              </Link>
              <Link href="/wishlist" className="flex flex-col items-center p-2 text-gray-600 hover:text-pink-500 transition-colors hidden sm:flex">
                <Heart className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Wishlist</span>
              </Link>
              <Link href="/cart" className="flex flex-col items-center p-2 text-gray-600 hover:text-pink-500 transition-colors relative">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-pink-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 hidden sm:block">Cart</span>
              </Link>
              <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(s => !s)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 2: Category Nav Bar ───────────────────────────────────── */}
        <div className="bg-pink-500">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
              {/* All Categories */}
              <button className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 text-xs font-bold whitespace-nowrap flex-shrink-0 transition-colors">
                <Menu className="w-3.5 h-3.5" />
                All Categories
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Nav Links */}
              {NAV_LINKS.map(l => (
                <Link
                  key={l.href} href={l.href}
                  className={cn(
                    'px-4 py-2.5 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors',
                    pathname === l.href
                      ? 'text-white bg-pink-600'
                      : 'text-white/90 hover:text-white hover:bg-pink-600'
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile Menu ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden bg-white border-t border-gray-100 px-4 py-3"
            >
              {NAV_LINKS.map(l => (
                <Link
                  key={l.href} href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-gray-700 py-2.5 border-b border-gray-50 last:border-0"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex gap-4 pt-3">
                <Link href="/account" className="text-sm text-gray-600 hover:text-pink-500" onClick={() => setMobileOpen(false)}>Account</Link>
                <Link href="/wishlist" className="text-sm text-gray-600 hover:text-pink-500" onClick={() => setMobileOpen(false)}>Wishlist</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer for fixed header (2 rows) */}
      <div className="h-[calc(3.5rem+2.5rem)]" />
    </>
  );
}

export default Navbar;

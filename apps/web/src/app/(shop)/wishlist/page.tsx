'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';
import { formatBDT } from '@/lib/utils';

export default function WishlistPage() {
  const { items, toggle, sync, moveToCart } = useWishlistStore();
  const { addItem } = useCartStore();

  useEffect(() => { sync(); }, [sync]);

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-rose-300" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
        <p className="text-gray-500 mb-8">Save items you love and come back to them anytime.</p>
        <Link href="/products" className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2">
          Discover Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/products" className="text-sm text-gray-500 hover:text-black transition-colors">
          Continue Shopping →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link href={`/products/${item.slug}`} className="block relative aspect-[3/4] bg-gray-50 overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShoppingCart className="w-10 h-10 text-gray-200" />
                  </div>
                )}
              </Link>

              <div className="p-3">
                <Link href={`/products/${item.slug}`} className="block">
                  <h3 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2 hover:underline">{item.name}</h3>
                </Link>
                <p className="font-bold text-gray-900 mt-1.5">{formatBDT(item.price)}</p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => moveToCart(item, addItem)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white text-xs font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                  </button>
                  <button
                    onClick={() => toggle(item)}
                    className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

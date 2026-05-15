'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useCartStore } from '@/store/cart.store';
import { api } from '@/lib/api';
import { formatBDT } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCartStore();
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);

  const sub = subtotal();
  const shippingThreshold = 2000;
  const shipping = sub >= shippingThreshold ? 0 : 80;
  const discountAmount = couponApplied ? couponApplied.discount : 0;
  const total = sub + shipping - discountAmount;

  const couponMutation = useMutation({
    mutationFn: (code: string) =>
      api.post('/marketing/coupons/validate', { code }).then(r => r.data.data),
    onSuccess: (data) => {
      const discount = data?.discountAmount ?? 0;
      setCouponApplied({ code: coupon.trim().toUpperCase(), discount });
      toast.success(`Coupon applied! You save ${formatBDT(discount)}`);
    },
    onError: () => toast.error('Invalid or expired coupon code'),
  });

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <ShoppingBag className="w-20 h-20 text-gray-200 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add some items to get started</p>
        <Link href="/products" className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart <span className="text-gray-400 font-normal text-xl">({items.length} items)</span></h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map(item => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative w-24 h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" /> : <ShoppingBag className="w-8 h-8 text-gray-300 absolute inset-0 m-auto" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 leading-snug truncate">{item.name}</h3>
                  {item.attributes && <p className="text-xs text-gray-400 mt-0.5">{Object.entries(item.attributes).map(([k,v]) => `${k}: ${v}`).join(' · ')}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-full px-1 py-0.5">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <p className="font-bold text-gray-900">{formatBDT(item.price * item.quantity)}</p>
                  </div>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors self-start mt-1"><Trash2 className="w-4 h-4" /></button>
              </motion.div>
            ))}
          </AnimatePresence>

          {sub < shippingThreshold && (
            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              Add {formatBDT(shippingThreshold - sub)} more for <strong>free shipping</strong>!
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 sticky top-24">
            <h2 className="font-bold text-lg">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatBDT(sub)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className={shipping === 0 ? 'text-emerald-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatBDT(shipping)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({couponApplied?.code})</span><span>-{formatBDT(discountAmount)}</span></div>}
              <hr className="border-gray-100" />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatBDT(total)}</span></div>
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
              <button
                onClick={() => { if (coupon.trim()) couponMutation.mutate(coupon.trim().toUpperCase()); }}
                disabled={couponMutation.isPending || !coupon.trim()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >{couponMutation.isPending ? '...' : 'Apply'}</button>
            </div>

            <Link href="/checkout" className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-full font-semibold hover:bg-gray-800 transition-colors">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/products" className="block text-center text-sm text-gray-500 hover:text-black transition-colors">← Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

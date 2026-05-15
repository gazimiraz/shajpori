'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, CreditCard, Smartphone, Banknote, Truck, Tag, ShoppingBag } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cart.store';
import { api } from '@/lib/api';
import { formatBDT } from '@/lib/utils';

const PAYMENT_METHODS = [
  { id: 'CASH_ON_DELIVERY', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when you receive' },
  { id: 'BKASH', label: 'bKash', icon: Smartphone, desc: 'Mobile banking' },
  { id: 'NAGAD', label: 'Nagad', icon: Smartphone, desc: 'Mobile banking' },
  { id: 'CARD', label: 'Card Payment', icon: CreditCard, desc: 'Visa, Mastercard' },
  { id: 'SSL_COMMERZ', label: 'SSLCommerz', icon: CreditCard, desc: 'Secure online payment' },
];

const BD_DISTRICTS = [
  'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh',
  'Comilla', 'Narayanganj', 'Gazipur', 'Narsingdi', 'Munshiganj', 'Manikganj', 'Tangail',
  'Faridpur', 'Jessore', 'Bogura', 'Cox\'s Bazar', 'Noakhali',
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    addressLine1: '', addressLine2: '', city: '', district: 'Dhaka',
    notes: '',
  });
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);

  const sub = subtotal();
  const shipping = sub >= 2000 ? 0 : 80;
  const discountAmount = couponApplied?.discount ?? 0;
  const total = sub + shipping - discountAmount;

  const couponMutation = useMutation({
    mutationFn: (code: string) =>
      api.post('/marketing/coupons/validate', { code }).then(r => r.data.data),
    onSuccess: (data) => {
      const discount = data?.discountAmount ?? 0;
      const code = coupon.trim().toUpperCase();
      setCouponApplied({ code, discount });
      toast.success(`Coupon applied! You save ${formatBDT(discount)}`);
    },
    onError: () => toast.error('Invalid or expired coupon code'),
  });

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (code) couponMutation.mutate(code);
  };

  const orderMutation = useMutation({
    mutationFn: (payload: any) => api.post('/orders', payload),
    onSuccess: (res) => {
      clearCart();
      toast.success('Order placed successfully!');
      router.push(`/account/orders/${res.data.data.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to place order'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    orderMutation.mutate({
      items: items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
      })),
      shippingAddress: {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        district: form.district,
        country: 'Bangladesh',
      },
      paymentMethod,
      couponCode: couponApplied?.code,
      notes: form.notes || undefined,
    });
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
        <h1 className="text-xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6 text-sm">Add some items before checking out.</p>
        <Link href="/products" className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">

            {/* Shipping Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
                <Truck className="w-5 h-5" /> Shipping Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input required value={form.fullName} onChange={f('fullName')} placeholder="Rahim Uddin" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={f('email')} placeholder="you@example.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                  <input required value={form.phone} onChange={f('phone')} placeholder="01XXXXXXXXX" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 1 *</label>
                  <input required value={form.addressLine1} onChange={f('addressLine1')} placeholder="House #, Road #, Area" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 2 (optional)</label>
                  <input value={form.addressLine2} onChange={f('addressLine2')} placeholder="Apartment, floor, landmark" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                  <input required value={form.city} onChange={f('city')} placeholder="Dhaka" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">District *</label>
                  <select required value={form.district} onChange={f('district')} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-white">
                    {BD_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Notes (optional)</label>
                  <input value={form.notes} onChange={f('notes')} placeholder="Any special instructions..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-lg mb-5">Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(pm => (
                  <label key={pm.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === pm.id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" name="payment" value={pm.id} checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} className="sr-only" />
                    <pm.icon className="w-5 h-5 text-gray-600 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{pm.label}</p>
                      <p className="text-xs text-gray-500">{pm.desc}</p>
                    </div>
                    {paymentMethod === pm.id && <CheckCircle className="w-5 h-5 text-black" />}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-lg">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">{item.name}</p>
                      {item.attributes && (
                        <p className="text-gray-400 text-xs">{Object.values(item.attributes).join(' · ')}</p>
                      )}
                      <p className="text-gray-400 text-xs">×{item.quantity}</p>
                    </div>
                    <p className="font-semibold text-xs shrink-0">{formatBDT(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    value={coupon}
                    onChange={e => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    disabled={!!couponApplied}
                    className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                {couponApplied ? (
                  <button type="button" onClick={() => { setCouponApplied(null); setCoupon(''); }} className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Remove
                  </button>
                ) : (
                  <button type="button" onClick={applyCoupon} disabled={couponMutation.isPending || !coupon.trim()} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                    {couponMutation.isPending ? '...' : 'Apply'}
                  </button>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatBDT(sub)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className={shipping === 0 ? 'text-emerald-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatBDT(shipping)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon ({couponApplied?.code})</span>
                    <span>-{formatBDT(discountAmount)}</span>
                  </div>
                )}
                <hr className="border-gray-100" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatBDT(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={orderMutation.isPending}
                className="w-full bg-black text-white py-3.5 rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {orderMutation.isPending
                  ? <span className="flex items-center justify-center gap-2"><Spinner />Placing Order...</span>
                  : `Place Order · ${formatBDT(total)}`
                }
              </button>
              <p className="text-xs text-gray-400 text-center">
                By placing your order you agree to our{' '}
                <Link href="/terms" className="underline hover:text-gray-600">Terms</Link> &{' '}
                <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}


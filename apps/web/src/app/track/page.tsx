'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  PENDING:    { label: 'Order Placed',  color: 'text-amber-600 bg-amber-50',   icon: Clock },
  CONFIRMED:  { label: 'Confirmed',     color: 'text-blue-600 bg-blue-50',     icon: CheckCircle },
  PROCESSING: { label: 'Processing',    color: 'text-blue-600 bg-blue-50',     icon: Package },
  SHIPPED:    { label: 'Shipped',       color: 'text-purple-600 bg-purple-50', icon: Truck },
  DELIVERED:  { label: 'Delivered',     color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  CANCELLED:  { label: 'Cancelled',     color: 'text-red-600 bg-red-50',       icon: XCircle },
};

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['track', submitted],
    queryFn: () => api.get(`/orders/track/${submitted}`).then(r => r.data.data),
    enabled: !!submitted,
    retry: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      setSubmitted(orderNumber.trim().toUpperCase());
    }
  };

  const status = order ? (STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-gray-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
        <p className="text-gray-500 mt-2">Enter your order number to get real-time delivery updates.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value.toUpperCase())}
            placeholder="e.g. ORD-2025-00123"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !orderNumber.trim()}
          className="px-6 py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? <Spinner /> : <><Search className="w-4 h-4" /> Track</>}
        </button>
      </form>

      {isError && submitted && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 text-center">
          Order <strong>{submitted}</strong> not found. Check your order number and try again.
        </div>
      )}

      {order && status && (
        <div className="space-y-4">
          {/* Status card */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Order Number</p>
                <p className="font-bold text-gray-900 mt-0.5">#{order.orderNumber}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${status.color}`}>
                <status.icon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Order Date</p>
                <p className="font-medium text-gray-900 mt-0.5">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Items</p>
                <p className="font-medium text-gray-900 mt-0.5">{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              {order.tracking?.trackingNumber && (
                <>
                  <div>
                    <p className="text-gray-400 text-xs">Courier</p>
                    <p className="font-medium text-gray-900 mt-0.5">{order.tracking.carrier ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Tracking No.</p>
                    <p className="font-medium text-gray-900 mt-0.5">{order.tracking.trackingNumber}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Delivery address */}
          {order.shippingAddress && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 text-sm">
              <p className="font-semibold text-gray-900 mb-2">Delivery Address</p>
              <p className="text-gray-500 leading-relaxed">
                {order.shippingAddress.fullName}<br />
                {order.shippingAddress.addressLine1}<br />
                {order.shippingAddress.city}, {order.shippingAddress.district}<br />
                {order.shippingAddress.phone}
              </p>
            </div>
          )}

          <Link
            href={`/account/orders/${order.id}`}
            className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            View Full Order Details <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {!submitted && (
        <div className="text-center text-sm text-gray-400 mt-8">
          <p>Your order number can be found in your confirmation email</p>
          <p className="mt-1">or in your <Link href="/account/orders" className="text-black hover:underline font-medium">account orders page</Link>.</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Package, Truck, CheckCircle, Clock, XCircle, MapPin, CreditCard, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { formatBDT, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

const STATUS_ORDER = STEPS.map(s => s.key);

const STATUS_BADGE: Record<string, { color: string; icon: typeof CheckCircle }> = {
  PENDING:    { color: 'text-amber-600 bg-amber-50',   icon: Clock },
  CONFIRMED:  { color: 'text-blue-600 bg-blue-50',     icon: CheckCircle },
  PROCESSING: { color: 'text-blue-600 bg-blue-50',     icon: Clock },
  SHIPPED:    { color: 'text-purple-600 bg-purple-50', icon: Truck },
  DELIVERED:  { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  CANCELLED:  { color: 'text-red-600 bg-red-50',       icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const { color, icon: Icon } = STATUS_BADGE[status] ?? { color: 'text-gray-600 bg-gray-50', icon: CheckCircle };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-48" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Order not found</p>
        <Link href="/account/orders" className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
          Back to Orders
        </Link>
      </div>
    );
  }

  const currentStep = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    toast.success('Order number copied');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Link href="/account" className="hover:text-black transition-colors">Account</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/account/orders" className="hover:text-black transition-colors">Orders</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">#{order.orderNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Order #{order.orderNumber}</h1>
            <button onClick={copyOrderNumber} className="text-gray-400 hover:text-black transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h2 className="font-semibold text-sm text-gray-700 mb-6">Order Progress</h2>
          <div className="relative flex items-start justify-between">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 -z-0">
              <div
                className="h-full bg-black transition-all duration-500"
                style={{ width: currentStep >= 0 ? `${(currentStep / (STEPS.length - 1)) * 100}%` : '0%' }}
              />
            </div>
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${done ? 'bg-black border-black' : 'bg-white border-gray-200'}`}>
                    <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-gray-300'}`} />
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight max-w-[60px] hidden sm:block ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          {order.tracking?.trackingNumber && (
            <div className="mt-5 pt-4 border-t border-gray-50 flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-purple-500" />
              <span className="text-gray-500">Tracking:</span>
              <span className="font-semibold">{order.tracking.trackingNumber}</span>
              {order.tracking.carrier && <span className="text-gray-400">via {order.tracking.carrier}</span>}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-semibold text-sm">{order.items?.length ?? 0} Item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(order.items ?? []).map((item: any) => (
            <div key={item.id} className="flex gap-4 p-4">
              <div className="w-16 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                {item.product?.images?.[0]?.url && (
                  <Image src={item.product.images[0].url} alt={item.product?.name ?? ''} width={64} height={80} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product?.slug}`} className="font-semibold text-sm text-gray-900 hover:underline line-clamp-2">
                  {item.product?.name ?? item.name}
                </Link>
                {item.variant && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Object.entries(item.variant.attributes ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="font-bold text-sm text-gray-900 whitespace-nowrap">{formatBDT(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Shipping address */}
        {order.shippingAddress && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-sm">Delivery Address</h2>
            </div>
            <p className="text-sm font-medium text-gray-900">{order.shippingAddress.fullName}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              {order.shippingAddress.addressLine1}<br />
              {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
              {order.shippingAddress.city}, {order.shippingAddress.district}<br />
              {order.shippingAddress.phone}
            </p>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-sm">Payment Summary</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{formatBDT(order.subtotal ?? order.total)}</span>
            </div>
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span><span>{formatBDT(order.shippingCost)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span><span>-{formatBDT(order.discount)}</span>
              </div>
            )}
            <hr className="border-gray-100" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span><span>{formatBDT(order.total)}</span>
            </div>
            <p className="text-xs text-gray-400 pt-1">
              Paid via {(order.paymentMethod ?? 'COD').replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Link href="/account/orders" className="flex-1 text-center py-3 border border-gray-200 rounded-full text-sm font-medium hover:border-gray-400 transition-colors">
          ← All Orders
        </Link>
        <Link href="/products" className="flex-1 text-center py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
          Shop Again
        </Link>
      </div>
    </div>
  );
}

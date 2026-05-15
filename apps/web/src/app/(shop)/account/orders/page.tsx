'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Package, ChevronRight, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatBDT, formatDate } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  PENDING: { label: 'Pending', color: 'text-amber-600 bg-amber-50', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  PROCESSING: { label: 'Processing', color: 'text-blue-600 bg-blue-50', icon: Clock },
  SHIPPED: { label: 'Shipped', color: 'text-purple-600 bg-purple-50', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => api.get(`/orders/my?page=${page}&limit=10`).then(r => r.data.data),
  });

  const orders = data?.items ?? data ?? [];
  const meta = data?.meta;

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      {Array.from({length:5}).map((_,i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account" className="text-gray-400 hover:text-black transition-colors text-sm">Account</Link>
        <ChevronRight className="w-4 h-4 text-gray-300" />
        <h1 className="text-xl font-bold">Order History</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No orders yet</p>
          <Link href="/products" className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING'];
            const Icon = cfg.icon;
            return (
              <Link key={order.id} href={`/account/orders/${order.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)} · {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {(order.items ?? []).slice(0,4).map((item: any, i: number) => (
                      <div key={i} className="w-10 h-10 rounded-lg border-2 border-white bg-gray-100 overflow-hidden">
                        {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                      </div>
                    ))}
                    {(order.items?.length ?? 0) > 4 && <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">+{order.items.length - 4}</div>}
                  </div>
                  <p className="font-bold text-gray-900">{formatBDT(order.total)}</p>
                </div>
              </Link>
            );
          })}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({length: meta.totalPages}).map((_,i) => (
                <button key={i} onClick={() => setPage(i+1)} className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${page === i+1 ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i+1}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

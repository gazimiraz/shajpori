'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { User, Package, Heart, MapPin, LogOut, Star, Gift, Plus, Trash2, ShoppingCart, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatBDT } from '@/lib/utils';
import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'loyalty', label: 'Rewards', icon: Gift },
] as const;

type AddrKey = 'fullName' | 'phone' | 'addressLine1' | 'addressLine2' | 'city' | 'district';
const ADDR_FIELDS: [AddrKey, string, string?][] = [
  ['fullName', 'Full Name'],
  ['phone', 'Phone Number'],
  ['addressLine1', 'Address Line 1', 'sm:col-span-2'],
  ['addressLine2', 'Address Line 2 (optional)'],
  ['city', 'City'],
  ['district', 'District'],
];

interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  isDefault: boolean;
}

export default function AccountPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [addrForm, setAddrForm] = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', district: '' });
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { items: wishlistItems, sync: syncWishlist, moveToCart, toggle: wishlistToggle } = useWishlistStore();
  const { addItem } = useCartStore();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (me) setForm({ firstName: me.firstName ?? '', lastName: me.lastName ?? '', phone: me.phone ?? '' });
  }, [me]);

  useEffect(() => { syncWishlist(); }, [syncWishlist]);

  const { data: addresses, isLoading: addrsLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => api.get('/users/me/addresses').then(r => r.data.data ?? []),
    enabled: tab === 'addresses',
  });

  const addAddressMutation = useMutation({
    mutationFn: (d: typeof addrForm) => api.post('/users/me/addresses', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      setShowAddrForm(false);
      setAddrForm({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', district: '' });
      toast.success('Address saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save address'),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      setDeletingId(null);
      toast.success('Address removed');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: any) => api.patch('/users/me', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Profile updated'); },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-1">
          <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white rounded-2xl p-5 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold mb-3">
              {me?.firstName?.[0]}{me?.lastName?.[0]}
            </div>
            <p className="font-semibold">{me?.firstName} {me?.lastName}</p>
            <p className="text-xs text-gray-300 mt-0.5">{me?.email}</p>
            {me?.loyaltyPoints > 0 && <p className="text-xs mt-2 bg-white/10 px-2 py-0.5 rounded-full inline-block">{me.loyaltyPoints} reward points</p>}
          </div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
          <button
            onClick={() => { localStorage.removeItem('web_token'); window.location.href = '/'; }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {tab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-lg mb-5">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[['firstName','First Name'],['lastName','Last Name'],['phone','Phone Number']].map(([key,label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input value={me?.email ?? ''} disabled className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                </div>
              </div>
              <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="mt-5 px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'orders' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="font-bold text-lg">Order History</h2>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="p-6 text-center text-gray-400 text-sm">
                  <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <Link href="/account/orders" className="text-black font-medium hover:underline">View all orders →</Link>
                </div>
              </div>
            </div>
          )}

          {tab === 'wishlist' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-lg">Saved Items</h2>
                <Link href="/wishlist" className="text-sm text-gray-500 hover:text-black transition-colors">View all →</Link>
              </div>
              {wishlistItems.length === 0 ? (
                <div className="p-10 text-center">
                  <Heart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-4">No saved items yet</p>
                  <Link href="/products" className="text-sm font-medium bg-black text-white px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors">Browse Products</Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-5">
                  {wishlistItems.slice(0, 6).map(item => (
                    <div key={item.productId} className="group relative rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      <Link href={`/products/${item.slug}`} className="block relative aspect-[3/4] bg-gray-50">
                        {item.image
                          ? <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="150px" />
                          : <ShoppingCart className="w-8 h-8 text-gray-200 absolute inset-0 m-auto" />
                        }
                      </Link>
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-gray-900 line-clamp-1">{item.name}</p>
                        <p className="text-xs font-bold mt-0.5">{formatBDT(item.price)}</p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => moveToCart(item, addItem)}
                            className="flex-1 text-xs py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                          >Add to Cart</button>
                          <button onClick={() => wishlistToggle(item)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'addresses' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-lg">Saved Addresses</h2>
                <button onClick={() => setShowAddrForm(s => !s)} className="flex items-center gap-1.5 text-sm font-medium bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
                  <Plus className="w-3.5 h-3.5" />{showAddrForm ? 'Cancel' : 'Add New'}
                </button>
              </div>

              {showAddrForm && (
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-sm mb-4">New Address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ADDR_FIELDS.map(([key, label, colSpan]) => (
                      <div key={key} className={colSpan ?? ''}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                        <input
                          value={addrForm[key]}
                          onChange={e => setAddrForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addAddressMutation.mutate(addrForm)}
                    disabled={addAddressMutation.isPending || !addrForm.fullName || !addrForm.addressLine1 || !addrForm.city}
                    className="mt-4 px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {addAddressMutation.isPending ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {addrsLoading ? (
                  <div className="p-6 space-y-3">{Array.from({length:2}).map((_,i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                ) : !addresses || addresses.length === 0 ? (
                  <div className="p-10 text-center">
                    <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No addresses saved yet</p>
                  </div>
                ) : (
                  addresses.map((addr: Address) => (
                    <div key={addr.id} className="p-5 flex items-start gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${addr.isDefault ? 'bg-black' : 'bg-gray-100'}`}>
                        <Home className={`w-4 h-4 ${addr.isDefault ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{addr.fullName}</p>
                          {addr.isDefault && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Default</span>}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                          {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}, {addr.district}
                        </p>
                        <p className="text-sm text-gray-500">{addr.phone}</p>
                      </div>
                      <button
                        onClick={() => { setDeletingId(addr.id); deleteAddressMutation.mutate(addr.id); }}
                        disabled={deletingId === addr.id}
                        className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'loyalty' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-lg mb-2">Reward Points</h2>
              <p className="text-gray-500 text-sm mb-6">Earn points with every purchase and redeem for discounts.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl p-5">
                  <p className="text-sm font-medium opacity-80">Available Points</p>
                  <p className="text-4xl font-black mt-1">{me?.loyaltyPoints ?? 0}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-5">
                  <p className="text-sm font-medium text-gray-500">Worth</p>
                  <p className="text-2xl font-bold mt-1">{formatBDT((me?.loyaltyPoints ?? 0) * 0.5)}</p>
                  <p className="text-xs text-gray-400 mt-1">1 pt = ৳0.50</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                <Star className="w-4 h-4 inline mr-1.5" />Earn 1 point per ৳10 spent. Minimum 100 points to redeem.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

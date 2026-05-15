import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { CartItem } from './cart.store';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
}

interface WishlistStore {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  has: (productId: string) => boolean;
  sync: () => Promise<void>;
  moveToCart: (item: WishlistItem, addItem: (cartItem: CartItem) => void) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (item) => {
        const exists = get().has(item.productId);
        if (exists) {
          set(s => ({ items: s.items.filter(i => i.productId !== item.productId) }));
          api.delete(`/users/me/wishlist/${item.productId}`).catch(() => {});
        } else {
          set(s => ({ items: [...s.items, item] }));
          api.post('/users/me/wishlist', { productId: item.productId }).catch(() => {});
          toast.success('Added to wishlist');
        }
      },

      has: (productId) => get().items.some(i => i.productId === productId),

      sync: async () => {
        try {
          const { data } = await api.get('/users/me/wishlist');
          set({ items: (data.data ?? []).map((w: any) => ({
            id: w.id,
            productId: w.productId,
            name: w.product?.name ?? '',
            slug: w.product?.slug ?? '',
            image: w.product?.images?.[0]?.url,
            price: w.product?.price ?? 0,
          })) });
        } catch {}
      },

      moveToCart: (item, addItem) => {
        addItem({
          id: item.productId,
          productId: item.productId,
          name: item.name,
          slug: item.slug,
          image: item.image,
          price: item.price,
          quantity: 1,
          sku: item.productId.slice(0, 8).toUpperCase(),
        });
        get().toggle(item);
        toast.success('Moved to cart');
      },
    }),
    { name: 'shaj-wishlist' }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  quantity: number;
  sku: string;
  attributes?: Record<string, string>;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => set(s => {
        const key = item.variantId || item.productId;
        const existing = s.items.find(i => (i.variantId || i.productId) === key);
        if (existing) {
          return { items: s.items.map(i => (i.variantId || i.productId) === key ? { ...i, quantity: i.quantity + item.quantity } : i) };
        }
        return { items: [...s.items, item] };
      }),

      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      updateQuantity: (id, qty) => set(s => ({
        items: qty <= 0 ? s.items.filter(i => i.id !== id) : s.items.map(i => i.id === id ? { ...i, quantity: qty } : i),
      })),

      clearCart: () => set({ items: [] }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'shaj-cart' }
  )
);

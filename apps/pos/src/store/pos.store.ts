import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { POSCartItem } from '@shaj/types';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints?: number;
}

interface POSState {
  items: POSCartItem[];
  discount: number;
  customer: Customer | null;
  shiftId: string | null;
  storeId: string | null;

  addItem: (item: POSCartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  clearCart: () => void;
  setDiscount: (amount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setShiftId: (id: string) => void;
  setStoreId: (id: string) => void;

  subtotal: number;
  taxAmount: number;
  total: number;
}

const TAX_RATE = 0.15;

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      customer: null,
      shiftId: null,
      storeId: null,

      get subtotal() {
        return get().items.reduce((sum, i) => sum + i.total, 0);
      },
      get taxAmount() {
        const subtotalAfterDiscount = get().subtotal - get().discount;
        return Math.max(0, subtotalAfterDiscount * TAX_RATE);
      },
      get total() {
        const subtotalAfterDiscount = get().subtotal - get().discount;
        return Math.max(0, subtotalAfterDiscount + get().taxAmount);
      },

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === newItem.productId && i.variantId === newItem.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId && i.variantId === newItem.variantId
                  ? { ...i, quantity: i.quantity + 1, total: i.price * (i.quantity + 1) }
                  : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        }));
      },

      updateQuantity: (productId, variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: qty, total: i.price * qty - i.discount }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [], discount: 0, customer: null }),
      setDiscount: (amount) => set({ discount: Math.max(0, amount) }),
      setCustomer: (customer) => set({ customer }),
      setShiftId: (id) => set({ shiftId: id }),
      setStoreId: (id) => set({ storeId: id }),
    }),
    {
      name: 'shaj-pos-cart',
      partialize: (state) => ({ shiftId: state.shiftId, storeId: state.storeId }),
    },
  ),
);

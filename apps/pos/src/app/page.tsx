'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Barcode, CreditCard, Receipt,
  Plus, Minus, Trash2, User, Calculator, Printer,
  ChevronDown, X, CheckCircle, AlertCircle, Loader2,
  Package, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatBDT } from '@shaj/utils';
import { usePOSStore } from '@/store/pos.store';
import { PaymentModal } from '@/components/pos/payment-modal';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { CustomerSearch } from '@/components/pos/customer-search';
import { NumPad } from '@/components/pos/numpad';
import type { POSCartItem } from '@shaj/types';

export default function POSPage() {
  const {
    items, addItem, removeItem, updateQuantity, clearCart,
    discount, setDiscount, customer, setCustomer,
    subtotal, total, taxAmount,
    shiftId, setShiftId
  } = usePOSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Product search
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['pos-search', searchQuery],
    queryFn: () => api.get(`/pos/search?q=${searchQuery}`).then(r => r.data.data),
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  // Barcode scan
  const handleBarcodeScan = useCallback(async (code: string) => {
    if (!code.trim()) return;
    try {
      const { data } = await api.get(`/pos/barcode/${code.trim()}`);
      const product = data.data;
      if (product) {
        addItem({
          productId: product.id,
          variantId: product.variantId,
          name: product.name,
          sku: product.sku,
          barcode: code.trim(),
          imageUrl: product.imageUrl,
          price: product.price,
          quantity: 1,
          discount: 0,
          total: product.price,
        });
        toast.success(`Added: ${product.name}`);
      } else {
        toast.error('Product not found');
      }
    } catch {
      toast.error('Product not found');
    }
    setBarcodeInput('');
  }, [addItem]);

  // Auto-focus barcode input on keypress
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' && barcodeRef.current) {
        barcodeRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Process transaction
  const processTransaction = useMutation({
    mutationFn: (paymentData: any) => api.post('/pos/transactions', {
      shiftId,
      items: items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        price: i.price,
        discountAmount: i.discount,
        totalAmount: i.total,
      })),
      payments: paymentData.payments,
      subtotal,
      discountAmount: discount,
      taxAmount,
      totalAmount: total,
      paidAmount: paymentData.paidAmount,
      changeAmount: paymentData.changeAmount,
      customerId: customer?.id,
      customerName: customer?.name,
    }),
    onSuccess: (res) => {
      setLastTransaction(res.data.data);
      clearCart();
      setShowPayment(false);
      setShowReceipt(true);
      toast.success('Transaction completed!');
    },
    onError: () => toast.error('Transaction failed'),
  });

  const cartItemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 bg-gray-900 text-white flex items-center px-4 gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-sm">Shaj POS</span>
        </div>
        <div className="h-4 w-px bg-gray-600" />
        <span className="text-xs text-gray-400">Shift: {shiftId ? 'OPEN' : 'NO SHIFT'}</span>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Product Search & Grid */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={barcodeRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBarcodeScan(barcodeInput);
                }}
                placeholder="Scan barcode... [F2]"
                className="w-48 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Product Results */}
          <div className="flex-1 overflow-y-auto p-3">
            {searchQuery.length >= 2 ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {isSearching ? 'Searching...' : `${searchResults?.length ?? 0} results`}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(searchResults ?? []).map((product: any) => (
                    <motion.button
                      key={product.id}
                      onClick={() => addItem({
                        productId: product.id,
                        variantId: product.defaultVariantId,
                        name: product.name,
                        sku: product.sku,
                        barcode: product.barcode,
                        imageUrl: product.imageUrl,
                        price: product.price,
                        quantity: 1,
                        discount: 0,
                        total: product.price,
                      })}
                      whileTap={{ scale: 0.97 }}
                      className="bg-white border border-gray-200 rounded-lg p-2 text-left hover:border-blue-400 hover:shadow-sm transition-all"
                    >
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.name}
                          className="w-full aspect-square object-cover rounded-md mb-2" />
                      )}
                      <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sku}</p>
                      <p className="text-sm font-bold text-blue-600 mt-1">{formatBDT(product.price)}</p>
                      <p className="text-xs text-gray-400">Stock: {product.stockQuantity}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Search products or scan barcode</p>
                <p className="text-xs mt-1">Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-96 flex flex-col bg-gray-50">
          {/* Cart Header */}
          <div className="p-3 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm">Cart ({cartItemCount})</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowCustomer(!showCustomer)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded"
                >
                  <User className="w-3 h-3" />
                  {customer ? customer.name : 'Walk-in'}
                </button>
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {items.map((item, index) => (
                    <motion.div
                      key={`${item.productId}-${item.variantId}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-lg p-2.5 border border-gray-100"
                    >
                      <div className="flex items-start gap-2">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.name}
                            className="w-10 h-10 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                                className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                                className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">{formatBDT(item.total)}</span>
                              <button
                                onClick={() => removeItem(item.productId, item.variantId)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200 bg-white p-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatBDT(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span>
                <span>-{formatBDT(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (15%)</span>
              <span>{formatBDT(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-1 border-t">
              <span>Total</span>
              <span className="text-blue-600">{formatBDT(total)}</span>
            </div>

            {/* Discount Input */}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder="Discount (৳)"
                className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => setDiscount(0)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowPayment(true)}
              disabled={items.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Charge {formatBDT(total)}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPayment && (
        <PaymentModal
          total={total}
          onClose={() => setShowPayment(false)}
          onProcess={(paymentData) => processTransaction.mutate(paymentData)}
          isProcessing={processTransaction.isPending}
        />
      )}
      {showReceipt && lastTransaction && (
        <ReceiptModal
          transaction={lastTransaction}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}

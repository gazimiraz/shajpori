'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Banknote, Smartphone, X, CheckCircle, Loader2 } from 'lucide-react';
import { formatBDT } from '@shaj/utils';

interface Payment {
  method: string;
  amount: number;
}

interface Props {
  total: number;
  onClose: () => void;
  onProcess: (data: { payments: Payment[]; paidAmount: number; changeAmount: number }) => void;
  isProcessing: boolean;
}

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: Banknote, color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'CARD_CREDIT', label: 'Card', icon: CreditCard, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'BKASH', label: 'bKash', icon: Smartphone, color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { id: 'NAGAD', label: 'Nagad', icon: Smartphone, color: 'bg-orange-50 border-orange-200 text-orange-700' },
];

export function PaymentModal({ total, onClose, onProcess, isProcessing }: Props) {
  const [selectedMethod, setSelectedMethod] = useState('CASH');
  const [cashReceived, setCashReceived] = useState(total);
  const [payments, setPayments] = useState<Payment[]>([{ method: 'CASH', amount: total }]);
  const [isSplit, setIsSplit] = useState(false);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const change = Math.max(0, totalPaid - total);
  const remaining = Math.max(0, total - totalPaid);

  const quickAmounts = [
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
  ].filter((a, i, arr) => arr.indexOf(a) === i && a >= total);

  const handleProcess = () => {
    if (totalPaid < total) return;
    onProcess({ payments, paidAmount: totalPaid, changeAmount: change });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Payment</h2>
            <p className="text-sm text-gray-500">Total: {formatBDT(total)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Payment Methods */}
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMethod(m.id);
                  setPayments([{ method: m.id, amount: total }]);
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                  selectedMethod === m.id && !isSplit
                    ? m.color + ' border-current'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <m.icon className="w-5 h-5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Cash Input */}
          {selectedMethod === 'CASH' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Cash Received</label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCashReceived(val);
                  setPayments([{ method: 'CASH', amount: val }]);
                }}
                className="w-full text-2xl font-bold text-center border-2 border-gray-200 rounded-lg py-3 focus:outline-none focus:border-blue-500"
              />
              {/* Quick amounts */}
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.slice(0, 4).map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setCashReceived(amt);
                      setPayments([{ method: 'CASH', amount: amt }]);
                    }}
                    className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                  >
                    {formatBDT(amt)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Change Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Amount Paid</p>
              <p className="text-lg font-bold text-gray-800">{formatBDT(totalPaid)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${change > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 mb-0.5">Change Due</p>
              <p className={`text-lg font-bold ${change > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                {formatBDT(change)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={isProcessing || totalPaid < total}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Complete Sale</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

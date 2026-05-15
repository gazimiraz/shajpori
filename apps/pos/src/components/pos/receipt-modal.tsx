'use client';

import { useRef } from 'react';
import { Printer, X, Download } from 'lucide-react';
import { formatBDT, formatDateTime } from '@shaj/utils';

interface Props {
  transaction: any;
  onClose: () => void;
}

export function ReceiptModal({ transaction, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${transaction.receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .separator { border-top: 1px dashed #000; margin: 6px 0; }
            .flex { display: flex; justify-content: space-between; }
            .total { font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Receipt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <div ref={receiptRef} className="font-mono text-xs space-y-1">
            <div className="text-center">
              <p className="font-bold text-sm">SHAJ FASHION</p>
              <p>Dhaka, Bangladesh</p>
              <p>Tel: +880 1700-000000</p>
              <p className="my-1 border-t border-dashed pt-1">RECEIPT</p>
            </div>

            <div className="flex justify-between">
              <span>Receipt #</span>
              <span className="font-bold">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{formatDateTime(transaction.createdAt)}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{transaction.customerName}</span>
              </div>
            )}

            <div className="border-t border-dashed my-1 pt-1">
              {transaction.items?.map((item: any, i: number) => (
                <div key={i}>
                  <p className="font-medium">{item.name}</p>
                  <div className="flex justify-between text-gray-600">
                    <span>{item.quantity} x {formatBDT(item.price)}</span>
                    <span>{formatBDT(item.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed pt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatBDT(transaction.subtotal)}</span>
              </div>
              {transaction.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-{formatBDT(transaction.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT (15%)</span>
                <span>{formatBDT(transaction.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-dashed pt-1">
                <span>TOTAL</span>
                <span>{formatBDT(transaction.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>{formatBDT(transaction.paidAmount)}</span>
              </div>
              {transaction.changeAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Change</span>
                  <span>{formatBDT(transaction.changeAmount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed pt-1 text-center text-gray-500">
              <p>Thank you for shopping!</p>
              <p>Visit us again at shaj.com</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

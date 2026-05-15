import Link from 'next/link';
import { RefreshCw, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Returns & Exchanges — Shaj' };

const ELIGIBLE = [
  'Unworn, unwashed items with all original tags attached',
  'Items in their original packaging',
  'Items reported within 7 days of delivery',
  'Defective or incorrect items (any time)',
];

const NOT_ELIGIBLE = [
  'Items without original tags or packaging',
  'Worn, washed, or altered items',
  'Innerwear, swimwear, and personal care products',
  'Sale items marked "Final Sale"',
  'Customized or personalized products',
  'Items damaged due to misuse',
];

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-black transition-colors">← Back to Home</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Returns & Exchanges</h1>
        <p className="text-gray-500 text-sm mt-2">Not happy with your purchase? We&apos;ll make it right.</p>
      </div>

      <div className="bg-black text-white rounded-2xl p-6 mb-10">
        <div className="flex items-center gap-3 mb-2">
          <RefreshCw className="w-5 h-5" />
          <h2 className="font-bold text-lg">7-Day Return Policy</h2>
        </div>
        <p className="text-white/70 text-sm">
          Return any eligible item within 7 days of delivery for a full refund or exchange — no questions asked.
        </p>
      </div>

      <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">How to Return</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Initiate your return', desc: 'Go to your account orders page, find the order, and click "Return Item". Alternatively, email us at returns@shaj.com.bd with your order number.' },
              { step: '2', title: 'Pack your item', desc: 'Pack the item securely in its original packaging with all tags attached. Include a note with your order number inside the package.' },
              { step: '3', title: 'Schedule pickup', desc: 'We\'ll arrange a free pickup from your address within 1–2 business days of approving your return request.' },
              { step: '4', title: 'Receive your refund', desc: 'Once we receive and inspect the item, your refund will be processed within 5–7 business days to your original payment method.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <section className="bg-emerald-50 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Eligible for Return
            </h3>
            <ul className="space-y-2">
              {ELIGIBLE.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-red-50 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <XCircle className="w-4 h-4 text-red-400" /> Not Eligible
            </h3>
            <ul className="space-y-2">
              {NOT_ELIGIBLE.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Exchanges</h2>
          <p>
            Want a different size or color? We offer free exchanges within 7 days of delivery.
            Start an exchange request from your account orders page and select the item and variant you&apos;d like instead.
            Exchange items will be dispatched once we receive your original item.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Refund Methods</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Bkash / Nagad / Rocket</span>
              <span>3–5 business days</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Credit / Debit Card</span>
              <span>5–7 business days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cash on Delivery orders</span>
              <span>Bkash transfer within 3 days</span>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <Link
            href="/account/orders"
            className="flex-1 text-center py-3 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors inline-flex items-center justify-center gap-2"
          >
            Start a Return <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/contact"
            className="flex-1 text-center py-3 border border-gray-200 rounded-full text-sm font-medium hover:border-gray-400 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

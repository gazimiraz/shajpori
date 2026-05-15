import Link from 'next/link';
import { Truck, Clock, MapPin, Package } from 'lucide-react';

export const metadata = { title: 'Shipping & Delivery — Shaj' };

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-black transition-colors">← Back to Home</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Shipping & Delivery</h1>
        <p className="text-gray-500 text-sm mt-2">Everything you need to know about how we deliver to you.</p>
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Truck,   label: 'Free Shipping', sub: 'Orders over ৳2,000' },
          { icon: Clock,   label: '3–7 Days',       sub: 'Standard delivery' },
          { icon: MapPin,  label: 'Nationwide',     sub: 'All 64 districts' },
          { icon: Package, label: 'Express',         sub: '1–2 days available' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon className="w-5 h-5 text-gray-700" />
            </div>
            <p className="font-semibold text-sm text-gray-900">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Shipping Rates</h2>
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Order Value</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Dhaka City</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Outside Dhaka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="bg-white">
                  <td className="px-4 py-3 text-gray-600">Under ৳2,000</td>
                  <td className="px-4 py-3">৳60</td>
                  <td className="px-4 py-3">৳120</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-600">৳2,000 and above</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">FREE</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">FREE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Delivery Timeframes</h2>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-gray-100 pb-3">
              <span className="font-medium text-gray-800">Dhaka City</span>
              <span className="text-gray-500">1–3 business days</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-3">
              <span className="font-medium text-gray-800">Chittagong, Sylhet, Rajshahi</span>
              <span className="text-gray-500">3–5 business days</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-800">All other districts</span>
              <span className="text-gray-500">5–7 business days</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Business days exclude Fridays, public holidays, and national strike days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Express Delivery</h2>
          <p>
            Express delivery (1–2 business days) is available in Dhaka city for an additional charge of ৳150.
            Select &ldquo;Express Shipping&rdquo; at checkout. Express orders placed before 12 PM are dispatched the same day.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Order Tracking</h2>
          <p>
            Once your order is shipped, you'll receive an SMS and email with your tracking number and courier details.
            You can also track your order anytime from your{' '}
            <Link href="/account/orders" className="text-black underline hover:no-underline">account orders page</Link>{' '}
            or our <Link href="/track" className="text-black underline hover:no-underline">order tracking page</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Delivery Partners</h2>
          <p>
            We use Pathao, Steadfast, and Sundarban Courier for reliable nationwide delivery.
            The courier is assigned based on your location to ensure the fastest delivery time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Failed Delivery</h2>
          <p>
            If no one is available to receive your package, the courier will attempt delivery up to 2 more times.
            After 3 failed attempts, the package is returned to our warehouse and you'll be contacted to arrange
            re-delivery (additional shipping charges may apply).
          </p>
        </section>

        <div className="bg-gray-50 rounded-2xl p-5 text-sm">
          <p className="font-semibold text-gray-900 mb-1">Still have questions?</p>
          <p className="text-gray-500">
            Contact our support team at{' '}
            <a href="mailto:support@shaj.com.bd" className="text-black underline hover:no-underline">support@shaj.com.bd</a>
            {' '}or visit our <Link href="/contact" className="text-black underline hover:no-underline">Contact page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export const metadata = { title: 'Terms of Service — Shaj' };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-black transition-colors">← Back to Home</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Terms of Service</h1>
        <p className="text-gray-500 text-sm mt-2">Last updated: January 2025</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Shaj website and services, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Account Registration</h2>
          <p>
            To place orders, you must create an account with accurate and complete information. You are responsible
            for maintaining the confidentiality of your account credentials and for all activities that occur under
            your account. Notify us immediately of any unauthorized use at support@shaj.com.bd.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Orders and Payments</h2>
          <p>
            All prices are listed in Bangladeshi Taka (৳). By placing an order, you represent that you are
            authorized to use the selected payment method. We reserve the right to cancel or refuse any order
            at our discretion. Payment is processed securely through our payment partners.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Shipping and Delivery</h2>
          <p>
            We ship within Bangladesh. Estimated delivery times are 3–7 business days for standard shipping and
            1–2 business days for express shipping. Free shipping is available on orders over ৳2,000. We are not
            responsible for delays caused by factors outside our control.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. Returns and Exchanges</h2>
          <p>
            Items may be returned or exchanged within 7 days of delivery, provided they are unused, unwashed, and
            in their original packaging with all tags attached. Sale items, innerwear, and customized products are
            not eligible for return. Contact our support team to initiate a return.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. Intellectual Property</h2>
          <p>
            All content on this website — including text, images, logos, and design — is the property of Shaj
            and is protected by applicable intellectual property laws. You may not reproduce, distribute, or
            create derivative works without our express written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Shaj shall not be liable for any indirect, incidental,
            special, or consequential damages arising from your use of our services. Our total liability shall
            not exceed the amount you paid for the specific order giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">8. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of our services after changes constitutes
            acceptance of the updated terms. We will notify registered customers of material changes via email.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">9. Contact</h2>
          <p>
            For questions about these terms, contact us at{' '}
            <a href="mailto:support@shaj.com.bd" className="text-black underline hover:no-underline">
              support@shaj.com.bd
            </a>{' '}
            or visit our{' '}
            <Link href="/contact" className="text-black underline hover:no-underline">Contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}

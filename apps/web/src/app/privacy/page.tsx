import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — Shaj' };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-black transition-colors">← Back to Home</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mt-2">Last updated: January 2025</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Account details: name, email address, phone number</li>
            <li>Order information: shipping address, purchase history</li>
            <li>Payment data: processed securely by our payment providers — we do not store full card details</li>
            <li>Communications: messages you send to our support team</li>
          </ul>
          <p className="mt-3">
            We also collect usage data automatically, including IP address, browser type, pages visited,
            and device information to improve our services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Process and fulfill your orders</li>
            <li>Send order confirmations, shipping updates, and receipts</li>
            <li>Respond to your inquiries and provide customer support</li>
            <li>Send promotional emails and offers (you can opt out at any time)</li>
            <li>Improve our website, products, and services</li>
            <li>Prevent fraud and ensure security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. Sharing Your Information</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share your
            information with:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Delivery partners (e.g., Pathao, Steadfast) to fulfill your orders</li>
            <li>Payment processors to handle transactions securely</li>
            <li>Service providers who assist in operating our website</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience, remember your preferences,
            and analyze how our website is used. You can control cookie settings through your browser,
            though disabling cookies may affect site functionality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. Data Security</h2>
          <p>
            We implement industry-standard security measures including SSL encryption, secure password hashing,
            and access controls to protect your personal information. However, no method of transmission over
            the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Access and update your personal information via your account settings</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt out of marketing communications at any time</li>
            <li>Request a copy of the data we hold about you</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@shaj.com.bd" className="text-black underline hover:no-underline">
              privacy@shaj.com.bd
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to provide
            services. Order records are retained for 7 years for accounting and legal compliance purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes via
            email or a prominent notice on our website. Continued use of our services constitutes acceptance
            of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">9. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us at{' '}
            <a href="mailto:privacy@shaj.com.bd" className="text-black underline hover:no-underline">
              privacy@shaj.com.bd
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

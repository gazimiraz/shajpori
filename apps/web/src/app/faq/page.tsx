'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
  {
    category: 'Orders',
    items: [
      { q: 'How do I track my order?', a: 'Once your order is shipped, you\'ll receive an SMS and email with a tracking number. You can also visit your account orders page or our order tracking page to check the status in real time.' },
      { q: 'Can I modify or cancel my order?', a: 'Orders can be modified or cancelled within 2 hours of placement. After that, the order enters processing and cannot be changed. Contact our support team immediately if you need to make changes.' },
      { q: 'What payment methods do you accept?', a: 'We accept Bkash, Nagad, Rocket, all major credit and debit cards (Visa, Mastercard), and Cash on Delivery (COD) for eligible areas.' },
      { q: 'Is Cash on Delivery available?', a: 'Yes, COD is available for orders up to ৳5,000 in most areas of Bangladesh. COD is not available for orders above ৳5,000 or for certain remote areas.' },
    ],
  },
  {
    category: 'Shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Dhaka city: 1–3 business days. Major cities: 3–5 business days. All other areas: 5–7 business days. Express delivery (1–2 days) is available for Dhaka city.' },
      { q: 'Is shipping free?', a: 'Yes! Shipping is free on all orders over ৳2,000. For orders under ৳2,000, standard shipping is ৳60 within Dhaka and ৳120 outside Dhaka.' },
      { q: 'Do you ship outside Bangladesh?', a: 'Currently we only ship within Bangladesh. International shipping is on our roadmap for 2026.' },
    ],
  },
  {
    category: 'Returns & Exchanges',
    items: [
      { q: 'What is your return policy?', a: 'We accept returns within 7 days of delivery for eligible items. Items must be unworn, unwashed, and in original packaging with all tags attached.' },
      { q: 'How do I exchange a size?', a: 'Go to your account orders page, find the order, and click "Exchange". Select the new size or variant you want. We\'ll arrange a free pickup and send your replacement once we receive the original.' },
      { q: 'How long does a refund take?', a: 'Once we receive and inspect the returned item, refunds are processed within 5–7 business days. Mobile banking (Bkash/Nagad) refunds are typically faster at 3–5 business days.' },
    ],
  },
  {
    category: 'Products & Sizing',
    items: [
      { q: 'How do I find the right size?', a: 'Each product page includes a detailed size guide. Measurements are in centimeters. We recommend measuring yourself and comparing with the size chart rather than going by your usual label size, as sizing varies between brands.' },
      { q: 'Are products authentic?', a: 'Yes, all products sold on Shaj are 100% authentic. We source directly from manufacturers and authorized distributors. We have a zero-tolerance policy for counterfeit goods.' },
      { q: 'What if I receive a defective item?', a: 'If you receive a defective or incorrect item, contact us within 48 hours with photos. We\'ll arrange an immediate replacement or full refund at no cost to you, regardless of our standard return window.' },
    ],
  },
  {
    category: 'Account',
    items: [
      { q: 'How do I earn loyalty points?', a: 'You earn 1 point for every ৳10 spent on eligible purchases. Points can be redeemed for discounts on future orders. Check your points balance in the Rewards tab of your account.' },
      { q: 'I forgot my password. What do I do?', a: 'Click "Forgot password?" on the login page. Enter your email address and we\'ll send you a secure reset link. The link expires after 30 minutes.' },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-500 pb-4 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-gray-500 mt-2">Can&apos;t find what you&apos;re looking for? <Link href="/contact" className="text-black font-semibold hover:underline">Contact us</Link>.</p>
      </div>

      <div className="space-y-8">
        {FAQS.map(({ category, items }) => (
          <div key={category}>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{category}</h2>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5">
              {items.map(item => <FAQItem key={item.q} {...item} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 rounded-2xl p-6 text-center">
        <h3 className="font-bold text-gray-900 mb-2">Still need help?</h3>
        <p className="text-sm text-gray-500 mb-4">Our support team is available Sunday–Thursday, 9 AM–6 PM.</p>
        <Link href="/contact" className="inline-block bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors">
          Get in Touch
        </Link>
      </div>
    </div>
  );
}

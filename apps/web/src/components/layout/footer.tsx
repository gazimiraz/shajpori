'use client';

import Link from 'next/link';
import { Instagram, Facebook, Twitter, Youtube, Send } from 'lucide-react';

const IMPORTANT_LINKS = [
  { label: "Blog",                href: "/blog" },
  { label: "About Us",            href: "/about" },
  { label: "Contact Us",          href: "/contact" },
  { label: "Terms & Conditions",  href: "/terms" },
  { label: "Privacy Policy",      href: "/privacy" },
];

const DISCLOSURE_LINKS = [
  { label: "Privacy Policy",  href: "/privacy" },
  { label: "Blog",            href: "/blog" },
  { label: "Shipping Policy", href: "/shipping" },
  { label: "FAQs",            href: "/faq" },
];

const SOCIALS = [
  { Icon: Facebook,  href: '#', label: 'Facebook' },
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: Twitter,   href: '#', label: 'Twitter' },
  { Icon: Youtube,   href: '#', label: 'YouTube' },
];

export function Footer() {
  return (
    <footer className="bg-pink-500 text-white mt-8">
      <div className="max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-12 pt-12 pb-8">

        {/* ── Main columns ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div>
            <h2 className="text-2xl font-black tracking-tight mb-3">Shaj</h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-xs">
              Bangladesh's trusted fashion brand — offering the latest styles in clothing,
              accessories, and lifestyle products for every occasion.
            </p>
            <div className="flex items-center gap-2 mt-5">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label} href={href} aria-label={label}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Important Links */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Important Links</h3>
            <ul className="space-y-2.5">
              {IMPORTANT_LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/80 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclosure Section */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Disclosure Section</h3>
            <ul className="space-y-2.5">
              {DISCLOSURE_LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/80 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Subscribe to Newsletter</h3>
            <form className="flex gap-2" onSubmit={e => e.preventDefault()}>
              <input
                type="email" placeholder="Email"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white
                           placeholder:text-white/50 text-sm focus:outline-none focus:border-white/60 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────── */}
        <div className="border-t border-white/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/70">
          <p>© {new Date().getFullYear()} Shaj. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {SOCIALS.map(({ Icon, href, label }) => (
              <a key={label} href={href} aria-label={label} className="text-white/60 hover:text-white transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

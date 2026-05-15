import Link from 'next/link';
import Image from 'next/image';

export const metadata = { title: 'About Us — Shaj' };

const STATS = [
  { value: '2019', label: 'Founded' },
  { value: '200K+', label: 'Happy Customers' },
  { value: '50K+', label: 'Products' },
  { value: '4.8★', label: 'Average Rating' },
];

const TEAM = [
  { name: 'Arif Hossain', role: 'Co-Founder & CEO', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80' },
  { name: 'Nusrat Jahan', role: 'Co-Founder & COO', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80' },
  { name: 'Kamal Uddin', role: 'Head of Design', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80' },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Fashion for Everyone</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Shaj was founded on a simple belief: great fashion should be accessible to all Bangladeshis —
            without compromise on quality, style, or value.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Our Story</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-5">Born in Dhaka, Built for Bangladesh</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Shaj started in 2019 as a small boutique in Dhanmondi, Dhaka. Our founders Arif and Nusrat
                noticed a gap — fashionable, quality clothing at accessible prices simply didn't exist
                in the online space for Bangladeshi shoppers.
              </p>
              <p>
                We built Shaj to change that. Today we carry over 50,000 products across women's fashion,
                men's wear, kids, accessories, footwear, and beauty — all curated for the modern Bangladeshi lifestyle.
              </p>
              <p>
                We work directly with local manufacturers and trusted international suppliers, cutting out
                middlemen so you get better prices without sacrificing quality.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80"
              alt="Shaj store"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: 'Quality First', desc: 'Every product we carry is hand-selected and quality-checked before it reaches your door.' },
              { title: 'Fair Prices', desc: 'We work directly with suppliers to pass real savings to you — no hidden markups.' },
              { title: 'Local Roots', desc: 'Proudly Bangladeshi. We support local artisans and manufacturers wherever possible.' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">Meet the Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {TEAM.map(({ name, role, image }) => (
            <div key={name} className="text-center">
              <div className="relative w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 bg-gray-100">
                <Image src={image} alt={name} fill className="object-cover" />
              </div>
              <p className="font-semibold text-gray-900">{name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to explore?</h2>
        <p className="text-white/60 mb-8">Discover thousands of styles curated just for you.</p>
        <Link href="/products" className="inline-block bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors">
          Shop Now
        </Link>
      </section>
    </div>
  );
}

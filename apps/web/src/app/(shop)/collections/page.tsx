'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const COLLECTIONS = [
  {
    slug: 'women',
    name: "Women's Collection",
    description: 'Elegant styles for every occasion',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
    count: 240,
  },
  {
    slug: 'men',
    name: "Men's Collection",
    description: 'Modern fits for the contemporary man',
    image: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=600&q=80',
    count: 185,
  },
  {
    slug: 'ethnic',
    name: 'Ethnic Wear',
    description: 'Traditional styles with a modern twist',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80',
    count: 120,
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    description: 'Complete your look with the perfect accessory',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
    count: 98,
  },
  {
    slug: 'footwear',
    name: 'Footwear',
    description: 'Step out in style with our latest collection',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    count: 76,
  },
  {
    slug: 'kids',
    name: 'Kids',
    description: 'Fun and comfortable styles for little ones',
    image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600&q=80',
    count: 64,
  },
];

export default function CollectionsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
        <p className="text-gray-500 mt-2">Explore our curated fashion collections</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {COLLECTIONS.map((col, i) => (
          <motion.div
            key={col.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
          >
            <Link
              href={`/products?category=${col.slug}`}
              className="group relative block overflow-hidden rounded-2xl aspect-[4/5] bg-gray-100"
            >
              <Image
                src={col.image}
                alt={col.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h2 className="text-xl font-bold leading-tight">{col.name}</h2>
                <p className="text-sm text-white/80 mt-1">{col.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-white/60">{col.count} items</span>
                  <span className="flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all">
                    Shop Now <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

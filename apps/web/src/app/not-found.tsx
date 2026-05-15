import Link from 'next/link';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-8xl font-black text-gray-100 select-none">404</p>
      <Search className="w-12 h-12 text-gray-300 -mt-4 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/products"
          className="border border-gray-200 text-gray-700 px-6 py-3 rounded-full text-sm font-semibold hover:border-gray-400 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}

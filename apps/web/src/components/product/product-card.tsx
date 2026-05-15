'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { formatBDT } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    images?: Array<{ url: string }>;
    averageRating?: number;
    reviewCount?: number;
    stockQuantity?: number;
    sku: string;
    brand?: { name: string };
    flashSalePrice?: number;
  };
}

export function ProductCard({ product }: Props) {
  const addItem  = useCartStore(s => s.addItem);
  const { toggle, has } = useWishlistStore();
  const wishlisted  = has(product.id);
  const image       = product.images?.[0]?.url;
  const salePrice   = product.flashSalePrice ?? null;
  const displayPrice  = salePrice ?? product.price;
  const originalPrice = salePrice ? product.price : product.compareAtPrice;
  const discount    = originalPrice ? Math.round((1 - displayPrice / originalPrice) * 100) : null;
  const inStock     = (product.stockQuantity ?? 1) > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inStock) return;
    addItem({ id: `${product.id}-default`, productId: product.id, name: product.name, slug: product.slug, image, price: displayPrice, quantity: 1, sku: product.sku });
    toast.success('Added to cart');
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {image ? (
          <Image
            src={image} alt={product.name} fill
            className="object-cover group-hover:scale-105 transition-transform duration-400"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ShoppingCart className="w-10 h-10" />
          </div>
        )}

        {discount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}

        {/* Wishlist — always visible */}
        <button
          onClick={e => {
            e.preventDefault();
            toggle({ id: product.id, productId: product.id, name: product.name, slug: product.slug, image, price: displayPrice });
          }}
          className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100"
        >
          <Heart className={cn('w-3.5 h-3.5', wishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-400')} />
        </button>

        {!inStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs font-semibold px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3">
        <p className="text-xs text-gray-700 leading-snug line-clamp-2 mb-2 min-h-[2.5rem]">{product.name}</p>

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-gray-900">{formatBDT(displayPrice)}</span>
            {originalPrice && (
              <span className="text-xs text-gray-400 line-through ml-1.5">{formatBDT(originalPrice)}</span>
            )}
          </div>

          {/* Pink add-to-cart circle button */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className="w-7 h-7 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;

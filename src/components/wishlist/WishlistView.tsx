"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { WishlistResponse } from "@/types";

const emptyWishlist: WishlistResponse = { items: [], count: 0 };

export function WishlistView() {
  const { format } = useCurrency();
  const [wishlist, setWishlist] = useState<WishlistResponse>(emptyWishlist);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wishlist", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : emptyWishlist))
      .then((data: WishlistResponse) => setWishlist(data))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (productId: string) => {
    setBusyId(productId);
    const response = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });
    if (response.ok) {
      setWishlist((await response.json()) as WishlistResponse);
      window.dispatchEvent(new Event("wishlist:changed"));
    }
    setBusyId(null);
  };

  const addToCart = async (productId: string) => {
    setBusyId(productId);
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (response.ok) window.dispatchEvent(new Event("cart:changed"));
    setBusyId(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your wishlist...
      </div>
    );
  }

  if (!wishlist.items.length) {
    return (
      <div className="bg-tile px-8 py-20 text-center">
        <h2 className="text-[26px] font-semibold text-ink">Your wishlist is empty</h2>
        <p className="mt-3 text-[13px] text-muted">Save products you love and come back to them later.</p>
        <Link
          href="/search"
          className="mt-7 inline-flex h-11 items-center rounded-[4px] bg-navy px-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {wishlist.items.map((product) => (
        <article key={product.id} className="overflow-hidden border border-line">
          <Link href={`/product/${product.slug}`} className="relative block aspect-[144/118] bg-tile">
            <Image src={product.image} alt={product.name} fill sizes="360px" className="object-cover" />
          </Link>
          <div className="p-3 sm:p-5">
            <Link href={`/product/${product.slug}`} className="text-[15px] font-medium text-ink hover:text-brand">
              {product.name}
            </Link>
            <p className="mt-2 text-[15px] font-semibold text-ink">{product.priceMax && product.priceMax > product.price ? `${format(product.price)} \u2013 ${format(product.priceMax)}` : format(product.price)}</p>
            <div className="mt-3 flex items-center gap-2 sm:mt-4">
              <button
                type="button"
                onClick={() => void addToCart(product.id)}
                disabled={busyId === product.id}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[4px] bg-navy text-[9px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Add to cart
              </button>
              <button
                type="button"
                onClick={() => void remove(product.id)}
                disabled={busyId === product.id}
                aria-label={`Remove ${product.name} from wishlist`}
                className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-line text-muted transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

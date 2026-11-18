"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type CartState = { count: number; subtotal: number };
type WishlistState = { count: number };

export function HeaderCounts({ labels }: { labels: { wishlist: string; cart: string } }) {
  const { format } = useCurrency();
  const [cart, setCart] = useState<CartState>({ count: 0, subtotal: 0 });
  const [wishlist, setWishlist] = useState<WishlistState>({ count: 0 });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [cartResponse, wishlistResponse] = await Promise.all([
          fetch("/api/cart", { cache: "no-store" }),
          fetch("/api/wishlist", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (cartResponse.ok) {
          const data = (await cartResponse.json()) as CartState;
          setCart({ count: data.count ?? 0, subtotal: data.subtotal ?? 0 });
        }

        if (wishlistResponse.ok) {
          const data = (await wishlistResponse.json()) as WishlistState;
          setWishlist({ count: data.count ?? 0 });
        }
      } catch {
        // The header counters are non-critical; keep the last known values.
      }
    };

    const onCartChanged = () => void load();
    const onWishlistChanged = () => void load();

    void load();
    window.addEventListener("cart:changed", onCartChanged);
    window.addEventListener("wishlist:changed", onWishlistChanged);

    return () => {
      active = false;
      window.removeEventListener("cart:changed", onCartChanged);
      window.removeEventListener("wishlist:changed", onWishlistChanged);
    };
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-3 text-[13px] font-semibold tracking-[0.05em] text-ink sm:gap-5">
      <Link
        href="/wishlist"
        className="group relative flex items-center gap-2 transition-colors hover:text-brand"
      >
        <span className="relative">
          <Heart className="h-[24px] w-[24px]" strokeWidth={1.8} />
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-[3px] bg-orange px-1 text-[10px] font-bold leading-none text-white">
            {wishlist.count}
          </span>
        </span>
        <span className="hidden xl:inline">{labels.wishlist}</span>
      </Link>

      <Link
        href="/cart"
        className="group relative flex items-center gap-2 transition-colors hover:text-brand"
      >
        <span className="relative">
          <ShoppingCart className="h-[25px] w-[25px]" strokeWidth={1.8} />
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-[3px] bg-orange px-1 text-[10px] font-bold leading-none text-white">
            {cart.count}
          </span>
        </span>
        <span className="hidden xl:inline">{format(cart.subtotal)}</span>
      </Link>
    </div>
  );
}

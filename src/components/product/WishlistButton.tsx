"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";

type WishlistPayload = {
  items?: Array<{ id: string }>;
};

let cachedWishlist: Promise<Set<string>> | null = null;

function loadWishlistIds() {
  if (!cachedWishlist) {
    cachedWishlist = fetch("/api/wishlist", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return new Set<string>();
        const payload = (await response.json()) as WishlistPayload;
        return new Set((payload.items ?? []).map((item) => item.id));
      })
      .catch(() => {
        cachedWishlist = null;
        return new Set<string>();
      });
  }

  return cachedWishlist;
}

export function WishlistButton({
  productId,
  productName,
  className,
  iconClassName = "h-5 w-5",
  labelClassName,
}: {
  productId: string;
  productName: string;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    void loadWishlistIds().then((ids) => {
      if (mounted) setActive(ids.has(productId));
    });
    return () => {
      mounted = false;
    };
  }, [productId]);

  const toggleWishlist = async () => {
    if (busy) return;
    setBusy(true);
    const nextActive = !active;

    try {
      const response = await fetch(
        nextActive
          ? "/api/wishlist"
          : `/api/wishlist?productId=${encodeURIComponent(productId)}`,
        {
          method: nextActive ? "POST" : "DELETE",
          headers: nextActive ? { "Content-Type": "application/json" } : undefined,
          body: nextActive ? JSON.stringify({ productId }) : undefined,
        },
      );
      if (!response.ok) throw new Error("Wishlist request failed");

      const payload = (await response.json()) as WishlistPayload;
      const ids = new Set((payload.items ?? []).map((item) => item.id));
      cachedWishlist = Promise.resolve(ids);
      setActive(ids.has(productId));
      window.dispatchEvent(new Event("wishlist:changed"));
    } catch {
      setActive(active);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      aria-label={active ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}
      aria-pressed={active}
      disabled={busy}
      className={className}
    >
      {busy ? (
        <Loader2 className={`${iconClassName} animate-spin`} />
      ) : (
        <Heart className={`${iconClassName} ${active ? "fill-current" : ""}`} strokeWidth={1.7} />
      )}
      {labelClassName ? <span className={labelClassName}>Wishlist</span> : null}
    </button>
  );
}

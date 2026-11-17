"use client";

import { useState, type MouseEvent } from "react";
import { Check, Heart, Loader2, ShoppingCart } from "lucide-react";

type Status = "idle" | "loading" | "cart" | "wishlist";

export function ProductCardActions({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  const addToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setStatus("loading");

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!response.ok) throw new Error("Unable to add to cart");
      window.dispatchEvent(new Event("cart:changed"));
      setStatus("cart");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("idle");
    }
  };

  const addToWishlist = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setStatus("loading");

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) throw new Error("Unable to add to wishlist");
      window.dispatchEvent(new Event("wishlist:changed"));
      setStatus("wishlist");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="flex translate-x-1 flex-col gap-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
      <button
        type="button"
        onClick={addToWishlist}
        aria-label={`Add ${productName} to wishlist`}
        className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-white text-navy shadow-[0_4px_14px_rgba(1,38,78,0.15)] transition-colors hover:bg-navy hover:text-white"
      >
        {status === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "wishlist" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Heart className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={addToCart}
        aria-label={`Add ${productName} to cart`}
        className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-white text-navy shadow-[0_4px_14px_rgba(1,38,78,0.15)] transition-colors hover:bg-navy hover:text-white"
      >
        {status === "cart" ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Heart, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";

export function ProductPurchase({
  productId,
  productName,
  stock,
}: {
  productId: string;
  productName: string;
  stock: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "cart" | "wishlist" | "error">("idle");
  const [message, setMessage] = useState("");

  const addToCart = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      if (!response.ok) throw new Error("Unable to add to cart");
      window.dispatchEvent(new Event("cart:changed"));
      setStatus("cart");
      setMessage(`${productName} was added to your cart.`);
    } catch {
      setStatus("error");
      setMessage("We could not add this product to your cart. Please try again.");
    }
  };

  const addToWishlist = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) throw new Error("Unable to add to wishlist");
      window.dispatchEvent(new Event("wishlist:changed"));
      setStatus("wishlist");
      setMessage(`${productName} was added to your wishlist.`);
    } catch {
      setStatus("error");
      setMessage("We could not update your wishlist. Please try again.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 items-center rounded-[4px] border border-line bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            className="flex h-12 w-11 items-center justify-center text-navy transition-colors hover:text-brand"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-[14px] font-semibold text-ink">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((current) => Math.min(stock || 99, current + 1))}
            className="flex h-12 w-11 items-center justify-center text-navy transition-colors hover:text-brand"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={addToCart}
          disabled={status === "loading" || stock === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[4px] bg-navy px-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          Add to cart
        </button>

        <button
          type="button"
          onClick={addToWishlist}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[4px] border border-line px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:border-navy hover:text-navy"
        >
          {status === "wishlist" ? <Check className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
          Wishlist
        </button>
      </div>
      <p aria-live="polite" className={`mt-3 min-h-5 text-[12px] ${status === "error" ? "text-red-600" : "text-muted"}`}>
        {message}
      </p>
    </div>
  );
}

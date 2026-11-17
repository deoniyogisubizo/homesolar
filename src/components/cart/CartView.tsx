"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Heart,
  Loader2,
  Minus,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Price } from "@/components/currency/Price";
import type { CartLine, CartResponse } from "@/types";

type CartViewProps = {
  initialCart: CartResponse;
  orderingAvailable: boolean;
  helperText: string;
  supportEmail: string;
  supportPhone: string;
};

type CouponState = { status: "idle" | "loading"; message: string | null };

function variantLabel(line: CartLine) {
  const color =
    line.product.options.colors.find((option) => option.value === line.variant?.color)?.label ??
    line.variant?.color ??
    "";
  const size =
    line.product.options.sizes.find((option) => option.value === line.variant?.size)?.label ??
    line.variant?.size ??
    "";
  return [color, size].filter(Boolean).join(" · ");
}

function hasBlockingNotice(cart: CartResponse) {
  return cart.items.some((item) => item.notice === "unavailable" || item.notice === "stock");
}

export function CartView({
  initialCart,
  orderingAvailable,
  helperText,
  supportEmail,
  supportPhone,
}: CartViewProps) {
  const [cart, setCart] = useState<CartResponse>(initialCart);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle", message: null });
  const snapshot = useRef<CartResponse>(initialCart);

  const commit = (next: CartResponse) => {
    snapshot.current = next;
    setCart(next);
    window.dispatchEvent(new Event("cart:changed"));
  };

  const syncCart = async () => {
    const response = await fetch("/api/cart", { cache: "no-store" });
    if (!response.ok) return;
    const next = (await response.json()) as CartResponse;
    commit(next);
  };

  const changeQuantity = async (line: CartLine, quantity: number) => {
    if (quantity < 0 || quantity > 99) return;
    const previous = cart;
    const nextItems = quantity === 0
      ? cart.items.filter((item) => item.key !== line.key)
      : cart.items.map((item) =>
          item.key === line.key
            ? { ...item, quantity, lineTotal: Math.round(item.unitPrice * quantity * 100) / 100 }
            : item,
        );
    const unit = line.product.pricing?.originalPrice ?? line.unitPrice;
    const delta = Math.round((quantity - line.quantity) * unit * 100) / 100;
    setCart({
      ...cart,
      items: nextItems,
      count: nextItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: Math.round((cart.subtotal + delta) * 100) / 100,
      total: Math.max(0, Math.round((cart.total + delta) * 100) / 100),
    });
    setBusyKey(line.key);
    setNotice(null);

    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: line.product.id,
          variantSku: line.variant?.sku ?? undefined,
          quantity,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setCart(previous);
        setNotice(data?.error ?? "The quantity could not be updated.");
        await syncCart();
        return;
      }

      commit((await response.json()) as CartResponse);
    } catch {
      setCart(previous);
      setNotice("The cart could not be updated. Check your connection and try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const removeLine = async (line: CartLine) => {
    const previous = cart;
    const nextItems = cart.items.filter((item) => item.key !== line.key);
    setCart({
      ...cart,
      items: nextItems,
      count: nextItems.reduce((sum, item) => sum + item.quantity, 0),
    });
    setBusyKey(line.key);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/cart?productId=${encodeURIComponent(line.product.id)}${
          line.variant?.sku ? `&variantSku=${encodeURIComponent(line.variant.sku)}` : ""
        }`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setCart(previous);
        setNotice("The item could not be removed. Try again.");
        return;
      }
      commit((await response.json()) as CartResponse);
    } catch {
      setCart(previous);
      setNotice("The item could not be removed. Check your connection and try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const moveToWishlist = async (line: CartLine) => {
    setBusyKey(line.key);
    setNotice(null);
    try {
      const wishlistResponse = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: line.product.id }),
      });
      if (!wishlistResponse.ok) {
        setNotice("The item could not be saved to your wishlist.");
        return;
      }
      window.dispatchEvent(new Event("wishlist:changed"));
      await removeLine(line);
    } finally {
      setBusyKey(null);
    }
  };

  const applyCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCoupon({ status: "loading", message: null });
    try {
      const response = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });
      const data = (await response.json().catch(() => null)) as
        | (CartResponse & { error?: string })
        | null;
      if (!response.ok || !data) {
        setCoupon({ status: "idle", message: data?.error ?? "The coupon could not be applied." });
        return;
      }
      commit(data);
      setCouponCode("");
      setCoupon({ status: "idle", message: null });
    } catch {
      setCoupon({ status: "idle", message: "The coupon could not be applied. Try again." });
    }
  };

  const removeCoupon = async () => {
    setCoupon({ status: "loading", message: null });
    try {
      const response = await fetch("/api/cart/coupon", { method: "DELETE" });
      if (!response.ok) {
        setCoupon({ status: "idle", message: "The coupon could not be removed." });
        return;
      }
      commit((await response.json()) as CartResponse);
      setCoupon({ status: "idle", message: null });
    } catch {
      setCoupon({ status: "idle", message: "The coupon could not be removed. Try again." });
    }
  };

  if (!cart.items.length) {
    return (
      <div className="bg-tile px-8 py-20 text-center">
        <h2 className="text-[26px] font-semibold text-ink">Your cart is empty</h2>
        <p className="mt-3 text-[13px] text-muted">
          Explore solar panels, inverters, batteries, and more.
        </p>
        <Link
          href="/search"
          className="mt-7 inline-flex h-11 items-center rounded-[4px] bg-navy px-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-deep"
        >
          Shop products
        </Link>
      </div>
    );
  }

  const blocking = hasBlockingNotice(cart);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="space-y-3">
        {notice ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
              className="text-red-700/70 transition-colors hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {cart.items.map((line) => {
          const options = variantLabel(line);
          const busy = busyKey === line.key;
          const originalPrice = line.product.pricing?.originalPrice ?? null;

          return (
            <article key={line.key} className="border border-line bg-white p-4 sm:p-5">
              <div className="flex gap-4">
                <Link
                  href={`/product/${line.product.slug}`}
                  className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[4px] bg-tile sm:h-[112px] sm:w-[112px]"
                >
                  <Image
                    src={line.product.image}
                    alt={line.product.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${line.product.slug}`}
                        className="text-[15px] font-medium text-ink transition-colors hover:text-brand"
                      >
                        {line.product.name}
                      </Link>
                      <p className="mt-1 text-[12px] text-muted">
                        {line.product.category.name}
                        {options ? ` · ${options}` : ""}
                      </p>
                      <p className="mt-2 flex flex-wrap items-baseline gap-2 text-[13px]">
                        <span className="font-medium text-ink">
                          <Price value={line.unitPrice} />
                        </span>
                        {originalPrice && originalPrice > line.unitPrice ? (
                          <span className="text-[11px] text-muted line-through">
                            <Price value={originalPrice} />
                          </span>
                        ) : null}
                        <span className="text-[11px] text-muted">each</span>
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-[15px] font-semibold text-ink">
                      <Price value={line.lineTotal} />
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      className="flex h-9 items-center rounded-[4px] border border-line"
                      aria-label={`Quantity for ${line.product.name}`}
                    >
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${line.product.name}`}
                        onClick={() => void changeQuantity(line, line.quantity - 1)}
                        disabled={busy}
                        className="flex h-9 w-9 items-center justify-center text-navy transition-colors hover:bg-tile disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-[13px] font-medium" aria-live="polite">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${line.product.name}`}
                        onClick={() => void changeQuantity(line, line.quantity + 1)}
                        disabled={busy || line.quantity >= Math.min(99, line.stock)}
                        className="flex h-9 w-9 items-center justify-center text-navy transition-colors hover:bg-tile disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void moveToWishlist(line)}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-brand disabled:opacity-40"
                      >
                        <Heart className="h-3.5 w-3.5" /> Move to wishlist
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeLine(line)}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-red-600 disabled:opacity-40"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {line.notice === "unavailable" ? (
                <p className="mt-3 border-t border-line pt-3 text-[12px] text-red-700">
                  This item is no longer available. Remove it to continue to checkout.
                </p>
              ) : null}
              {line.notice === "stock" ? (
                <p className="mt-3 border-t border-line pt-3 text-[12px] text-warning">
                  Only {line.stock} left in stock. Reduce the quantity to continue to checkout.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <aside className="h-fit bg-tile p-6 lg:sticky lg:top-[110px]">
        <h2 className="text-[19px] font-semibold text-ink">Order summary</h2>
        <dl className="mt-5 space-y-3 text-[13px]">
          <div className="flex justify-between gap-4 text-muted">
            <dt>Items</dt>
            <dd>{cart.count}</dd>
          </div>
          <div className="flex justify-between gap-4 text-muted">
            <dt>Subtotal</dt>
            <dd className="text-ink">
              <Price value={cart.subtotal} />
            </dd>
          </div>
          {cart.campaignDiscount > 0 ? (
            <div className="flex justify-between gap-4 text-muted">
              <dt>Campaign discount</dt>
              <dd className="text-success">
                −<Price value={cart.campaignDiscount} />
              </dd>
            </div>
          ) : null}
          {cart.coupon ? (
            <div className="flex items-start justify-between gap-4 text-muted">
              <dt className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {cart.coupon.code}
              </dt>
              <dd className="flex items-center gap-2 text-success">
                −<Price value={cart.coupon.discount} />
                <button
                  type="button"
                  onClick={() => void removeCoupon()}
                  aria-label={`Remove coupon ${cart.coupon.code}`}
                  className="text-muted transition-colors hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 text-muted">
            <dt>Shipping</dt>
            <dd className="text-ink">
              {cart.shippingPending ? (
                "Calculated at checkout"
              ) : cart.freeShipping || cart.shipping === 0 ? (
                "Free"
              ) : (
                <Price value={cart.shipping} />
              )}
            </dd>
          </div>
          {cart.tax > 0 ? (
            <div className="flex justify-between gap-4 text-muted">
              <dt>Tax</dt>
              <dd className="text-ink">
                <Price value={cart.tax} />
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-line pt-3 text-[15px] font-semibold text-ink">
            <dt>Total</dt>
            <dd>
              <Price value={cart.total} />
            </dd>
          </div>
        </dl>

        <form onSubmit={applyCoupon} className="mt-5">
          <label htmlFor="coupon-code" className="text-[11px] font-medium text-muted">
            Coupon code
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="coupon-code"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-[4px] border border-line bg-white px-3 text-[12px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand"
              placeholder="Enter code"
            />
            <button
              type="submit"
              disabled={coupon.status === "loading" || couponCode.trim().length < 2}
              className="h-10 rounded-[4px] border border-navy px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-40"
            >
              {coupon.status === "loading" ? "Applying" : "Apply"}
            </button>
          </div>
          {coupon.message || cart.couponError ? (
            <p className="mt-2 text-[11px] text-red-700">{coupon.message ?? cart.couponError}</p>
          ) : null}
        </form>

        {orderingAvailable ? (
          blocking ? (
            <button
              type="button"
              disabled
              className="mt-6 h-12 w-full cursor-not-allowed rounded-[4px] bg-navy/40 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
            >
              Checkout
            </button>
          ) : (
            <Link
              href="/checkout"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-[4px] bg-navy text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-deep"
            >
              Proceed to checkout
            </Link>
          )
        ) : (
          <button
            type="button"
            disabled
            className="mt-6 h-12 w-full cursor-not-allowed rounded-[4px] bg-navy/40 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
          >
            Checkout unavailable
          </button>
        )}

        {orderingAvailable ? (
          blocking ? (
            <p className="mt-3 text-[11px] leading-5 text-muted">
              Resolve the item notices above before checking out.
            </p>
          ) : (
            <p className="mt-3 text-[11px] leading-5 text-muted">{helperText}</p>
          )
        ) : (
          <div className="mt-3 space-y-1 text-[11px] leading-5 text-muted">
            <p>Ordering is temporarily unavailable. Please contact us.</p>
            <p>
              <a href={`tel:${supportPhone}`} className="underline underline-offset-2 hover:text-ink">
                {supportPhone}
              </a>
              {" · "}
              <a href={`mailto:${supportEmail}`} className="underline underline-offset-2 hover:text-ink">
                {supportEmail}
              </a>
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

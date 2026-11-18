"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Ruler, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/currency/Price";
import { WishlistButton } from "@/components/product/WishlistButton";
import type { Product, ProductVariant, SiteContentData } from "@/types";

type CartState = "idle" | "loading" | "added" | "error";

export function ProductBuyBox({
  product,
  siteContent,
}: {
  product: Product;
  siteContent: SiteContentData | null;
}) {
  const colors = product.options.colors;
  const sizes = product.options.sizes;
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;
  const variants = product.variants;

  const initialVariant = useMemo(
    () =>
      variants.find((variant) => variant.isDefault) ??
      variants.find((variant) => variant.stock > 0) ??
      variants[0] ??
      null,
    [variants],
  );

  const [selectedColor, setSelectedColor] = useState<string | null>(
    hasColors ? initialVariant?.color ?? colors[0]?.value ?? null : null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    hasSizes ? initialVariant?.size ?? sizes[0]?.value ?? null : null,
  );
  const [cartState, setCartState] = useState<CartState>("idle");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(1);
  const cartTimer = useRef<number | null>(null);

  const selectedVariant = resolveVariant(variants, hasColors, hasSizes, selectedColor, selectedSize);
  const quote = selectedVariant
    ? product.variantPricing?.[selectedVariant.sku]
    : product.pricing;
  const listPrice = selectedVariant?.price ?? product.price;
  const price = quote?.effectivePrice ?? listPrice;
  const compareAtPrice =
    quote && quote.discountPercent > 0
      ? quote.originalPrice
      : selectedVariant
        ? selectedVariant.compareAtPrice ?? null
        : product.compareAtPrice ?? null;
  const discount =
    quote && quote.discountPercent > 0
      ? quote.discountPercent
      : compareAtPrice && compareAtPrice > price
        ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
        : null;
  const stock = selectedVariant ? selectedVariant.stock : product.stock;
  const status = stock <= 0 ? "Out of Stock" : stock <= 5 ? "Low Stock" : "In Stock";
  const outOfStock = stock <= 0;

  const selectedColorLabel = colors.find((color) => color.value === selectedColor)?.label ?? "";
  const selectedSizeLabel = sizes.find((size) => size.value === selectedSize)?.label ?? "";

  const variantAvailable = (color: string | null, size: string | null) =>
    variants.some((variant) => {
      if (hasColors && variant.color !== null && variant.color !== color) return false;
      if (hasSizes && variant.size !== null && variant.size !== size) return false;
      return variant.stock > 0;
    });

  const colorEnabled = (value: string) => !variants.length || variantAvailable(value, selectedSize);
  const sizeEnabled = (value: string) => !variants.length || variantAvailable(selectedColor, value);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryColor = params.get("color");
    const querySize = params.get("size");

    if (hasColors && queryColor && colors.some((color) => color.value === queryColor)) {
      queueMicrotask(() => setSelectedColor(queryColor));
    }
    if (hasSizes && querySize && sizes.some((size) => size.value === querySize)) {
      queueMicrotask(() => setSelectedSize(querySize));
    }
  }, [colors, hasColors, hasSizes, sizes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (hasColors && selectedColor) params.set("color", selectedColor);
    else params.delete("color");
    if (hasSizes && selectedSize) params.set("size", selectedSize);
    else params.delete("size");

    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [hasColors, hasSizes, selectedColor, selectedSize]);

  useEffect(() => {
    if (!sizeGuideOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSizeGuideOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sizeGuideOpen]);

  useEffect(
    () => () => {
      if (cartTimer.current) window.clearTimeout(cartTimer.current);
    },
    [],
  );

  const selectColor = (value: string) => {
    if (!colorEnabled(value)) return;
    setSelectedColor(value);

    if (hasSizes && !variantAvailable(value, selectedSize)) {
      const nextSize = sizes.find((size) => variantAvailable(value, size.value));
      setSelectedSize(nextSize?.value ?? null);
    }
  };

  const selectSize = (value: string) => {
    if (!sizeEnabled(value)) return;
    setSelectedSize(value);
  };

  const addToCart = async () => {
    if (outOfStock || cartState === "loading") return;

    setCartState("loading");
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantSku: selectedVariant?.sku,
          quantity: cartQuantity,
        }),
      });
      if (!response.ok) throw new Error("Unable to add to cart");

      window.dispatchEvent(new Event("cart:changed"));
      setCartState("added");
      setCartDialogOpen(true);
      if (cartTimer.current) window.clearTimeout(cartTimer.current);
      cartTimer.current = window.setTimeout(() => setCartState("idle"), 1500);
    } catch {
      setCartState("error");
      if (cartTimer.current) window.clearTimeout(cartTimer.current);
      cartTimer.current = window.setTimeout(() => setCartState("idle"), 1500);
    }
  };

  const incrementQuantity = () => setCartQuantity((q) => Math.min(q + 1, stock));
  const decrementQuantity = () => setCartQuantity((q) => Math.max(q - 1, 1));

  const totalPrice = price * cartQuantity;

  const companyName = siteContent?.meta?.title ?? siteContent?.hero?.titleStrong ?? "Our Store";
  const productImage = product.images[0]?.src ?? product.image;
  const detailSpecs = product.specs.filter((spec) => spec.label && spec.value).slice(0, 4);
  const detailFeatures = product.features.slice(0, 4);

return (
    <div className="pt-5 lg:pt-1">
      <span className="inline-flex h-[26px] items-center rounded-full bg-[#F3F4F6] px-3.5 text-[10px] font-semibold text-ink lg:text-[11px]">
        {status}
      </span>

      <h1 className="mt-4 text-[26px]! font-bold leading-[1.08]! tracking-[-0.03em] text-ink sm:text-[30px]! lg:mt-3 lg:text-[32px]! lg:leading-[1.1]! xl:text-[36px]!">
        {product.name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] lg:mt-2.5 lg:text-[13px]">
        <span role="img" className="flex items-center gap-[2px] text-gold" aria-label={`Rated ${product.ratingAverage} out of 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <svg
              key={index}
              viewBox="0 0 20 20"
              className="h-[14px] w-[14px] fill-current lg:h-[14px] lg:w-[14px]"
              aria-hidden="true"
            >
              <path d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.21l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.6z" />
            </svg>
          ))}
        </span>
        <span className="font-semibold text-ink">{product.ratingAverage.toFixed(1)}</span>
        <span className="text-muted">({product.ratingCount} reviews)</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 lg:mt-3 lg:gap-x-4">
        <span className="text-[28px] font-bold tracking-[-0.03em] text-ink lg:text-[28px] xl:text-[32px]">
          <Price value={price} compact />
        </span>
        {compareAtPrice && discount ? (
          <>
            <span className="text-[14px] text-muted line-through lg:text-[14px]">
              <Price value={compareAtPrice} compact />
            </span>
            <span className="inline-flex h-[22px] items-center rounded-full bg-gold px-3 text-[10px] font-semibold text-white">
              {discount}% OFF
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-3 max-w-[100%] text-[14px]! leading-[1.6] text-ink lg:mt-3">
        {product.shortDescription}
      </p>

      <div className="mt-4 border-t border-[#E5E7EB] pt-4 lg:mt-4 lg:pt-4">
        {hasColors ? (
          <div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-muted">Color:</span>
              <span className="font-normal text-ink underline underline-offset-[3px]">
                {selectedColorLabel}
              </span>
            </div>
            <div className="mt-[10px] flex items-center gap-3 lg:mt-2.5">
              {colors.map((color) => {
                const selected = color.value === selectedColor;
                const enabled = colorEnabled(color.value);
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => selectColor(color.value)}
                    disabled={!enabled}
                    aria-label={`Color ${color.label}`}
                    aria-pressed={selected}
                    className={`flex h-[34px] w-[34px] items-center justify-center rounded-full border transition-opacity duration-150 ${
                      selected ? "border-brand" : "border-transparent"
                    } ${enabled ? "" : "cursor-not-allowed opacity-30"}`}
                  >
                    <span
                      className="block h-[26px] w-[26px] rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {hasSizes ? (
          <div className={hasColors ? "mt-5" : ""}>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2">
                <span className="text-muted">Size:</span>
                <span className="font-normal text-ink underline underline-offset-[3px]">
                  {selectedSizeLabel}
                </span>
              </span>
              {product.sizeGuide ? (
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="flex items-center gap-[6px] text-ink underline underline-offset-[3px] transition-colors duration-150 hover:text-brand"
                >
                  <Ruler className="h-[15px] w-[15px]" strokeWidth={1.7} />
                  Size Guide
                </button>
              ) : null}
            </div>

            <div className="mt-[10px] flex flex-wrap gap-2 lg:mt-2.5">
              {sizes.map((size) => {
                const selected = size.value === selectedSize;
                const enabled = sizeEnabled(size.value);
                return (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => selectSize(size.value)}
                    disabled={!enabled}
                    aria-pressed={selected}
                    className={`flex h-[38px] min-w-[60px] items-center justify-center rounded-[6px] border px-4 text-[13px] font-medium transition-colors duration-150 ${
                      selected
                        ? "border-ink bg-ink text-white"
                        : enabled
                        ? "border-[#E5E7EB] bg-white text-ink hover:border-ink"
                        : "cursor-not-allowed border-[#F0F1F3] text-[#C4C7CC]"
                    }`}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex items-stretch gap-2.5 lg:mt-6">
          <button
            type="button"
            onClick={addToCart}
            disabled={outOfStock || cartState === "loading"}
            className={`flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[8px] bg-orange text-[14px] font-semibold text-white transition-opacity duration-150 lg:h-[46px] lg:text-[14px] ${
              outOfStock ? "cursor-not-allowed opacity-40" : "hover:opacity-90"
            }`}
          >
            {cartState === "added" ? (
              <Check className="h-[18px] w-[18px]" strokeWidth={1.8} />
            ) : (
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.7} />
            )}
            {cartState === "added" ? "Added" : cartState === "error" ? "Try Again" : "Add to Cart"}
          </button>

          <WishlistButton
            productId={product.id}
            productName={product.name}
            className="flex w-[46px] shrink-0 items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white text-ink transition-colors duration-150 hover:border-ink"
            iconClassName="h-[20px] w-[20px]"
          />
        </div>

        <div className="mt-7 grid gap-5 border-t border-[#E5E7EB] pt-5 sm:grid-cols-2 lg:mt-6 lg:gap-6">
          <div className="min-w-0">
            <h2 className="text-[11px]! font-semibold tracking-[0.14em]! text-muted">
              Details
            </h2>
            <p className="mt-2 text-[13px]! leading-[1.6] text-ink">{product.detailsIntro}</p>
          </div>

          {detailSpecs.length ? (
            <div className="min-w-0">
              <h2 className="text-[11px]! font-semibold tracking-[0.14em]! text-muted">
                Specifications
              </h2>
              <dl className="mt-2 divide-y divide-[#F0F1F3]">
                {detailSpecs.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-start justify-between gap-4 py-[6px] text-[12px]"
                  >
                    <dt className="text-muted">{spec.label}</dt>
                    <dd className="text-right font-medium text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : detailFeatures.length ? (
            <div className="min-w-0">
              <h2 className="text-[11px]! font-semibold tracking-[0.14em]! text-muted">
                Highlights
              </h2>
              <ul className="mt-2 space-y-2">
                {detailFeatures.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2 text-[12px] text-ink">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#333333] text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                    {feature.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {sizeGuideOpen && product.sizeGuide ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={product.sizeGuide.title}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="relative w-full max-w-[450px] rounded-[8px] bg-white p-5 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSizeGuideOpen(false)}
              aria-label="Close size guide"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:text-brand"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
            <h2 className="pr-6 text-[18px]! font-semibold text-ink">{product.sizeGuide.title}</h2>
            <p className="mt-2 text-[11px]! leading-5 text-muted">{product.sizeGuide.intro}</p>
            <dl className="mt-4 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
              {product.sizeGuide.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-[11px]">
                  <dt className="font-semibold text-ink">{row.label}</dt>
                  <dd className="text-right text-muted">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}

      {cartDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cart confirmation"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setCartDialogOpen(false)}
        >
          <div
            className="relative w-full max-w-[480px] rounded-[12px] border border-[#E5E7EB] bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCartDialogOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:text-brand hover:bg-[#F3F4F6]"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>

            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 mx-auto mb-4">
                <Check className="h-7 w-7 text-brand" strokeWidth={2} />
              </div>
              <h2 className="text-[22px]! font-bold text-ink">Thanks for purchasing in {companyName}</h2>
              <p className="mt-2 text-[14px]! text-muted">Your item has been added to the cart</p>
            </div>

            <div className="mt-6 flex items-center gap-4 p-4 bg-[#F9FAFB] rounded-[8px]">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[6px] bg-tile">
                <Image
                  src={productImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-[14px]! font-semibold text-ink">{product.name}</p>
                {selectedColorLabel && (
                  <p className="mt-1 text-[12px]! text-muted">Color: {selectedColorLabel}</p>
                )}
                {selectedSizeLabel && (
                  <p className="mt-1 text-[12px]! text-muted">Size: {selectedSizeLabel}</p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink">Quantity</span>
                <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-[6px] overflow-hidden">
                  <button
                    type="button"
                    onClick={decrementQuantity}
                    disabled={cartQuantity <= 1}
                    className="flex h-10 w-10 items-center justify-center text-ink transition-colors duration-150 hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <span className="w-12 text-center text-[15px] font-semibold text-ink">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={incrementQuantity}
                    disabled={cartQuantity >= stock}
                    className="flex h-10 w-10 items-center justify-center text-ink transition-colors duration-150 hover:bg-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
                <span className="text-[13px] font-medium text-ink">Total</span>
                <span className="text-[20px] font-bold text-ink">
                  <Price value={totalPrice} />
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCartDialogOpen(false)}
                className="flex-1 h-11 items-center justify-center gap-2 rounded-[7px] border border-[#E5E7EB] bg-white text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-ink hover:text-brand"
              >
                Continue Shopping
              </button>
              <Link
                href="/cart"
                className="flex-1 h-11 items-center justify-center gap-2 rounded-[7px] bg-ink text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function resolveVariant(
  variants: ProductVariant[],
  hasColors: boolean,
  hasSizes: boolean,
  color: string | null,
  size: string | null,
) {
  if (!variants.length) return null;

  const matches = variants.filter((variant) => {
    if (hasColors && variant.color !== null && variant.color !== color) return false;
    if (hasSizes && variant.size !== null && variant.size !== size) return false;
    return true;
  });

  return (
    matches.find((variant) => variant.color === color && variant.size === size) ??
    matches.find((variant) => variant.isDefault) ??
    matches[0] ??
    null
  );
}

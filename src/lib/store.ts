import { connectToDatabase } from "@/lib/mongodb";
import { Cart } from "@/models/Cart";
import { Product } from "@/models/Product";
import { Wishlist } from "@/models/Wishlist";
import { NewsletterSubscriber } from "@/models/NewsletterSubscriber";
import { serializeProduct } from "@/lib/serialize";
import { getPricingCampaigns } from "@/lib/data";
import { getEffectivePrice, type PricingContext } from "@/lib/pricing";
import { getSetting } from "@/lib/admin/settings";
import { quoteCart, type CartQuote, type CartQuoteOptions } from "@/lib/cart/quote";
import type { CartResponse, Product as ProductType, PriceQuote, WishlistResponse } from "@/types";

type CartItemLean = {
  product: unknown;
  variantSku?: string | null;
  color?: string | null;
  size?: string | null;
  priceSnapshot?: number | null;
  quantity: number;
};

type PopulatedCart = {
  items: CartItemLean[];
  couponCode?: string;
};

type PopulatedWishlist = {
  products: unknown[];
};

export class CartStockError extends Error {
  available: number;

  constructor(message: string, available: number) {
    super(message);
    this.name = "CartStockError";
    this.available = available;
  }
}

async function populateProduct(productId: string) {
  const product = await Product.findById(productId).populate("category").lean();
  return product ? serializeProduct(product as never) : null;
}

async function loadPopulatedCart(sessionId: string) {
  await connectToDatabase();
  return (await Cart.findOne({ sessionId })
    .populate({ path: "items.product", populate: { path: "category" } })
    .lean()) as PopulatedCart | null;
}

export async function getCart(
  sessionId: string,
  options: CartQuoteOptions = {},
): Promise<CartResponse> {
  return loadCartQuote(sessionId, options);
}

export async function loadCartQuote(
  sessionId: string,
  options: CartQuoteOptions = {},
): Promise<CartQuote> {
  const cart = await loadPopulatedCart(sessionId);
  const items = (cart?.items ?? [])
    .filter((item) => item.product)
    .map((item) => ({
      product: item.product as never,
      variantSku: item.variantSku,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
    }));

  return quoteCart(items, {
    ...options,
    couponCode: options.couponCode ?? cart?.couponCode ?? "",
  });
}

export async function addToCart(
  sessionId: string,
  productId: string,
  quantity: number,
  variantSku?: string | null,
) {
  await connectToDatabase();
  const product = await Product.findById(productId).select("_id price stock variants").lean();
  if (!product) return null;

  const variants = product.variants ?? [];
  const variant = variantSku
    ? variants.find((option) => option.sku === variantSku) ?? null
    : variants
        .filter((option) => option.stock > 0)
        .sort((a, b) => a.price - b.price)[0] ?? variants[0] ?? null;

  if (variantSku && !variant) return null;
  if (variant && variant.stock <= 0) return null;
  if (!variant && (product.stock ?? 0) <= 0) return null;

  const unitPrice = variant?.price ?? product.price;

  const cart = await Cart.findOneAndUpdate(
    { sessionId },
    { $setOnInsert: { sessionId, items: [] } },
    { upsert: true, new: true },
  );

  const existing = cart.items.find(
    (item) =>
      item.product.toString() === productId &&
      (item.variantSku ?? null) === (variant?.sku ?? null),
  );

  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    if (nextQuantity > 99 || nextQuantity > (variant?.stock ?? product.stock ?? 0)) {
      throw new CartStockError("The requested quantity is not available.", variant?.stock ?? product.stock ?? 0);
    }
    existing.quantity = nextQuantity;
    existing.priceSnapshot = unitPrice;
  } else {
    if (quantity > 99 || quantity > (variant?.stock ?? product.stock ?? 0)) {
      throw new CartStockError("The requested quantity is not available.", variant?.stock ?? product.stock ?? 0);
    }
    cart.items.push({
      product: product._id,
      variantSku: variant?.sku ?? null,
      color: variant?.color ?? null,
      size: variant?.size ?? null,
      priceSnapshot: unitPrice,
      quantity,
    });
  }

  await cart.save();
  return getCart(sessionId);
}

export async function updateCartItem(
  sessionId: string,
  productId: string,
  quantity: number,
  variantSku?: string | null,
) {
  await connectToDatabase();
  const cart = await Cart.findOne({ sessionId });
  if (!cart) return getCart(sessionId);

  const matches = (item: { product: { toString(): string }; variantSku?: string | null }) =>
    item.product.toString() === productId && (item.variantSku ?? null) === (variantSku ?? null);

  if (quantity <= 0) {
    cart.items = cart.items.filter((item) => !matches(item));
  } else {
    if (quantity > 99) {
      throw new CartStockError("The maximum quantity per item is 99.", 99);
    }
    const existing = cart.items.find(matches);
    if (existing) {
      const product = await Product.findById(productId).select("stock variants").lean();
      const variant = variantSku
        ? product?.variants?.find((option) => option.sku === variantSku) ?? null
        : null;
      const available = variant?.stock ?? product?.stock ?? 0;
      if (quantity > available) {
        throw new CartStockError("The requested quantity is not available.", available);
      }
      existing.quantity = quantity;
    }
  }

  await cart.save();
  return getCart(sessionId);
}

export async function removeCartItem(
  sessionId: string,
  productId: string,
  variantSku?: string | null,
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { product: productId, variantSku: variantSku ?? null };
  await Cart.updateOne({ sessionId }, { $pull: { items: filter } });
  return getCart(sessionId);
}

export async function getWishlist(sessionId: string): Promise<WishlistResponse> {
  await connectToDatabase();
  const context: PricingContext = { campaigns: await getPricingCampaigns(), now: new Date() };
  const wishlist = (await Wishlist.findOne({ sessionId })
    .populate({ path: "products", populate: { path: "category" } })
    .lean()) as PopulatedWishlist | null;

  const items = (wishlist?.products ?? [])
    .filter(Boolean)
    .map((product) => {
      const serialized = serializeProduct(product as never);
      return withCartPricing(serialized, context);
    }) as ProductType[];

  return { items, count: items.length };
}

export async function addToWishlist(sessionId: string, productId: string) {
  await connectToDatabase();
  const product = await Product.findById(productId).select("_id").lean();
  if (!product) return null;

  await Wishlist.findOneAndUpdate(
    { sessionId },
    { $setOnInsert: { sessionId }, $addToSet: { products: product._id } },
    { upsert: true, new: true },
  );

  return getWishlist(sessionId);
}

export async function removeFromWishlist(sessionId: string, productId: string) {
  await connectToDatabase();
  await Wishlist.updateOne({ sessionId }, { $pull: { products: productId } });
  return getWishlist(sessionId);
}

export async function subscribeToNewsletter(email: string, source = "homepage") {
  await connectToDatabase();
  const normalized = email.trim().toLowerCase();
  const existing = await NewsletterSubscriber.findOne({ email: normalized }).lean();
  if (existing) {
    return { alreadySubscribed: true, pending: existing.status === "pending" };
  }

  const newsletter = await getSetting("newsletter");
  const status = newsletter.doubleOptIn ? "pending" : "active";
  await NewsletterSubscriber.create({
    email: normalized,
    status,
    source,
    unsubscribeToken: crypto.randomUUID(),
    confirmedAt: status === "active" ? new Date() : null,
  });

  return { alreadySubscribed: false, pending: status === "pending" };
}

function priceCartLine(product: ProductType, variantSku: string | null, context: PricingContext): PriceQuote {
  const variant = variantSku ? product.variants.find((option) => option.sku === variantSku) ?? null : null;
  return getEffectivePrice(
    { id: product.id, price: product.price, categoryId: product.category.id || null },
    variant,
    context,
  );
}

function withCartPricing(product: ProductType, context: PricingContext) {
  return {
    ...product,
    pricing: priceCartLine(product, null, context),
    variantPricing: Object.fromEntries(
      product.variants.map((variant) => [variant.sku, priceCartLine(product, variant.sku, context)]),
    ),
  };
}

export async function applyCartCoupon(sessionId: string, code: string) {
  await connectToDatabase();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false as const, error: "Enter a coupon code." };

  const quote = await loadCartQuote(sessionId, { couponCode: normalized });
  if (!quote.coupon) {
    return { ok: false as const, error: quote.couponError ?? "Coupon not found." };
  }
  if (quote.hasUnavailable || quote.hasStockIssue) {
    return { ok: false as const, error: "Resolve unavailable items before applying a coupon." };
  }

  await Cart.updateOne(
    { sessionId },
    { $set: { couponCode: normalized, couponAppliedAt: new Date() } },
    { upsert: true },
  );
  return { ok: true as const, cart: await getCart(sessionId) };
}

export async function removeCartCoupon(sessionId: string) {
  await connectToDatabase();
  await Cart.updateOne({ sessionId }, { $set: { couponCode: "", couponAppliedAt: null } });
  return getCart(sessionId);
}

export async function getProductPreview(productId: string) {
  await connectToDatabase();
  return populateProduct(productId);
}

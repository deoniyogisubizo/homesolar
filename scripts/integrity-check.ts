import dotenv from "dotenv";
dotenv.config({ path: ".env.test.local" });

import mongoose from "mongoose";

type ProductLean = { _id: unknown; category: unknown; stock: number; price: number; compareAtPrice: number | null };
type ReviewLean = { productId: unknown };
type CartItemLean = { productId: unknown };
type CartLean = { items: CartItemLean[] };
type OrderItemLean = { productId: unknown; lineTotal: number };
type OrderLean = { _id: unknown; items: OrderItemLean[]; campaignDiscount: number; couponDiscount: number; total: number };

async function main() {
  const uri = process.env.MONGODB_URI_TEST;
  if (!uri) throw new Error("MONGODB_URI_TEST is missing from .env.test.local");

  const dbName = (uri.match(/\/([^/?]+)(\?|$)/)?.[1] ?? "").split("/").pop() ?? "";
  if (dbName === "solar_store" || dbName === "homesolar") {
    throw new Error("Refusing to run integrity checks against the production database: MONGODB_URI_TEST points at solar_store");
  }

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  const db = conn.connection.db;

  const errors: string[] = [];
  const check = (name: string, fn: () => Promise<boolean>) =>
    fn().then((ok) => {
      console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
      if (!ok) errors.push(name);
    });

  const collectionNames = await db.listCollections().toArray().then((cols) => new Set(cols.map((c) => c.name)));
  const hasCollection = (name: string) => collectionNames.has(name);

  await check("products reference valid categories", async () => {
    const products = (await db.collection("products").find({}).toArray()) as ProductLean[];
    const categoryIds = new Set((await db.collection("categories").find({}).toArray()).map((c) => String(c._id)));
    return products.every((p) => p.category && categoryIds.has(String(p.category)));
  });

  await check("order items reference valid products", async () => {
    if (!hasCollection("orders")) return true;
    const orders = (await db.collection("orders").find({}).toArray()) as OrderLean[];
    const productIds = new Set((await db.collection("products").find({}).project({ _id: 1 }).toArray()).map((p) => String(p._id)));
    return orders.every((o) => o.items.every((item) => productIds.has(String(item.productId))));
  });

  await check("reviews reference valid products", async () => {
    const reviews = (await db.collection("reviews").find({}).toArray()) as ReviewLean[];
    const productIds = new Set((await db.collection("products").find({}).project({ _id: 1 }).toArray()).map((p) => String(p._id)));
    return reviews.every((r) => productIds.has(String(r.productId)));
  });

  await check("cart items reference valid products", async () => {
    const carts = (await db.collection("carts").find({}).toArray()) as CartLean[];
    const productIds = new Set((await db.collection("products").find({}).project({ _id: 1 }).toArray()).map((p) => String(p._id)));
    return carts.every((c) => c.items.every((item) => productIds.has(String(item.productId))));
  });

  await check("product slug unique index exists", async () => {
    const indexes = await db.collection("products").indexes();
    return indexes.some((idx) => JSON.stringify(idx.key) === JSON.stringify({ slug: 1 }) && idx.unique === true);
  });

  await check("product SKU unique index exists", async () => {
    const indexes = await db.collection("products").indexes();
    return indexes.some((idx) => JSON.stringify(idx.key) === JSON.stringify({ "variants.sku": 1 }) && idx.unique === true);
  });

  await check("order number unique index exists", async () => {
    if (!hasCollection("orders")) return true;
    const indexes = await db.collection("orders").indexes();
    return indexes.some((idx) => idx.key && Object.keys(idx.key).join(",") === "orderNumber" && idx.unique === true);
  });

  await check("idempotency key unique sparse index exists", async () => {
    if (!hasCollection("orders")) return true;
    const indexes = await db.collection("orders").indexes();
    const idx = indexes.find((i) => i.key && Object.keys(i.key).join(",") === "idempotencyKey");
    return idx?.unique === true && idx.sparse === true;
  });

  await check("coupon codeLower unique index exists", async () => {
    if (!hasCollection("coupons")) return true;
    const idx = await db.collection("coupons").indexes();
    const idx2 = idx.find((i) => i.key && Object.keys(i.key).join(",") === "codeLower");
    return idx2?.unique === true;
  });

await check("customer email unique index exists", async () => {
    if (!hasCollection("customers")) return true;
    const idx = await db.collection("customers").indexes();
    const idx2 = idx.find((i) => i.key && Object.keys(i.key).join(",") === "email");
    return idx2?.unique === true;
  });

  await check("no negative stock", async () => {
    const products = (await db.collection("products").find({}, { projection: { stock: 1 } }).toArray()) as ProductLean[];
    const bad = products.filter((p) => (p.stock ?? 0) < 0);
    return bad.length === 0;
  });

  await check("no negative prices", async () => {
    const products = (await db.collection("products").find({}, { projection: { price: 1, compareAtPrice: 1 } }).toArray()) as ProductLean[];
    return products.every((p) => p.price > 0 && (p.compareAtPrice === null || p.compareAtPrice === undefined || p.compareAtPrice > p.price));
  });

  await check("compareAtPrice greater than price when set", async () => {
    const products = (await db.collection("products").find({}, { projection: { price: 1, compareAtPrice: 1 } }).toArray()) as ProductLean[];
    return products.every((p) => !p.compareAtPrice || p.compareAtPrice > p.price);
  });

  await check("order totals equal sum of items minus discounts", async () => {
    if (!hasCollection("orders")) return true;
    const orders = (await db.collection("orders").find({}).toArray()) as OrderLean[];
    for (const order of orders) {
      const itemsTotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
      const computed = itemsTotal - (order.campaignDiscount ?? 0) - (order.couponDiscount ?? 0);
      if (Math.abs(computed - order.total) > 0.01) return false;
    }
    return true;
  });

  await mongoose.disconnect();

  if (errors.length) {
    console.error(`Integrity check FAILED with ${errors.length} issue(s):`);
    errors.forEach((e) => console.error(` - ${e}`));
    process.exit(1);
  }
  console.log("Integrity check: ALL CHECKS PASSED");
}

main().catch(async (error) => {
  console.error("Integrity check failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

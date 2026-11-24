import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product } from "../src/models/Product";
import { Category } from "../src/models/Category";

dotenv.config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from .env.local");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  console.log("Connected.");

  // Clear existing orders
  await Product.updateMany({}, { $set: { featuredOrder: null, bestSellerOrder: null } });
  console.log("Cleared existing featured/best-seller orders.");

  // Get all active categories with products
  const categories = await Category.find({ active: true }).select("_id name").lean();
  console.log(`Found ${categories.length} active categories.`);

  // ===== FEATURED: 1 per category (max 8) =====
  console.log("\n=== SELECTING FEATURED PRODUCTS ===");
  let featuredOrder = 0;
  const featuredProducts = [];

  for (const cat of categories) {
    if (featuredOrder >= 8) break; // Limit to 8 featured slots

    // Find best candidate: has image, highest price, good stock
    const candidate = await Product.findOne({
      category: cat._id,
      publishStatus: "active",
      "images.0.src": { $ne: "/images/products/component-placeholder.jpg" },
    })
      .sort({ price: -1, stock: -1 })
      .select("_id name price stock images")
      .lean();

    // Fallback: any active product in category
    const fallback = candidate || await Product.findOne({
      category: cat._id,
      publishStatus: "active",
    })
      .sort({ price: -1, stock: -1 })
      .select("_id name price stock images")
      .lean();

    if (fallback) {
      featuredOrder++;
      await Product.findByIdAndUpdate(fallback._id, { featuredOrder });
      featuredProducts.push({ ...fallback, category: cat.name, order: featuredOrder });
      console.log(`  ${featuredOrder}. ${fallback.name} (${cat.name}) - ${fallback.price} RWF`);
    }
  }

  // ===== BEST SELLERS: Top affordable components across categories =====
  console.log("\n=== SELECTING BEST SELLER PRODUCTS ===");
  // Price range 500-5000 RWF (typical component prices), good stock, variety
  const bestSellerCandidates = await Product.find({
    publishStatus: "active",
    price: { $gte: 500, $lte: 5000 },
    stock: { $gte: 100 },
  })
    .sort({ price: 1, stock: -1 }) // Affordable first, then high stock
    .limit(30)
    .select("_id name price stock category")
    .lean();

  // Diversify by category - max 3 per category
  const categoryCount = new Map<string, number>();
  let bestSellerOrder = 0;
  const bestSellerProducts = [];

  for (const product of bestSellerCandidates) {
    if (bestSellerOrder >= 12) break; // Limit to 12 best sellers

    const catName = categories.find(c => c._id.equals(product.category))?.name || "Unknown";
    const count = categoryCount.get(catName) || 0;
    
    if (count >= 3) continue; // Max 3 per category

    bestSellerOrder++;
    await Product.findByIdAndUpdate(product._id, { bestSellerOrder });
    categoryCount.set(catName, count + 1);
    bestSellerProducts.push({ ...product, category: catName, order: bestSellerOrder });
    console.log(`  ${bestSellerOrder}. ${product.name} (${catName}) - ${product.price} RWF - Stock: ${product.stock}`);
  }

  // ===== VERIFICATION =====
  console.log("\n=== VERIFICATION ===");
  const featuredCount = await Product.countDocuments({ featuredOrder: { $ne: null } });
  const bestSellerCount = await Product.countDocuments({ bestSellerOrder: { $ne: null } });
  console.log(`Featured products: ${featuredCount}`);
  console.log(`Best seller products: ${bestSellerCount}`);

  // Show final lists
  console.log("\n--- FEATURED (homepage hero) ---");
  const featured = await Product.find({ featuredOrder: { $ne: null } })
    .sort({ featuredOrder: 1 })
    .select("name featuredOrder price stock");
  featured.forEach(p => console.log(`  ${p.featuredOrder}. ${p.name} - ${p.price} RWF`));

  console.log("\n--- BEST SELLERS (homepage section) ---");
  const bestSellers = await Product.find({ bestSellerOrder: { $ne: null } })
    .sort({ bestSellerOrder: 1 })
    .select("name bestSellerOrder price stock");
  bestSellers.forEach(p => console.log(`  ${p.bestSellerOrder}. ${p.name} - ${p.price} RWF`));

  await mongoose.disconnect();
  console.log("\nDone!");
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
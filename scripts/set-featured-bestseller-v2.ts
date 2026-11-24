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

  // ===== FEATURED: Category-balanced, prioritize real images + higher price =====
  console.log("\n=== SELECTING FEATURED PRODUCTS (v2) ===");
  let featuredOrder = 0;
  const MAX_FEATURED = 8;

  for (const cat of categories) {
    if (featuredOrder >= MAX_FEATURED) break;

    // First try: has real image (not placeholder), price > 1000
    let candidate = await Product.findOne({
      category: cat._id,
      publishStatus: "active",
      "images.0.src": { $ne: "/images/products/component-placeholder.jpg" },
      price: { $gt: 1000 },
    })
      .sort({ price: -1, stock: -1 })
      .select("_id name price stock images")
      .lean();

    // Second try: has real image, any price
    if (!candidate) {
      candidate = await Product.findOne({
        category: cat._id,
        publishStatus: "active",
        "images.0.src": { $ne: "/images/products/component-placeholder.jpg" },
      })
        .sort({ price: -1, stock: -1 })
        .select("_id name price stock images")
        .lean();
    }

    // Third try: highest price, good stock
    if (!candidate) {
      candidate = await Product.findOne({
        category: cat._id,
        publishStatus: "active",
        price: { $gt: 500 },
        stock: { $gte: 100 },
      })
        .sort({ price: -1, stock: -1 })
        .select("_id name price stock images")
        .lean();
    }

    // Last resort: any active product
    if (!candidate) {
      candidate = await Product.findOne({
        category: cat._id,
        publishStatus: "active",
      })
        .sort({ price: -1, stock: -1 })
        .select("_id name price stock images")
        .lean();
    }

    if (candidate) {
      // Skip very cheap items for featured (unless it's the only option)
      if (candidate.price < 500 && featuredOrder > 0) {
        console.log(`  Skipping ${candidate.name} (${cat.name}) - too cheap at ${candidate.price} RWF`);
        continue;
      }
      
      featuredOrder++;
      await Product.findByIdAndUpdate(candidate._id, { featuredOrder });
      console.log(`  ${featuredOrder}. ${candidate.name} (${cat.name}) - ${candidate.price} RWF ${candidate.images[0]?.src !== "/images/products/component-placeholder.jpg" ? "✓IMG" : ""}`);
    }
  }

  // ===== BEST SELLERS: Balanced price tiers, category diversity, high stock =====
  console.log("\n=== SELECTING BEST SELLER PRODUCTS (v2) ===");
  const MAX_BEST_SELLERS = 12;

  // Get candidates in 3 price tiers
  const [budget, midRange, premium] = await Promise.all([
    // Budget: 500-1500 RWF (common components)
    Product.find({
      publishStatus: "active",
      price: { $gte: 500, $lte: 1500 },
      stock: { $gte: 150 },
    }).sort({ stock: -1 }).limit(20).select("_id name price stock category").lean(),
    
    // Mid-range: 1500-3500 RWF
    Product.find({
      publishStatus: "active",
      price: { $gt: 1500, $lte: 3500 },
      stock: { $gte: 100 },
    }).sort({ stock: -1 }).limit(15).select("_id name price stock category").lean(),
    
    // Premium: 3500+ RWF
    Product.find({
      publishStatus: "active",
      price: { $gt: 3500 },
      stock: { $gte: 50 },
    }).sort({ stock: -1 }).limit(10).select("_id name price stock category").lean(),
  ]);

  console.log(`Candidates: ${budget.length} budget, ${midRange.length} mid-range, ${premium.length} premium`);

  // Mix: 5 budget, 5 mid-range, 2 premium (adjust based on availability)
  const mixedCandidates = [
    ...budget.slice(0, 6),
    ...midRange.slice(0, 6),
    ...premium.slice(0, 3),
  ];

  // Diversify by category - max 2 per category
  const categoryCount = new Map<string, number>();
  let bestSellerOrder = 0;
  const bestSellerProducts = [];

  for (const product of mixedCandidates) {
    if (bestSellerOrder >= MAX_BEST_SELLERS) break;

    const catName = categories.find(c => c._id.equals(product.category))?.name || "Unknown";
    const count = categoryCount.get(catName) || 0;
    
    if (count >= 2) continue; // Max 2 per category for best sellers

    bestSellerOrder++;
    await Product.findByIdAndUpdate(product._id, { bestSellerOrder });
    categoryCount.set(catName, count + 1);
    bestSellerProducts.push({ ...product, category: catName, order: bestSellerOrder });
    
    const tier = product.price <= 1500 ? "BUDGET" : product.price <= 3500 ? "MID" : "PREMIUM";
    console.log(`  ${bestSellerOrder}. ${product.name} (${catName}) - ${product.price} RWF [${tier}] Stock: ${product.stock}`);
  }

  // ===== VERIFICATION =====
  console.log("\n=== VERIFICATION ===");
  const featuredCount = await Product.countDocuments({ featuredOrder: { $ne: null } });
  const bestSellerCount = await Product.countDocuments({ bestSellerOrder: { $ne: null } });
  console.log(`Featured products: ${featuredCount}`);
  console.log(`Best seller products: ${bestSellerCount}`);

  // Show final lists with details
  console.log("\n--- FEATURED (homepage hero/side) ---");
  const featured = await Product.find({ featuredOrder: { $ne: null } })
    .sort({ featuredOrder: 1 })
    .select("name featuredOrder price stock images");
  featured.forEach(p => {
    const hasRealImg = p.images[0]?.src !== "/images/products/component-placeholder.jpg";
    console.log(`  ${p.featuredOrder}. ${p.name} - ${p.price} RWF - Stock: ${p.stock} ${hasRealImg ? "✓" : "✗IMG"}`);
  });

  console.log("\n--- BEST SELLERS (homepage section) ---");
  const bestSellers = await Product.find({ bestSellerOrder: { $ne: null } })
    .sort({ bestSellerOrder: 1 })
    .select("name bestSellerOrder price stock");
  bestSellers.forEach(p => console.log(`  ${p.bestSellerOrder}. ${p.name} - ${p.price} RWF - Stock: ${p.stock}`));

  await mongoose.disconnect();
  console.log("\nDone!");
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
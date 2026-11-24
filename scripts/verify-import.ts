import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product } from "../src/models/Product";
import { Category } from "../src/models/Category";

dotenv.config({ path: ".env.local" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Check categories
  const categories = await Category.find().sort({ name: 1 }).select("name slug _id");
  console.log("Categories:");
  categories.forEach(c => console.log(`  ${c.name} (${c.slug}) - ${c._id}`));

  // Check products per category
  console.log("\nProducts per category:");
  for (const cat of categories) {
    const count = await Product.countDocuments({ category: cat._id });
    const active = await Product.countDocuments({ category: cat._id, publishStatus: "active" });
    const draft = await Product.countDocuments({ category: cat._id, publishStatus: "draft" });
    const archived = await Product.countDocuments({ category: cat._id, publishStatus: "archived" });
    console.log(`  ${cat.name}: ${count} total (${active} active, ${draft} draft, ${archived} archived)`);
  }

  // Sample products
  console.log("\nSample products:");
  const samples = await Product.find().limit(5).select("name slug price stock status publishStatus category");
  for (const p of samples) {
    const cat = await Category.findById(p.category).select("name");
    console.log(`  ${p.name} (${p.slug}) - ${p.price} RWF - Stock: ${p.stock} (${p.status}) - ${p.publishStatus} - Cat: ${cat?.name}`);
  }

  // Check products with real images
  console.log("\nProducts with images (not placeholder):");
  const withImages = await Product.find({ "images.0.src": { $ne: "/images/products/component-placeholder.jpg" } }).limit(5).select("name images");
  for (const p of withImages) {
    console.log(`  ${p.name}: ${p.images[0].src}`);
  }

  // Check stock distribution
  console.log("\nStock distribution:");
  const inStock = await Product.countDocuments({ status: "in_stock" });
  const lowStock = await Product.countDocuments({ status: "low_stock" });
  const outOfStock = await Product.countDocuments({ status: "out_of_stock" });
  console.log(`  In stock: ${inStock}`);
  console.log(`  Low stock: ${lowStock}`);
  console.log(`  Out of stock: ${outOfStock}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
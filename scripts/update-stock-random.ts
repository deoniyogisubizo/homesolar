import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product } from "../src/models/Product";
import { InventoryMovement } from "../src/models/InventoryMovement";

dotenv.config({ path: ".env.local" });

function randomStock(min: number = 50, max: number = 500): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from .env.local");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  console.log("Connected.");

  const products = await Product.find({}).select("_id name stock status lowStockThreshold variants");
  console.log(`Found ${products.length} products to update.`);

  let updated = 0;
  const movements = [];

  for (const product of products) {
    const newStock = randomStock(50, 500);
    const oldStock = product.stock;
    const delta = newStock - oldStock;

    // Determine new status
    let status: "in_stock" | "low_stock" | "out_of_stock";
    const threshold = product.lowStockThreshold ?? 5;
    if (newStock <= 0) status = "out_of_stock";
    else if (newStock <= threshold) status = "low_stock";
    else status = "in_stock";

    // Update product
    product.stock = newStock;
    product.status = status;
    await product.save();

    // Create inventory movement record
    movements.push({
      productId: product._id,
      variantSku: null,
      delta,
      stockAfter: newStock,
      reason: "restock",
      note: `Bulk restock - randomized stock to ${newStock}`,
      actorId: null,
      actorEmail: "system@seed",
    });

    // Also update variants if any
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        const variantStock = randomStock(50, 200);
        const variantDelta = variantStock - variant.stock;
        variant.stock = variantStock;
        
        movements.push({
          productId: product._id,
          variantSku: variant.sku,
          delta: variantDelta,
          stockAfter: variantStock,
          reason: "restock",
          note: `Bulk restock - variant randomized stock to ${variantStock}`,
          actorId: null,
          actorEmail: "system@seed",
        });
      }
      await product.save(); // Save variants
    }

    updated++;
    if (updated % 20 === 0) {
      console.log(`  Updated ${updated}/${products.length} products...`);
    }
  }

  // Insert all inventory movements
  if (movements.length > 0) {
    console.log(`\nCreating ${movements.length} inventory movement records...`);
    await InventoryMovement.insertMany(movements);
  }

  console.log(`\n=== STOCK UPDATE COMPLETE ===`);
  console.log(`Products updated: ${updated}`);
  console.log(`Inventory movements created: ${movements.length}`);

  // Verify
  const inStock = await Product.countDocuments({ status: "in_stock" });
  const lowStock = await Product.countDocuments({ status: "low_stock" });
  const outOfStock = await Product.countDocuments({ status: "out_of_stock" });
  console.log(`\nStock distribution:`);
  console.log(`  In stock: ${inStock}`);
  console.log(`  Low stock: ${lowStock}`);
  console.log(`  Out of stock: ${outOfStock}`);

  // Show sample
  const samples = await Product.find().limit(5).select("name stock status");
  console.log(`\nSample products:`);
  samples.forEach(p => console.log(`  ${p.name}: ${p.stock} (${p.status})`));

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
}

main().catch((error) => {
  console.error("Stock update failed:", error);
  process.exit(1);
});
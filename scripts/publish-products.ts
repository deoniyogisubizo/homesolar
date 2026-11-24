import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product } from "../src/models/Product";

dotenv.config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from .env.local");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  console.log("Connected.");

  // Count current statuses
  const draftCount = await Product.countDocuments({ publishStatus: "draft" });
  const activeCount = await Product.countDocuments({ publishStatus: "active" });
  const archivedCount = await Product.countDocuments({ publishStatus: "archived" });
  console.log(`Current status: ${draftCount} draft, ${activeCount} active, ${archivedCount} archived`);

  // Update all draft products to active (except archived)
  const result = await Product.updateMany(
    { publishStatus: "draft" },
    { 
      $set: { 
        publishStatus: "active",
        archivedAt: null 
      } 
    }
  );

  console.log(`\nUpdated ${result.modifiedCount} products from draft to active`);

  // Verify
  const newActiveCount = await Product.countDocuments({ publishStatus: "active" });
  const newDraftCount = await Product.countDocuments({ publishStatus: "draft" });
  console.log(`New status: ${newDraftCount} draft, ${newActiveCount} active, ${archivedCount} archived`);

  // Show sample active products
  const samples = await Product.find({ publishStatus: "active" }).limit(5).select("name slug price stock status publishStatus");
  console.log(`\nSample active products:`);
  samples.forEach(p => console.log(`  ${p.name} (${p.slug}) - ${p.price} RWF - Stock: ${p.stock} (${p.status})`));

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
}

main().catch((error) => {
  console.error("Publish failed:", error);
  process.exit(1);
});
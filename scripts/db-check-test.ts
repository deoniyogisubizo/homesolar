import dotenv from "dotenv";
dotenv.config({ path: ".env.test.local" });

import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI_TEST;
  if (!uri) throw new Error("MONGODB_URI_TEST is missing from .env.test.local");

  const dbName = (uri.match(/\/([^/?]+)(\?|$)/)?.[1] ?? "").split("/").pop() ?? "";
  if (dbName === "solar_store" || dbName === "homesolar") {
    throw new Error("Refusing to run against the production database: MONGODB_URI_TEST points at solar_store");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log(`Connected to test database: ${db.databaseName}`);
  console.log(`Collections (${collections.length}): ${collections.map((c) => c.name).join(", ") || "(none)"}`);

  const adminUser = await db.collection("adminusers").findOne({ email: "admin@solarhome.com" });
  console.log("Admin user present:", Boolean(adminUser));

  const categories = await db.collection("categories").countDocuments();
  const products = await db.collection("products").countDocuments();
  console.log(`categories=${categories} products=${products}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Test DB check failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

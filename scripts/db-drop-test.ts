import dotenv from "dotenv";
dotenv.config({ path: ".env.test.local" });

import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI_TEST;
  if (!uri) throw new Error("MONGODB_URI_TEST is missing from .env.test.local");

  if (uri.includes("/solar_store?") || uri.endsWith("/solar_store")) {
    throw new Error("Refusing to drop the production database: MONGODB_URI_TEST points at solar_store");
  }

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  const db = conn.connection.db;
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
  console.log(`Dropped all collections in test database: ${db.databaseName}`);
  await conn.disconnect();
}

main().catch(async (error) => {
  console.error("Test DB drop failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

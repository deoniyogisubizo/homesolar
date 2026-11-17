import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from .env.local");

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  const db = conn.connection.db;
  if (!db) throw new Error("No database handle");

  const ping = await db.admin().ping();
  const collections = await db.listCollections().toArray();
  console.log(`Connected to MongoDB: ${db.databaseName}`);
  console.log(`Ping: ${JSON.stringify(ping)}`);
  console.log(`Collections: ${collections.map((c) => c.name).join(", ") || "(none)"}`);
  await conn.disconnect();
}

main().catch(async (error) => {
  console.error("MongoDB check failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

import dotenv from "dotenv";

dotenv.config({ path: ".env.test.local" });

const uri = process.env.MONGODB_URI_TEST;
if (!uri) throw new Error("MONGODB_URI_TEST is missing from .env.test.local");

if (uri.includes("/solar_store?") || uri.endsWith("/solar_store")) {
  throw new Error("Refusing to seed the production database: MONGODB_URI_TEST points at solar_store");
}

process.env.MONGODB_URI = uri;

import("./seed").catch((error: unknown) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

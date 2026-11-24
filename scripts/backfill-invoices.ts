import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import type { Types } from "mongoose";
import { Invoice } from "../src/models/Invoice";
import { issueOrderInvoice } from "../src/lib/invoices";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from .env.local");

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  const db = conn.connection.db;

  const orderIds = await db
    .collection("orders")
    .find({ status: { $ne: "cancelled" } })
    .project({ _id: 1 })
    .toArray();

  let issued = 0;
  for (const order of orderIds) {
    const existing = await Invoice.findOne({ orderId: order._id as Types.ObjectId }).sort({ revision: -1 }).lean();
    if (existing) continue;
    await issueOrderInvoice(String(order._id));
    issued += 1;
  }

  console.log(`Backfilled ${issued} invoices. Total invoices: ${await Invoice.countDocuments({})}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

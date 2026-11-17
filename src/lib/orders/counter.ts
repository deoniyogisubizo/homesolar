import { connectToDatabase } from "@/lib/mongodb";
import { OrderCounter } from "@/models/OrderCounter";

export function normalizeOrderPrefix(prefix: string) {
  const value = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return value || "SH";
}

export async function generateOrderNumber(prefix = "SH"): Promise<string> {
  await connectToDatabase();
  const key = normalizeOrderPrefix(prefix);
  const counter = await OrderCounter.findOneAndUpdate(
    { prefix: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `${key}-${String(counter.seq).padStart(6, "0")}`;
}

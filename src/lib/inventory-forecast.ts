import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { InventoryForecast } from "@/models/InventoryForecast";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { inventory } = COMMERCE_CONFIG;

interface SalesData {
  productId: Types.ObjectId;
  dailySales: Map<string, number>;
}

async function getSalesData(windowDays: number): Promise<SalesData[]> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const sales = await Order.aggregate<{ _id: { productId: Types.ObjectId; date: string }; quantity: number }>([
    { $match: { createdAt: { $gte: windowStart }, status: { $in: ["delivered", "confirmed"] } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          productId: "$items.productId",
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        },
        quantity: { $sum: "$items.quantity" },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]).exec();

  const byProduct = new Map<string, SalesData>();
  for (const sale of sales) {
    const key = sale._id.productId.toString();
    if (!byProduct.has(key)) {
      byProduct.set(key, { productId: sale._id.productId, dailySales: new Map() });
    }
    byProduct.get(key)!.dailySales.set(sale._id.date, sale.quantity);
  }

  return Array.from(byProduct.values());
}

function calculateWeightedVelocity(dailySales: Map<string, number>, windows: readonly number[]): number {
  const today = new Date();
  const last7Days: number[] = [];
  const last14Days: number[] = [];
  const last30Days: number[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i - 1);
    const key = date.toISOString().split("T")[0];
    const qty = dailySales.get(key) ?? 0;

    if (i < 7) last7Days.push(qty);
    if (i < 14) last14Days.push(qty);
    last30Days.push(qty);
  }

  const avg7 = last7Days.reduce((a, b) => a + b, 0) / 7;
  const avg14 = last14Days.reduce((a, b) => a + b, 0) / 14;
  const avg30 = last30Days.reduce((a, b) => a + b, 0) / 30;

  const [w7, w14, w30] = inventory.velocityWeights;
  return avg7 * w7 + avg14 * w14 + avg30 * w30;
}

export async function computeInventoryForecasts(): Promise<{ updated: number; alerts: number }> {
  await connectToDatabase();

  const products = await Product.find({ publishStatus: "active" })
    .select("_id stock lowStockThreshold")
    .lean();

  const productIds = products.map((p) => p._id);
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const salesData30 = await getSalesData(30);

  const bulkOps: Array<{
    updateOne: {
      filter: { productId: Types.ObjectId };
      update: { $set: Record<string, unknown> };
      upsert: boolean;
    };
  }> = [];

  let alerts = 0;

  for (const sales of salesData30) {
    const product = productMap.get(sales.productId.toString());
    if (!product) continue;

    const velocity7d = calculateVelocity(sales.dailySales, 7);
    const velocity14d = calculateVelocity(sales.dailySales, 14);
    const velocity30d = calculateVelocity(sales.dailySales, 30);
    const weightedVelocity = calculateWeightedVelocity(sales.dailySales, inventory.velocityWindows);

    const stock = product.stock ?? 0;
    const daysOfStockLeft = weightedVelocity > 0 ? stock / weightedVelocity : Infinity;
    const leadDays = 14;
    const safetyStock = weightedVelocity * inventory.safetyStockDays;
    const reorderPoint = weightedVelocity * leadDays + safetyStock;
    const suggestedReorderQty = Math.ceil(reorderPoint * inventory.restockSuggestionBuffer);
    const alert = daysOfStockLeft < leadDays && stock > 0;

    if (alert) alerts++;

    bulkOps.push({
      updateOne: {
        filter: { productId: sales.productId },
        update: {
          $set: {
            velocity7d,
            velocity14d,
            velocity30d,
            weightedVelocity,
            daysOfStockLeft: isFinite(daysOfStockLeft) ? daysOfStockLeft : 999,
            reorderPoint,
            suggestedReorderQty,
            supplierLeadDays: leadDays,
            safetyStock,
            alert,
            computedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  for (const product of products) {
    if (!salesData30.some((s) => s.productId.equals(product._id))) {
      const stock = product.stock ?? 0;
      const leadDays = 14;
      const safetyStock = 0;
      const reorderPoint = safetyStock;
      const alert = stock <= (product.lowStockThreshold ?? inventory.lowStockThreshold);

      if (alert) alerts++;

      bulkOps.push({
        updateOne: {
          filter: { productId: product._id },
          update: {
            $set: {
              velocity7d: 0,
              velocity14d: 0,
              velocity30d: 0,
              weightedVelocity: 0,
              daysOfStockLeft: stock > 0 ? 999 : 0,
              reorderPoint,
              suggestedReorderQty: 0,
              supplierLeadDays: leadDays,
              safetyStock,
              alert,
              computedAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }
  }

  let updated = 0;
  if (bulkOps.length > 0) {
    const result = await InventoryForecast.bulkWrite(bulkOps, { ordered: false });
    updated = result.upsertedCount + result.modifiedCount;
  }

  return { updated, alerts };
}

function calculateVelocity(dailySales: Map<string, number>, days: number): number {
  const today = new Date();
  let total = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i - 1);
    const key = date.toISOString().split("T")[0];
    total += dailySales.get(key) ?? 0;
  }

  return total / days;
}

export async function getRestockSuggestions(): Promise<Array<{
  productId: Types.ObjectId;
  name: string;
  stock: number;
  velocity: number;
  daysLeft: number;
  suggestedQty: number;
  leadDays: number;
}>> {
  await connectToDatabase();

  const forecasts = await InventoryForecast.find({ alert: true, daysOfStockLeft: { $lt: 999 } })
    .sort({ daysOfStockLeft: 1 })
    .lean();

  const productIds = forecasts.map((f) => f.productId);
  const products = await Product.find({ _id: { $in: productIds } }).select("name stock").lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  return forecasts.map((f) => {
    const product = productMap.get(f.productId.toString());
    return {
      productId: f.productId,
      name: product?.name ?? "Unknown",
      stock: product?.stock ?? 0,
      velocity: f.weightedVelocity,
      daysLeft: f.daysOfStockLeft,
      suggestedQty: f.suggestedReorderQty,
      leadDays: f.supplierLeadDays,
    };
  });
}

export async function shouldShowLowStock(productId: Types.ObjectId): Promise<boolean> {
  await connectToDatabase();

  const forecast = await InventoryForecast.findOne({ productId }).lean();
  if (!forecast) return false;

  return forecast.daysOfStockLeft <= 5 && forecast.daysOfStockLeft > 0;
}
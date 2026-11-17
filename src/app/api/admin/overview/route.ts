import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Customer } from "@/models/Customer";
import { getSetting } from "@/lib/admin/settings";
import { REVENUE_STATUSES } from "@/lib/admin/order-status";
import { getOrderReportMetrics } from "@/lib/admin/report-data";

async function getInventorySummary() {
  const summary = await Product.aggregate<{
    _id: null;
    units: number;
    value: number;
    low: number;
    out: number;
  }>([
    { $match: { publishStatus: { $ne: "archived" } } },
    {
      $group: {
        _id: null,
        units: { $sum: "$stock" },
        value: { $sum: { $multiply: ["$stock", "$price"] } },
        low: { $sum: { $cond: [{ $lt: ["$stock", 10] }, 1, 0] } },
        out: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
      },
    },
  ]);
  return summary[0] ?? { units: 0, value: 0, low: 0, out: 0 };
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "7d";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    let from: Date;
    let to = now;

    if (period === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "7d") {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30d") {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "custom" && fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
    } else {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const prevFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));
    const prevTo = from;

    const general = await getSetting("general");
    const currencySymbol = general.currencySymbol ?? "RWF";

    const [current, previous] = await Promise.all([
      getOrderReportMetrics(from, to),
      getOrderReportMetrics(prevFrom, prevTo),
    ]);

    const revenue = current.revenue;
    const prevRevenue = previous.revenue;
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    const orders = current.totalOrders;
    const prevOrdersCount = previous.totalOrders;
    const ordersChange = prevOrdersCount > 0 ? ((orders - prevOrdersCount) / prevOrdersCount) * 100 : 0;

    const avgOrderValue = current.averageOrderValue;
    const prevAvgOrderValue = previous.averageOrderValue;
    const aovChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0;

    const [newCustomers, prevNewCustomers] = await Promise.all([
      Customer.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      Customer.countDocuments({ createdAt: { $gte: prevFrom, $lte: prevTo } }),
    ]);
    const customersChange = prevNewCustomers > 0 ? ((newCustomers - prevNewCustomers) / prevNewCustomers) * 100 : 0;

    const [newsletterSubs, prevNewsletterSubs, inventorySummary] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: from, $lte: to }, "customer.email": { $ne: "" } }),
      Order.countDocuments({ createdAt: { $gte: prevFrom, $lte: prevTo }, "customer.email": { $ne: "" } }),
      getInventorySummary(),
    ]);
    const newsletterChange = prevNewsletterSubs > 0 ? ((newsletterSubs - prevNewsletterSubs) / prevNewsletterSubs) * 100 : 0;

    const salesOverTime = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: { $in: REVENUE_STATUSES },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", revenue: 1, orders: 1, _id: 0 } },
    ]);

    const ordersByStatus = current.statusCounts.map((entry) => ({
      status: entry.status,
      count: entry.count,
    }));

    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: { $in: REVENUE_STATUSES },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          revenue: { $sum: "$items.lineTotal" },
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $project: { name: "$_id", revenue: 1, quantity: 1, _id: 0 } },
    ]);

    const salesByCategory = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: { $in: REVENUE_STATUSES },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $project: { category: { $ifNull: ["$category.name", "Uncategorised"] }, revenue: 1, _id: 0 } },
      { $sort: { revenue: -1 } },
    ]);

    return Response.json({
      ok: true,
      revenue,
      revenueChange,
      orders,
      ordersChange,
      avgOrderValue,
      aovChange,
      newCustomers,
      customersChange,
      newsletterSubs,
      newsletterChange,
      stockUnits: inventorySummary.units,
      stockValue: inventorySummary.value,
      lowStockCount: inventorySummary.low,
      outOfStockCount: inventorySummary.out,
      salesOverTime,
      ordersByStatus,
      topProducts,
      salesByCategory,
      whatsappOrders: current.whatsappOrders,
      confirmedOrders: current.confirmedOrders,
      revenueOrders: current.revenueOrders,
      conversion: current.conversion,
      currencySymbol,
    });
  } catch {
    return Response.json({ ok: false, error: "Failed to load overview data" }, { status: 500 });
  }
}
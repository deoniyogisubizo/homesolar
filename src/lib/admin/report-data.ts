import "server-only";

import { Order } from "@/models/Order";
import {
  ORDER_STATUSES,
  REVENUE_STATUSES,
  type OrderStatus,
} from "@/lib/admin/order-status";

export type OrderReportMetrics = {
  totalOrders: number;
  whatsappOrders: number;
  confirmedOrders: number;
  revenueOrders: number;
  revenue: number;
  averageOrderValue: number;
  conversion: number;
  statusCounts: Array<{ status: OrderStatus; count: number }>;
};

export async function getOrderReportMetrics(from: Date, to: Date): Promise<OrderReportMetrics> {
  const match = { createdAt: { $gte: from, $lte: to } };
  const [statusSummary, whatsappOrders, confirmedOrders, revenueSummary] = await Promise.all([
    Order.aggregate<{ _id: OrderStatus; count: number }>([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ ...match, channel: "whatsapp" }),
    Order.countDocuments({ ...match, "statusHistory.status": "confirmed" }),
    Order.aggregate<{ _id: null; orders: number; revenue: number }>([
      { $match: { ...match, status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]),
  ]);

  const countMap = new Map(statusSummary.map((entry) => [entry._id, entry.count]));
  const statusCounts = ORDER_STATUSES.map((status) => ({
    status,
    count: countMap.get(status) ?? 0,
  }));
  const totalOrders = statusCounts.reduce((sum, entry) => sum + entry.count, 0);
  const revenue = revenueSummary[0]?.revenue ?? 0;
  const revenueOrders = revenueSummary[0]?.orders ?? 0;

  return {
    totalOrders,
    whatsappOrders,
    confirmedOrders,
    revenueOrders,
    revenue,
    averageOrderValue: revenueOrders > 0 ? revenue / revenueOrders : 0,
    conversion: totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0,
    statusCounts,
  };
}

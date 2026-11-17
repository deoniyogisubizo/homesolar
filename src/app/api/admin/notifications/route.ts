import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Message } from "@/models/Message";
import { Review } from "@/models/Review";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });

  await connectToDatabase();
  const [orders, lowStock, messages, reviews] = await Promise.all([
    can(session.role, "orders:read")
      ? Order.find({ status: "new" }).sort({ createdAt: -1 }).limit(4).select("orderNumber customer createdAt").lean()
      : [],
    can(session.role, "inventory:read")
      ? Product.find({ publishStatus: { $ne: "archived" }, stock: { $lte: 5 } })
          .sort({ stock: 1 })
          .limit(4)
          .select("name stock")
          .lean()
      : [],
    can(session.role, "messages:read")
      ? Message.find({ status: "new" }).sort({ createdAt: -1 }).limit(4).select("name subject createdAt").lean()
      : [],
    can(session.role, "reviews:read")
      ? Review.find({ status: "pending" }).sort({ createdAt: -1 }).limit(4).select("author createdAt productId").lean()
      : [],
  ]);

  const [orderCount, stockCount, messageCount, reviewCount] = await Promise.all([
    can(session.role, "orders:read") ? Order.countDocuments({ status: "new" }) : 0,
    can(session.role, "inventory:read")
      ? Product.countDocuments({ publishStatus: { $ne: "archived" }, stock: { $lte: 5 } })
      : 0,
    can(session.role, "messages:read") ? Message.countDocuments({ status: "new" }) : 0,
    can(session.role, "reviews:read") ? Review.countDocuments({ status: "pending" }) : 0,
  ]);

  const items = [
    ...orders.map((order) => ({
      id: `order-${order._id}`,
      label: `New order ${order.orderNumber}`,
      sub: `${order.customer.name} · ${(order.createdAt ?? new Date()).toISOString().slice(0, 10)}`,
      href: `/admin/orders/${order._id}`,
      at: (order.createdAt ?? new Date()).toISOString(),
    })),
    ...lowStock.map((product) => ({
      id: `stock-${product._id}`,
      label: `Low stock: ${product.name}`,
      sub: `${product.stock} remaining`,
      href: `/admin/inventory?q=${encodeURIComponent(product.name)}`,
      at: "",
    })),
    ...messages.map((message) => ({
      id: `message-${message._id}`,
      label: `New message from ${message.name}`,
      sub: message.subject,
      href: `/admin/messages/${message._id}`,
      at: (message.createdAt ?? new Date()).toISOString(),
    })),
    ...reviews.map((review) => ({
      id: `review-${review._id}`,
      label: `Review from ${review.author}`,
      sub: "Awaiting moderation",
      href: "/admin/reviews?status=pending",
      at: (review.createdAt ?? new Date()).toISOString(),
    })),
  ].slice(0, 12);

  return NextResponse.json({
    ok: true,
    data: {
      orders: orderCount,
      lowStock: stockCount,
      messages: messageCount,
      reviews: reviewCount,
      items,
    },
  });
}

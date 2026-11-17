import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (!query) return NextResponse.json({ ok: true, data: { groups: [] } });

  await connectToDatabase();
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const groups: Array<{ group: string; items: Array<{ id: string; label: string; sub: string; href: string }> }> = [];

  if (can(session.role, "orders:read")) {
    const orders = await Order.find({
      $or: [
        { orderNumber: pattern },
        { "customer.name": pattern },
        { "customer.phone": pattern },
        { "customer.email": pattern },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber customer total status createdAt")
      .lean();

    if (orders.length) {
      groups.push({
        group: "Orders",
        items: orders.map((order) => ({
          id: String(order._id),
          label: order.orderNumber,
          sub: `${order.customer.name} · ${order.customer.phone}`,
          href: `/admin/orders/${order._id}`,
        })),
      });
    }
  }

  if (can(session.role, "products:read")) {
    const products = await Product.find({ $or: [{ name: pattern }, { slug: pattern }, { tags: pattern }] })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("name slug price publishStatus")
      .lean();

    if (products.length) {
      groups.push({
        group: "Products",
        items: products.map((product) => ({
          id: String(product._id),
          label: product.name,
          sub: product.publishStatus,
          href: `/admin/products/${product._id}`,
        })),
      });
    }
  }

  if (can(session.role, "customers:read")) {
    const customers = await Customer.find({ $or: [{ name: pattern }, { email: pattern }, { phone: pattern }] })
      .sort({ lastOrderAt: -1 })
      .limit(5)
      .select("name email phone orderCount")
      .lean();

    if (customers.length) {
      groups.push({
        group: "Customers",
        items: customers.map((customer) => ({
          id: String(customer._id),
          label: customer.name,
          sub: customer.email || customer.phone,
          href: `/admin/customers/${customer._id}`,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true, data: { groups } });
}

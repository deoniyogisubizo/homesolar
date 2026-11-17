"use server";

import { getCustomerSession } from "@/lib/auth/customer";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Wishlist } from "@/models/Wishlist";
import { Review } from "@/models/Review";
import { Message } from "@/models/Message";
import { Product } from "@/models/Product";
import { Campaign } from "@/models/Campaign";
import { getSetting } from "@/lib/admin/settings";
import { canTransition } from "@/lib/admin/order-status";
import { restoreOrderStock } from "@/lib/orders/stock";
import { ensureSessionId } from "@/lib/session";
import { addToCart } from "@/lib/store";
import {
  actionError,
  actionOk,
  fieldErrorsFromZod,
  runAction,
  type ActionResult,
} from "@/lib/admin/action-result";
import {
  customerAddressIdSchema,
  customerAddressSchema,
} from "@/schemas/customers";
import { revalidatePath } from "next/cache";

function formatMoney(value: number, symbol: string) {
  return `${symbol} ${value.toLocaleString("en-US")}`;
}

function isoDate(value?: Date | null) {
  return (value ?? new Date()).toISOString();
}

export async function getCustomerOverview(): Promise<ActionResult<{
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    formattedTotal: string;
    createdAt: string;
    itemsCount: number;
  }>;
  inProgressOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
  }>;
  wishlistCount: number;
  activeOffersCount: number;
  currencySymbol: string;
}>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const general = await getSetting("general");
    const currencySymbol = general.currencySymbol;

    const [recentOrders, inProgressOrders, wishlist] = await Promise.all([
      Order.find({ customerId: session.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.find({
        customerId: session.id,
        status: {
          $in: ["new", "contacted", "confirmed", "processing", "out_for_delivery"],
        },
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Wishlist.findOne({ customerId: session.id }).lean(),
    ]);
    const activeOffersCount = await Campaign.countDocuments({ status: "active" });

    return actionOk({
      recentOrders: recentOrders.map((order) => ({
        id: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        formattedTotal: formatMoney(order.total, currencySymbol),
        createdAt: isoDate(order.createdAt),
        itemsCount: order.items.length,
      })),
      inProgressOrders: inProgressOrders.map((order) => ({
        id: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: isoDate(order.createdAt),
      })),
      wishlistCount: wishlist?.products.length ?? 0,
      activeOffersCount,
      currencySymbol,
    });
  });
}

export async function getCustomerOrders(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<ActionResult<{
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    formattedTotal: string;
    createdAt: string;
    items: Array<{
      id: string;
      name: string;
      slug: string;
      image: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    delivery: {
      line1: string;
      district: string;
      city: string;
    };
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currencySymbol: string;
}>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const general = await getSetting("general");
    const currencySymbol = general.currencySymbol;

    const page = Math.max(1, params.page ?? 1);
    const pageSize = [10, 20, 50].includes(params.pageSize ?? 10) ? params.pageSize! : 10;

    const filter: Record<string, unknown> = { customerId: session.id };
    if (params.status && params.status !== "all") {
      filter.status = params.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return actionOk({
      orders: orders.map((order) => ({
        id: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        formattedTotal: formatMoney(order.total, currencySymbol),
        createdAt: isoDate(order.createdAt),
        items: order.items.map((item) => ({
          id: String(item.productId),
          name: item.name,
          slug: item.slug,
          image: item.image,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        delivery: {
          line1: order.delivery.line1,
          district: order.delivery.district,
          city: order.delivery.city,
        },
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      currencySymbol,
    });
  });
}

export async function getOrderDetails(orderId: string): Promise<ActionResult<{
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    subtotal: number;
    campaignDiscount: number;
    couponDiscount: number;
    couponCode: string;
    shipping: number;
    tax: number;
    total: number;
    formattedTotal: string;
    formattedSubtotal: string;
    createdAt: string;
    updatedAt: string;
    statusHistory: Array<{
      status: string;
      at: string;
      by: string;
      note?: string;
    }>;
    items: Array<{
      id: string;
      productId: string;
      name: string;
      slug: string;
      image: string;
      variantSku?: string | null;
      color?: string | null;
      size?: string | null;
      unitPrice: number;
      originalPrice: number;
      quantity: number;
      lineTotal: number;
      discount: number;
    }>;
    delivery: {
      line1: string;
      district: string;
      sector: string;
      city: string;
      notes: string;
    };
    courier: string;
    trackingNumber: string;
    cancelledAt?: string | null;
    refundedAt?: string | null;
  };
  currencySymbol: string;
}>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const general = await getSetting("general");
    const currencySymbol = general.currencySymbol;

    const order = await Order.findOne({ _id: orderId, customerId: session.id }).lean();
    if (!order) return actionError("Order not found");

    return actionOk({
      order: {
        id: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        customer: {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
        },
        subtotal: order.subtotal,
        campaignDiscount: order.campaignDiscount,
        couponDiscount: order.couponDiscount,
        couponCode: order.couponCode,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
        formattedTotal: formatMoney(order.total, currencySymbol),
        formattedSubtotal: formatMoney(order.subtotal, currencySymbol),
        createdAt: isoDate(order.createdAt),
        updatedAt: isoDate(order.updatedAt),
        statusHistory: order.statusHistory.map((h) => ({
          status: h.status,
          at: h.at.toISOString(),
          by: h.by,
          note: h.note,
        })),
        items: order.items.map((item) => ({
          id: String(item.productId),
          productId: String(item.productId),
          name: item.name,
          slug: item.slug,
          image: item.image,
          variantSku: item.variantSku,
          color: item.color,
          size: item.size,
          unitPrice: item.unitPrice,
          originalPrice: item.originalPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          discount: item.discount,
        })),
        delivery: {
          line1: order.delivery.line1,
          district: order.delivery.district,
          sector: order.delivery.sector,
          city: order.delivery.city,
          notes: order.delivery.notes,
        },
        courier: order.courier,
        trackingNumber: order.trackingNumber,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        refundedAt: order.refundedAt?.toISOString() ?? null,
      },
      currencySymbol,
    });
  });
}

export async function getCustomerWishlist(): Promise<ActionResult<{
  items: Array<{
    id: string;
    productId: string;
    name: string;
    slug: string;
    image: string;
    price: number;
    formattedPrice: string;
    originalPrice?: number;
    formattedOriginalPrice?: string;
    stock: number;
    status: string;
  }>;
  currencySymbol: string;
}>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const general = await getSetting("general");
    const currencySymbol = general.currencySymbol;

    const wishlist = await Wishlist.findOne({ customerId: session.id }).lean();
    if (!wishlist?.products.length) {
      return actionOk({ items: [], currencySymbol });
    }

    const products = await Product.find({ _id: { $in: wishlist.products } })
      .populate<{ category: { name: string; slug: string } }>("category", "name slug")
      .lean();

    return actionOk({
      items: products.map((product) => ({
        id: String(product._id),
        productId: String(product._id),
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.price,
        formattedPrice: formatMoney(product.price, currencySymbol),
        originalPrice: product.compareAtPrice ?? undefined,
        formattedOriginalPrice: product.compareAtPrice ? formatMoney(product.compareAtPrice, currencySymbol) : undefined,
        stock: product.stock,
        status: product.status,
      })),
      currencySymbol,
    });
  });
}

export async function removeFromWishlist(productId: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    await Wishlist.updateOne(
      { customerId: session.id },
      { $pull: { products: productId } }
    );

    return actionOk(null);
  });
}

export async function getCustomerReviews(): Promise<ActionResult<{
  reviews: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string;
    rating: number;
    title: string;
    body: string;
    status: string;
    reply: string;
    repliedAt?: string | null;
    createdAt: string;
    isVerifiedPurchase: boolean;
  }>;
}>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();

    const reviews = await Review.find({ customerId: session.id })
      .sort({ createdAt: -1 })
      .lean();

    const productIds = [...new Set(reviews.map((r) => String(r.productId)))];
    const products = await Product.find({ _id: { $in: productIds } })
      .select("name slug image")
      .lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    return actionOk({
      reviews: reviews.map((review) => {
        const product = productMap.get(String(review.productId));
        return {
          id: String(review._id),
          productId: String(review.productId),
          productName: product?.name ?? "Unknown Product",
          productSlug: product?.slug ?? "",
          productImage: product?.image ?? "",
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: review.status,
          reply: review.reply,
          repliedAt: review.repliedAt?.toISOString() ?? null,
          createdAt: isoDate(review.createdAt),
          isVerifiedPurchase: !!review.orderId,
        };
      }),
    });
  });
}

export async function getCustomerAddresses(): Promise<ActionResult<{
  addresses: Array<{
    id: string;
    label: string;
    line1: string;
    province: string;
    district: string;
    sector: string;
    landmark: string;
    phone: string;
    isDefault: boolean;
  }>;
}>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const { Customer } = await import("@/models/Customer");
    const customer = await Customer.findById(session.id).select("addresses").lean();
    const addresses = customer?.addresses ?? [];
    const hasDefault = addresses.some((address) => address.isDefault);

    return actionOk({
      addresses: addresses.map((addr, index) => ({
        id: addr._id ? String(addr._id) : String(index),
        label: addr.label,
        line1: addr.line1,
        province: addr.province || "",
        district: addr.district,
        sector: addr.sector,
        landmark: addr.landmark,
        phone: addr.phone,
        isDefault: addr.isDefault || (!hasDefault && index === 0),
      })),
    });
  });
}

export async function addCustomerAddress(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    const parsed = customerAddressSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(
        "Please check the address details.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    await connectToDatabase();
    const { Customer } = await import("@/models/Customer");
    const customer = await Customer.findById(session.id).select("addresses");
    if (!customer) return actionError("Account not found");

    if (customer.addresses.length >= 8) {
      return actionError("You can save up to 8 addresses. Delete one to add another.");
    }

    const makeDefault = parsed.data.isDefault || customer.addresses.length === 0;
    if (makeDefault) {
      customer.addresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    customer.addresses.push({ ...parsed.data, isDefault: makeDefault });
    await customer.save();

    revalidatePath("/account/addresses");
    return actionOk(null);
  });
}

export async function updateCustomerAddress(
  id: string,
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    const parsedId = customerAddressIdSchema.safeParse({ id });
    if (!parsedId.success) return actionError("Address not found");

    const parsed = customerAddressSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(
        "Please check the address details.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    await connectToDatabase();
    const { Customer } = await import("@/models/Customer");
    const customer = await Customer.findById(session.id).select("addresses");
    if (!customer) return actionError("Account not found");

    const address = customer.addresses.find(
      (item) => String(item._id) === parsedId.data.id,
    );
    if (!address) return actionError("Address not found");

    if (parsed.data.isDefault) {
      customer.addresses.forEach((item) => {
        item.isDefault = false;
      });
    }

    Object.assign(address, parsed.data);

    // Keep exactly one default address whenever at least one address exists.
    if (!customer.addresses.some((item) => item.isDefault)) {
      customer.addresses[0].isDefault = true;
    }

    await customer.save();

    revalidatePath("/account/addresses");
    return actionOk(null);
  });
}

export async function deleteCustomerAddress(
  id: string,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    const parsedId = customerAddressIdSchema.safeParse({ id });
    if (!parsedId.success) return actionError("Address not found");

    await connectToDatabase();
    const { Customer } = await import("@/models/Customer");
    const customer = await Customer.findById(session.id).select("addresses");
    if (!customer) return actionError("Account not found");

    const index = customer.addresses.findIndex(
      (item) => String(item._id) === parsedId.data.id,
    );
    if (index === -1) return actionError("Address not found");

    customer.addresses.splice(index, 1);

    if (
      customer.addresses.length > 0 &&
      !customer.addresses.some((item) => item.isDefault)
    ) {
      customer.addresses[0].isDefault = true;
    }

    await customer.save();

    revalidatePath("/account/addresses");
    return actionOk(null);
  });
}

export async function setDefaultCustomerAddress(
  id: string,
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    const parsedId = customerAddressIdSchema.safeParse({ id });
    if (!parsedId.success) return actionError("Address not found");

    await connectToDatabase();
    const { Customer } = await import("@/models/Customer");
    const customer = await Customer.findById(session.id).select("addresses");
    if (!customer) return actionError("Account not found");

    const address = customer.addresses.find(
      (item) => String(item._id) === parsedId.data.id,
    );
    if (!address) return actionError("Address not found");

    customer.addresses.forEach((item) => {
      item.isDefault = String(item._id) === parsedId.data.id;
    });
    await customer.save();

    revalidatePath("/account/addresses");
    return actionOk(null);
  });
}

export async function getCustomerMessages(): Promise<ActionResult<{
  messages: Array<{
    id: string;
    subject: string;
    body: string;
    status: string;
    replyBody: string;
    repliedAt?: string | null;
    createdAt: string;
  }>;
}>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();

    const messages = await Message.find({ customerId: session.id })
      .sort({ createdAt: -1 })
      .lean();

    return actionOk({
      messages: messages.map((msg) => ({
        id: String(msg._id),
        subject: msg.subject,
        body: msg.body,
        status: msg.status,
        replyBody: msg.replyBody,
        repliedAt: msg.repliedAt?.toISOString() ?? null,
        createdAt: isoDate(msg.createdAt),
      })),
    });
  });
}

export async function updateCustomerProfile(data: {
  name: string;
  phone: string;
}): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const { Customer } = await import("@/models/Customer");
    await Customer.updateOne(
      { _id: session.id },
      { $set: { name: data.name, phone: data.phone } }
    );

    return actionOk(null);
  });
}

export async function changeCustomerPassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const { Customer } = await import("@/models/Customer");
    const { hashPassword, verifyPassword } = await import("@/lib/auth/customer");
    const customer = await Customer.findById(session.id).select("+passwordHash");
    if (!customer || !customer.passwordHash) {
      return actionError("Password not set for this account");
    }

    const valid = await verifyPassword(data.currentPassword, customer.passwordHash);
    if (!valid) {
      return actionError("Current password is incorrect", { currentPassword: "Current password is incorrect" });
    }

    const newHash = await hashPassword(data.newPassword);
    await Customer.updateOne(
      { _id: session.id },
      { $set: { passwordHash: newHash, sessionVersion: (customer.sessionVersion ?? 0) + 1 } }
    );

    return actionOk(null);
  });
}

export async function cancelOrder(orderId: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const order = await Order.findOne({ _id: orderId, customerId: session.id });
    if (!order) return actionError("Order not found");

    if (!canTransition(order.status, "cancelled")) {
      return actionError("Order cannot be cancelled at this stage");
    }

    if (order.stockDeducted) {
      await restoreOrderStock(String(order._id), "customer");
    }

    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.statusHistory.push({
      status: "cancelled",
      at: new Date(),
      by: "customer",
      note: "Cancelled by customer",
    });
    await order.save();

    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);
    return actionOk(null);
  });
}

export async function reorderAction(orderId: string): Promise<ActionResult<{ cartUrl: string }>> {
  return runAction(async () => {
    const session = await getCustomerSession();
    if (!session) return actionError("Not authenticated");

    await connectToDatabase();
    const order = await Order.findOne({ _id: orderId, customerId: session.id }).lean();
    if (!order) return actionError("Order not found");

    const sessionId = await ensureSessionId();
    let added = 0;
    for (const item of order.items) {
      try {
        const cart = await addToCart(
          sessionId,
          String(item.productId),
          item.quantity,
          item.variantSku ?? undefined,
        );
        if (cart) added += 1;
      } catch {
        continue;
      }
    }

    if (!added) return actionError("None of these items are currently available.");
    revalidatePath("/cart");
    return actionOk({ cartUrl: "/cart" });
  });
}
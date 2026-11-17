import "server-only";

import { Types } from "mongoose";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { getSetting } from "@/lib/admin/settings";
import { generateOrderNumber } from "@/lib/orders/counter";

export async function nextOrderNumber() {
  const whatsappOrder = await getSetting("whatsappOrder");
  return generateOrderNumber(whatsappOrder.orderPrefix);
}

export async function findOrCreateCustomer(input: { name: string; email: string; phone: string }) {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  let customer = email
    ? await Customer.findOne({ email })
    : await Customer.findOne({ phone, email: { $exists: false } });
  if (!customer && !email) customer = await Customer.findOne({ phone });

  if (customer) {
    customer.name = input.name;
    customer.phone = phone;
    if (email && customer.email !== email) {
      const conflict = await Customer.findOne({ email, _id: { $ne: customer._id } }).select("_id").lean();
      if (!conflict) customer.email = email;
    }
    await customer.save();
    return customer;
  }

  return Customer.create({
    name: input.name,
    phone,
    ...(email ? { email } : {}),
  });
}

export async function recalculateCustomerStats(customerId: Types.ObjectId | string) {
  const id = typeof customerId === "string" ? new Types.ObjectId(customerId) : customerId;
  const [summary] = await Order.aggregate<{
    orderCount: number;
    lifetimeValue: number;
    firstOrderAt: Date | null;
    lastOrderAt: Date | null;
  }>([
    { $match: { customerId: id } },
    {
      $group: {
        _id: null,
        orderCount: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, 1] } },
        lifetimeValue: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  ["confirmed", "processing", "out_for_delivery", "delivered"],
                ],
              },
              "$total",
              0,
            ],
          },
        },
        firstOrderAt: { $min: "$createdAt" },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);

  await Customer.updateOne(
    { _id: id },
    {
      $set: {
        orderCount: summary?.orderCount ?? 0,
        lifetimeValue: summary?.lifetimeValue ?? 0,
        firstOrderAt: summary?.firstOrderAt ?? null,
        lastOrderAt: summary?.lastOrderAt ?? null,
      },
    },
  );
}

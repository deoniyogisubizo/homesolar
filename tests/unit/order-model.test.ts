import { describe, expect, it } from "vitest";
import { Order } from "@/models/Order";
import { Cart } from "@/models/Cart";

describe("order indexes", () => {
  it("enforces unique order numbers and sparse unique idempotency keys", () => {
    const indexes = Order.schema.indexes();
    const byField = new Map(indexes.map(([fields, options]) => [Object.keys(fields).join(","), options]));

    expect(byField.get("orderNumber")).toMatchObject({ unique: true });
    expect(byField.get("idempotencyKey")).toMatchObject({ unique: true, sparse: true });
    expect(byField.get("status,createdAt")).toBeDefined();
    expect(byField.get("customer.phone")).toBeDefined();
  });

  it("keeps one cart per session", () => {
    const indexes = Cart.schema.indexes();
    const sessionIndex = indexes.find(([fields]) => Object.keys(fields).join(",") === "sessionId");
    expect(sessionIndex?.[1]).toMatchObject({ unique: true });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindOneAndUpdate: vi.fn(),
  productUpdateOne: vi.fn(),
  movementCreate: vi.fn(),
  orderFindOneAndUpdate: vi.fn(),
  orderUpdateOne: vi.fn(),
}));

vi.mock("@/models/Product", () => ({
  Product: {
    findOneAndUpdate: mocks.productFindOneAndUpdate,
    updateOne: mocks.productUpdateOne,
  },
}));

vi.mock("@/models/InventoryMovement", () => ({
  InventoryMovement: { create: mocks.movementCreate },
}));

vi.mock("@/models/Order", () => ({
  Order: {
    findOneAndUpdate: mocks.orderFindOneAndUpdate,
    updateOne: mocks.orderUpdateOne,
  },
}));

import {
  InsufficientStockError,
  deductOrderStock,
  restoreOrderStock,
} from "@/lib/orders/stock";

type MockOrder = {
  _id: string;
  orderNumber: string;
  items: Array<{
    productId: string;
    variantSku: string | null;
    name: string;
    quantity: number;
  }>;
};

function lean<T>(value: T) {
  return { lean: () => Promise.resolve(value) };
}

function orderWith(items: MockOrder["items"]): MockOrder {
  return { _id: "order-1", orderNumber: "SH-000001", items };
}

function product(stock: number, id = "product-1") {
  return {
    _id: id,
    stock,
    variants: [],
    lowStockThreshold: 5,
  };
}

describe("order stock", () => {
  beforeEach(() => {
    mocks.productFindOneAndUpdate.mockReset();
    mocks.productUpdateOne.mockReset().mockResolvedValue({});
    mocks.movementCreate.mockReset().mockResolvedValue({});
    mocks.orderFindOneAndUpdate.mockReset();
    mocks.orderUpdateOne.mockReset().mockResolvedValue({});
  });

  it("deducts stock once and records a sale movement", async () => {
    mocks.orderFindOneAndUpdate.mockReturnValueOnce(
      lean(
        orderWith([
          { productId: "product-1", variantSku: null, name: "Solar panel", quantity: 2 },
        ]),
      ),
    );
    mocks.productFindOneAndUpdate.mockReturnValueOnce(lean(product(3)));

    const result = await deductOrderStock("order-1", "staff@example.com");

    expect(result).toBe(true);
    expect(mocks.productFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "product-1", stock: { $gte: 2 } },
      { $inc: { stock: -2 } },
      { new: true, arrayFilters: undefined },
    );
    expect(mocks.movementCreate).toHaveBeenCalledWith(
      expect.objectContaining({ delta: -2, stockAfter: 3, reason: "sale" }),
    );
    expect(mocks.productUpdateOne).toHaveBeenCalledWith(
      { _id: "product-1" },
      { $set: { status: "low_stock" } },
    );
  });

  it("does not deduct again when the order was already claimed", async () => {
    mocks.orderFindOneAndUpdate.mockReturnValueOnce(lean(null));

    const result = await deductOrderStock("order-1", "staff@example.com");

    expect(result).toBe(false);
    expect(mocks.productFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.movementCreate).not.toHaveBeenCalled();
  });

  it("rolls back earlier items and releases the claim on insufficient stock", async () => {
    mocks.orderFindOneAndUpdate.mockReturnValueOnce(
      lean(
        orderWith([
          { productId: "product-1", variantSku: null, name: "Solar panel", quantity: 1 },
          { productId: "product-2", variantSku: null, name: "Battery", quantity: 2 },
        ]),
      ),
    );
    mocks.productFindOneAndUpdate
      .mockReturnValueOnce(lean(product(4, "product-1")))
      .mockReturnValueOnce(lean(null))
      .mockReturnValueOnce(lean(product(5, "product-1")));

    await expect(deductOrderStock("order-1", "staff@example.com")).rejects.toBeInstanceOf(
      InsufficientStockError,
    );

    expect(mocks.productFindOneAndUpdate).toHaveBeenCalledTimes(3);
    expect(mocks.movementCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ productId: "product-1", delta: -1 }),
    );
    expect(mocks.movementCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ productId: "product-1", delta: 1, reason: "order_cancelled" }),
    );
    expect(mocks.orderUpdateOne).toHaveBeenCalledWith(
      { _id: "order-1" },
      { $set: { stockDeducted: false } },
    );
  });

  it("restores stock only for an order that was deducted", async () => {
    mocks.orderFindOneAndUpdate.mockReturnValueOnce(
      lean(
        orderWith([
          { productId: "product-1", variantSku: null, name: "Solar panel", quantity: 2 },
        ]),
      ),
    );
    mocks.productFindOneAndUpdate.mockReturnValueOnce(lean(product(7)));

    const result = await restoreOrderStock("order-1", "staff@example.com");

    expect(result).toBe(true);
    expect(mocks.productFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "product-1" },
      { $inc: { stock: 2 } },
      { new: true, arrayFilters: undefined },
    );
    expect(mocks.movementCreate).toHaveBeenCalledWith(
      expect.objectContaining({ delta: 2, stockAfter: 7, reason: "order_cancelled" }),
    );
  });

  it("does not restore stock for an order that was never deducted", async () => {
    mocks.orderFindOneAndUpdate.mockReturnValueOnce(lean(null));

    const result = await restoreOrderStock("order-1", "staff@example.com");

    expect(result).toBe(false);
    expect(mocks.productFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

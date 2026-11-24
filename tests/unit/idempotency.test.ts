import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/Order", () => ({
  Order: {
    findOne: mocks.findOne,
    create: mocks.create,
  },
}));

vi.mock("@/models/Cart", () => ({ Cart: { updateOne: vi.fn() } }));
vi.mock("@/models/Coupon", () => ({ Coupon: { findOne: vi.fn(), updateOne: vi.fn() } }));
vi.mock("@/models/Customer", () => ({ Customer: { updateOne: vi.fn() } }));
vi.mock("@/lib/admin/orders", () => ({ findOrCreateCustomer: vi.fn() }));
vi.mock("@/lib/admin/settings", () => ({ getSetting: vi.fn() }));
vi.mock("@/lib/admin/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/orders/counter", () => ({ generateOrderNumber: vi.fn() }));
vi.mock("@/lib/store", () => ({ loadCartQuote: vi.fn() }));
vi.mock("@/lib/locations", () => ({ findDeliveryLocation: vi.fn() }));

import { createWhatsAppOrder } from "@/lib/orders/create-order";
import type { CheckoutInput } from "@/schemas/checkout";

const input: CheckoutInput = {
  idempotencyKey: "3f0c9a5e-8b1d-4c2a-9e7f-1a2b3c4d5e6f",
  customer: {
    name: "Aline Uwase",
    email: "aline@example.com",
    phone: "+250788123456",
  },
  delivery: {
    province: "Kigali City",
    district: "Gasabo",
    sector: "Kimironko",
    address: "KG 11 Ave, house 7",
    landmark: "Near the market",
  },
  notes: "Call before delivery",
  whatsappOptIn: true,
  honeypot: "",
};

describe("WhatsApp checkout idempotency", () => {
  beforeEach(() => {
    mocks.findOne.mockReset();
    mocks.create.mockReset();
  });

  it("returns the same order for a repeated idempotency key without creating another", async () => {
    mocks.findOne.mockReturnValue({
      lean: async () => ({
        _id: "order-1",
        orderNumber: "SH-000123",
        token: "confirmation-token",
        whatsapp: {
          number: "+250788123456",
          message: "Order SH-000123\nTotal: $598.00",
        },
      }),
    });

    const first = await createWhatsAppOrder("cart-session", input);
    const second = await createWhatsAppOrder("cart-session", input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      orderNumber: "SH-000123",
      token: "confirmation-token",
      orderId: "order-1",
      created: false,
    });
    expect(first.whatsappUrl).toContain("https://wa.me/250788123456?text=");
    expect(mocks.findOne).toHaveBeenCalledTimes(2);
    expect(mocks.findOne).toHaveBeenCalledWith({ idempotencyKey: input.idempotencyKey });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

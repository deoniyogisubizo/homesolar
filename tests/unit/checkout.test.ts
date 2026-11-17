import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/schemas/checkout";

const idempotencyKey = "3f0c9a5e-8b1d-4c2a-9e7f-1a2b3c4d5e6f";

function validInput() {
  return {
    idempotencyKey,
    customer: {
      name: "Aline Uwase",
      email: "aline@example.com",
      phone: "0788 123 456",
    },
    delivery: {
      province: "Kigali City",
      district: "Gasabo",
      sector: "Kimironko",
      address: "KG 11 Ave, house 7",
      landmark: "Near the market",
    },
    notes: "Call before delivery",
    honeypot: "",
  };
}

describe("checkout schema", () => {
  it("normalizes the phone number and strips client-supplied pricing fields", () => {
    const input = {
      ...validInput(),
      customer: {
        ...validInput().customer,
        price: 1,
        total: 1,
      },
      price: 1,
      subtotal: 1,
      total: 1,
      items: [{ productId: "fake", unitPrice: 1, quantity: 99 }],
    };

    const parsed = checkoutSchema.parse(input);

    expect(parsed.customer.phone).toBe("+250788123456");
    expect(parsed).not.toHaveProperty("price");
    expect(parsed).not.toHaveProperty("subtotal");
    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("items");
    expect(parsed.customer).not.toHaveProperty("price");
    expect(parsed.customer).not.toHaveProperty("total");
  });

  it("sanitizes markup from free-text fields", () => {
    const parsed = checkoutSchema.parse({
      ...validInput(),
      customer: { ...validInput().customer, name: "<b>Aline</b>  Uwase" },
      delivery: { ...validInput().delivery, address: "<script>alert(1)</script>KG 11 Ave" },
      notes: "<p>Leave at the gate</p>",
    });

    expect(parsed.customer.name).toBe("Aline Uwase");
    expect(parsed.delivery.address).toBe("KG 11 Ave");
    expect(parsed.notes).toBe("Leave at the gate");
  });

  it("rejects invalid phones, disposable email addresses and malformed keys", () => {
    const invalidPhone = checkoutSchema.safeParse({
      ...validInput(),
      customer: { ...validInput().customer, phone: "000000" },
    });
    expect(invalidPhone.success).toBe(false);

    const disposable = checkoutSchema.safeParse({
      ...validInput(),
      customer: { ...validInput().customer, email: "buyer@mailinator.com" },
    });
    expect(disposable.success).toBe(false);

    const invalidKey = checkoutSchema.safeParse({ ...validInput(), idempotencyKey: "abc" });
    expect(invalidKey.success).toBe(false);
  });

  it("requires the province, district and delivery address", () => {
    const input = validInput();
    expect(
      checkoutSchema.safeParse({
        ...input,
        delivery: { ...input.delivery, address: "" },
      }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({
        ...input,
        delivery: { ...input.delivery, province: "" },
      }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({
        ...input,
        delivery: { ...input.delivery, district: "" },
      }).success,
    ).toBe(false);
  });
});

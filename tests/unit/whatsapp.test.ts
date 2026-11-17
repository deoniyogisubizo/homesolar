import { describe, expect, it } from "vitest";
import {
  WHATSAPP_URL_LIMIT,
  buildOrderItemLine,
  buildOrderMessage,
  buildWhatsAppLink,
  normalizePhone,
  orderItemOptions,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp";

describe("normalizePhone", () => {
  it("expands Rwandan local numbers", () => {
    expect(normalizePhone("0788 123 456")).toBe("+250788123456");
    expect(normalizePhone("788123456")).toBe("+250788123456");
    expect(normalizePhone("00250788123456")).toBe("+250788123456");
    expect(normalizePhone("+250 788 123 456")).toBe("+250788123456");
  });

  it("keeps international numbers with a country code", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("+1 (415) 555-0112")).toBe("+14155550112");
  });

  it("rejects empty, repeated and malformed values", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("000000")).toBeNull();
    expect(normalizePhone("111111111")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("not a phone")).toBeNull();
  });
});

describe("buildWhatsAppLink", () => {
  it("returns a wa.me link with an encoded message", () => {
    const link = buildWhatsAppLink("+250788123456", "Order SH-000123\nTotal: $10.00");
    expect(link).toBe(
      `https://wa.me/250788123456?text=${encodeURIComponent("Order SH-000123\nTotal: $10.00")}`,
    );
  });

  it("returns null for an invalid number", () => {
    expect(buildWhatsAppLink("000000", "Hello")).toBeNull();
  });
});

describe("order message formatting", () => {
  const template = [
    "New order {{orderNumber}}",
    "{{items}}",
    "Subtotal: {{subtotal}}",
    "Discount: {{discount}}",
    "Total: {{total}}",
    "{{notes}}",
  ].join("\n");

  const base = {
    template,
    storeName: "Homesolar",
    customerName: "Aline Uwase",
    customerPhone: "+250788123456",
    orderNumber: "SH-000123",
    subtotal: 598,
    discount: 0,
    total: 598,
    deliveryLocation: "Kigali, Gasabo",
    maxEncodedLength: WHATSAPP_URL_LIMIT,
  };

  it("formats item lines with options, quantity and line total", () => {
    const line = buildOrderItemLine(
      {
        name: "Monocrystalline Solar Panel 550W",
        options: ["Blue", "550W"],
        quantity: 2,
        lineTotal: 598,
      },
      1,
    );
    expect(line).toBe("1. Monocrystalline Solar Panel 550W (Blue, 550W) x2 - $598.00");
  });

  it("derives options from colour and size when options are absent", () => {
    expect(orderItemOptions({ color: "blue", size: "550w" })).toEqual(["Blue", "550W"]);
  });

  it("renders known variables and leaves unknown placeholders intact", () => {
    const message = buildOrderMessage({
      ...base,
      items: [
        {
          name: "Monocrystalline Solar Panel 550W",
          options: ["Blue", "550W"],
          quantity: 2,
          lineTotal: 598,
        },
      ],
      notes: "",
    });

    expect(message).toContain("New order SH-000123");
    expect(message).toContain("1. Monocrystalline Solar Panel 550W (Blue, 550W) x2 - $598.00");
    expect(message).toContain("Total: $598.00");
    expect(message).not.toContain("Notes:");
    expect(renderWhatsAppTemplate("Hello {{unknown}}", {})).toBe("Hello {{unknown}}");
  });

  it("adds notes only when present", () => {
    const message = buildOrderMessage({
      ...base,
      items: [{ name: "Battery", quantity: 1, lineTotal: 120 }],
      notes: "Call before delivery",
    });
    expect(message).toContain("Notes: Call before delivery");
  });

  it("truncates long item lists while keeping the order number and total", () => {
    const items = Array.from({ length: 40 }, (_, index) => ({
      name: `Solar accessory ${index + 1}`,
      options: ["Black", "12V"],
      quantity: 1,
      lineTotal: 25,
    }));

    const message = buildOrderMessage({
      ...base,
      items,
      subtotal: 1000,
      total: 1000,
      maxEncodedLength: 900,
    });

    expect(message).toContain("more items (see order SH-000123)");
    expect(message).toContain("SH-000123");
    expect(message).toContain("Total: $1,000.00");
    expect(encodeURIComponent(message).length).toBeLessThanOrEqual(900);
  });
});

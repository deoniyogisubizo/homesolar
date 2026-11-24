import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import type { InvoiceSettings } from "@/lib/admin/settings-defaults";

const mocks = vi.hoisted(() => ({
  orderFindById: vi.fn(),
  orderUpdateOne: vi.fn(),
  invoiceFindOne: vi.fn(),
  invoiceCreate: vi.fn(),
  invoiceUpdateOne: vi.fn(),
  counterUpdate: vi.fn(),
  getSetting: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/admin/settings", () => ({
  getSetting: mocks.getSetting,
}));

vi.mock("@/lib/admin/crypto", () => ({
  encryptSecret: (value: string) => value,
  decryptSecret: (value: string) => value,
}));

vi.mock("@/models/Order", () => ({
  Order: {
    findById: mocks.orderFindById,
    updateOne: mocks.orderUpdateOne,
  },
}));

vi.mock("@/models/Invoice", () => ({
  Invoice: {
    findOne: mocks.invoiceFindOne,
    create: mocks.invoiceCreate,
    updateOne: mocks.invoiceUpdateOne,
  },
}));

vi.mock("@/models/InvoiceCounter", () => ({
  InvoiceCounter: {
    findOneAndUpdate: mocks.counterUpdate,
  },
}));

import {
  deriveDeliveryPin,
  hashDeliveryPin,
  hashToken,
  issueOrderInvoice,
  toInvoiceSnapshot,
  verifyDeliveryPin,
} from "@/lib/invoices";

const settings: InvoiceSettings = {
  business: {
    businessName: "Homesolar",
    tin: "123456789",
    address: "Kigali",
    phone: "+250788123456",
    email: "info@example.com",
    logo: "",
    pricesIncludeVat: false,
    vatRate: 0,
  },
  terms: "Delivery terms",
  invoicePrefix: "INV",
  reissueOnConfirm: true,
  tokenExpiryDays: 60,
  confirmationMode: "pin_and_scan",
  pinAttempts: 5,
  pinLockMinutes: 15,
  geolocationRequired: false,
  templates: {
    order_invoice_customer: {
      metaTemplateName: "order_invoice_customer",
      languageCode: "en",
      variableMapping: { customerName: "1", orderNumber: "2", invoiceUrl: "3" },
    },
    order_invoice_staff: {
      metaTemplateName: "order_invoice_staff",
      languageCode: "en",
      variableMapping: { orderNumber: "1" },
    },
    order_delivered_customer: {
      metaTemplateName: "order_delivered_customer",
      languageCode: "en",
      variableMapping: { customerName: "1" },
    },
  },
  whatsappApi: { enabled: false },
  recipients: [],
  autoSend: { onPlacement: true, onConfirmation: true, onDelivery: true },
};

const order = {
  _id: new Types.ObjectId(),
  orderNumber: "SH-000123",
  total: 250,
  subtotal: 250,
  campaignDiscount: 0,
  couponDiscount: 0,
  shipping: 0,
  paymentStatus: "unpaid" as const,
  paymentMethod: "cash_on_delivery" as const,
  notes: [],
  customer: { name: "Aline Uwase", phone: "+250788123456", email: "aline@example.com" },
  delivery: {
    line1: "KG 11 Ave",
    district: "Gasabo",
    sector: "Kimironko",
    landmark: "Near market",
    city: "Kigali",
    notes: "",
  },
  items: [
    {
      productId: new Types.ObjectId(),
      name: "Solar panel",
      slug: "solar-panel",
      image: "/images/panel.jpg",
      options: ["550W"],
      unitPrice: 250,
      originalPrice: 250,
      quantity: 1,
      lineTotal: 250,
      discount: 0,
    },
  ],
};

describe("invoice tokens and delivery codes", () => {
  it("hashes tokens deterministically without exposing the raw value", () => {
    expect(hashToken("raw-token")).toBe(hashToken("raw-token"));
    expect(hashToken("raw-token")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("raw-token")).not.toContain("raw-token");
  });

  it("derives a stable 6 digit delivery code that rotates with the version", () => {
    const first = deriveDeliveryPin("secret", "order-1", 0);
    const rotated = deriveDeliveryPin("secret", "order-1", 1);
    expect(first).toMatch(/^\d{6}$/);
    expect(rotated).toMatch(/^\d{6}$/);
    expect(deriveDeliveryPin("secret", "order-1", 0)).toBe(first);
    expect(rotated).not.toBe(first);
  });

  it("verifies delivery codes and rejects wrong or missing codes", () => {
    const secret = "secret";
    const pin = deriveDeliveryPin(secret, "order-1", 0);
    const expected = hashDeliveryPin(secret, "order-1", pin, 0);
    expect(verifyDeliveryPin(secret, "order-1", pin, expected, 0)).toBe(true);
    expect(verifyDeliveryPin(secret, "order-1", "000000", expected, 0)).toBe(false);
    expect(verifyDeliveryPin(secret, "order-1", pin, "", 0)).toBe(false);
  });
});

describe("invoice numbering and revisions", () => {
  beforeEach(() => {
    mocks.orderFindById.mockReset();
    mocks.orderUpdateOne.mockReset();
    mocks.invoiceFindOne.mockReset();
    mocks.invoiceCreate.mockReset();
    mocks.invoiceUpdateOne.mockReset();
    mocks.counterUpdate.mockReset();
    mocks.getSetting.mockReset();
    mocks.getSetting.mockResolvedValue(settings);
    // Order.findById().lean() is called in issueOrderInvoice; make the mock
    // return a query-like object with a .lean() method.
    mocks.orderFindById.mockReturnValue({
      lean: () => Promise.resolve({ ...order }),
    });
  });

  it("allocates a gapless prefixed number for the first revision", async () => {
    mocks.invoiceFindOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve(null as any) }),
    });
    mocks.counterUpdate.mockResolvedValue({ seq: 1 });
    mocks.invoiceCreate.mockImplementation(async (doc: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...doc,
    }));

    const issued = await issueOrderInvoice(String(order._id));

    expect(mocks.counterUpdate).toHaveBeenCalledTimes(1);
    expect(issued.snapshot.items).toHaveLength(1);
    expect(issued.invoice.invoiceNumber).toBe("INV-000001");
    expect(issued.invoice.revision).toBe(1);
    expect(issued.reissued).toBe(false);
  });

  it("keeps the invoice number and tokens while voiding the previous revision", async () => {
    const previous = {
      _id: new Types.ObjectId(),
      invoiceNumber: "INV-000001",
      revision: 1,
      accessTokenHash: "access-hash",
      accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
      deliveryTokenHash: "delivery-hash",
      deliveryTokenEncrypted: "encrypted-delivery-token",
      deliveryTokenExpiresAt: new Date(Date.now() + 86_400_000),
    };
    mocks.invoiceFindOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve(previous) }),
    });
    mocks.invoiceCreate.mockImplementation(async (doc: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...doc,
    }));

    const issued = await issueOrderInvoice(String(order._id));

    expect(mocks.counterUpdate).not.toHaveBeenCalled();
    expect(issued.reissued).toBe(true);
    expect(issued.invoice.invoiceNumber).toBe("INV-000001");
    expect(issued.invoice.revision).toBe(2);
    expect(issued.accessToken.tokenHash).toBe("access-hash");
    expect(issued.deliveryToken.tokenHash).toBe("delivery-hash");
    expect(issued.deliveryToken.token).toBe("encrypted-delivery-token");
    expect(mocks.invoiceUpdateOne).toHaveBeenCalledWith(
      { _id: previous._id },
      { $set: { status: "void" } },
    );
  });
});

describe("invoice snapshot", () => {
  it("normalises amounts and keeps a stable amount due", () => {
    const snapshot = toInvoiceSnapshot({
      seller: {},
      customer: {},
      delivery: {},
      items: [],
      totals: { subtotal: 100, campaignDiscount: 10, couponDiscount: 5, deliveryFee: 5, total: 100, amountDue: 0 },
      payment: {},
      notes: "",
      terms: "Terms",
    });

    expect(snapshot.totals.amountDue).toBe(0);
    expect(snapshot.terms).toBe("Terms");
    expect(snapshot.items).toEqual([]);
  });
});

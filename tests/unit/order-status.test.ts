import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  REVENUE_STATUSES,
  canTransition,
  nextStatuses,
  type OrderStatus,
} from "@/lib/admin/order-status";

describe("order status workflow", () => {
  it("allows the required sequential transitions", () => {
    expect(canTransition("new", "contacted")).toBe(true);
    expect(canTransition("contacted", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "processing")).toBe(true);
    expect(canTransition("processing", "out_for_delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "delivered")).toBe(true);
  });

  it("allows cancellation before delivery only", () => {
    const cancellable: OrderStatus[] = [
      "new",
      "contacted",
      "confirmed",
      "processing",
      "out_for_delivery",
    ];
    for (const status of cancellable) {
      expect(canTransition(status, "cancelled")).toBe(true);
    }
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });

  it("rejects skipped, repeated and terminal transitions", () => {
    expect(canTransition("new", "confirmed")).toBe(false);
    expect(canTransition("new", "processing")).toBe(false);
    expect(canTransition("confirmed", "confirmed")).toBe(false);
    expect(canTransition("delivered", "processing")).toBe(false);
    expect(nextStatuses("delivered")).toEqual([]);
    expect(nextStatuses("cancelled")).toEqual([]);
  });

  it("counts revenue from confirmed or later statuses only", () => {
    expect(REVENUE_STATUSES).toEqual([
      "confirmed",
      "processing",
      "out_for_delivery",
      "delivered",
    ]);
    expect(REVENUE_STATUSES).not.toContain("new");
    expect(REVENUE_STATUSES).not.toContain("contacted");
    expect(REVENUE_STATUSES).not.toContain("cancelled");
    expect(ORDER_STATUSES).toHaveLength(7);
  });
});

import { describe, expect, it } from "vitest";
import { can, permissionsFor, type AdminRole } from "@/lib/admin/permissions";

const ROLES: AdminRole[] = ["owner", "admin", "editor", "support"];

describe("permission matrix", () => {
  it("owner has every permission", () => {
    for (const permission of permissionsFor("owner")) {
      expect(can("owner", permission)).toBe(true);
    }
  });

  it("admin has every permission except users and smtp", () => {
    expect(can("admin", "users:read")).toBe(false);
    expect(can("admin", "users:write")).toBe(false);
    expect(can("admin", "smtp:read")).toBe(false);
    expect(can("admin", "smtp:write")).toBe(false);
    expect(can("admin", "products:write")).toBe(true);
    expect(can("admin", "orders:write")).toBe(true);
  });

  it("editor can write content but not users or audit", () => {
    expect(can("editor", "products:write")).toBe(true);
    expect(can("editor", "homepage:write")).toBe(true);
    expect(can("editor", "users:write")).toBe(false);
    expect(can("editor", "audit:read")).toBe(false);
    expect(can("editor", "settings:write")).toBe(false);
  });

  it("support can read and write orders/customers/messages but not users", () => {
    expect(can("support", "orders:write")).toBe(true);
    expect(can("support", "customers:write")).toBe(true);
    expect(can("support", "messages:write")).toBe(true);
    expect(can("support", "products:write")).toBe(false);
    expect(can("support", "users:write")).toBe(false);
    expect(can("support", "audit:read")).toBe(false);
  });

  it("every role can read the dashboard", () => {
    for (const role of ROLES) {
      expect(can(role, "dashboard:read")).toBe(true);
    }
  });

  it("only owner and admin have audit:read", () => {
    expect(can("owner", "audit:read")).toBe(true);
    expect(can("admin", "audit:read")).toBe(true);
    expect(can("editor", "audit:read")).toBe(false);
    expect(can("support", "audit:read")).toBe(false);
  });

  it("only owner and admin can write settings", () => {
    expect(can("owner", "settings:write")).toBe(true);
    expect(can("admin", "settings:write")).toBe(true);
    expect(can("editor", "settings:write")).toBe(false);
    expect(can("support", "settings:write")).toBe(false);
  });

  it("only owner and admin can write users", () => {
    expect(can("owner", "users:write")).toBe(true);
    expect(can("admin", "users:write")).toBe(false);
    expect(can("editor", "users:write")).toBe(false);
    expect(can("support", "users:write")).toBe(false);
  });
});
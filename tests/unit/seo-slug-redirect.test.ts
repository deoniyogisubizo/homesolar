import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindOne: vi.fn(),
  categoryFindOne: vi.fn(),
  pageFindOne: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/Product", () => ({ Product: { findOne: mocks.productFindOne } }));
vi.mock("@/models/Category", () => ({ Category: { findOne: mocks.categoryFindOne } }));
vi.mock("@/models/Page", () => ({ Page: { findOne: mocks.pageFindOne } }));
vi.mock("@/models/Review", () => ({ Review: {} }));
vi.mock("@/models/SiteContent", () => ({ SiteContent: {} }));
vi.mock("@/models/Campaign", () => ({ Campaign: {} }));

import {
  getCategoryRedirect,
  getPageRedirect,
  getProductRedirect,
} from "@/lib/data";
import { SLUG_HISTORY_LIMIT, appendSlugHistory } from "@/lib/seo/slug";

function leanResult(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
  mocks.productFindOne.mockReset();
  mocks.categoryFindOne.mockReset();
  mocks.pageFindOne.mockReset();
});

describe("slug history", () => {
  it("stores the previous slug when a record is renamed", () => {
    expect(appendSlugHistory([], "solar-panel", "monocrystalline-solar-panel")).toEqual([
      "solar-panel",
    ]);
  });

  it("keeps a chain of old slugs", () => {
    expect(
      appendSlugHistory(
        ["old-panel", "solar-panel"],
        "monocrystalline-solar-panel",
        "high-efficiency-panel",
      ),
    ).toEqual(["old-panel", "solar-panel", "monocrystalline-solar-panel"]);
  });

  it("never keeps the current slug in history", () => {
    expect(appendSlugHistory(["solar-panel", "panel"], "panel", "solar-panel")).toEqual([
      "panel",
    ]);
  });

  it("ignores empty and unchanged slugs", () => {
    expect(appendSlugHistory([], "", "panel")).toEqual([]);
    expect(appendSlugHistory(["old"], "panel", "panel")).toEqual(["old"]);
  });

  it("caps history at the configured limit", () => {
    const history = Array.from({ length: SLUG_HISTORY_LIMIT + 5 }, (_, index) => `slug-${index}`);
    const next = appendSlugHistory(history, "latest", "current");

    expect(next).toHaveLength(SLUG_HISTORY_LIMIT);
    expect(next[0]).toBe("slug-6");
    expect(next.at(-1)).toBe("latest");
  });
});

describe("redirect lookups", () => {
  it("redirects an old product slug to the current published product", async () => {
    mocks.productFindOne.mockReturnValue(leanResult({ slug: "monocrystalline-solar-panel" }));

    await expect(getProductRedirect("old-panel")).resolves.toBe(
      "monocrystalline-solar-panel",
    );
    expect(mocks.productFindOne).toHaveBeenCalledWith({
      slugHistory: "old-panel",
      publishStatus: { $nin: ["draft", "archived"] },
    });
  });

  it("does not redirect archived or draft products", async () => {
    mocks.productFindOne.mockReturnValue(leanResult(null));

    await expect(getProductRedirect("old-panel")).resolves.toBeNull();
    expect(mocks.productFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        slugHistory: "old-panel",
        publishStatus: { $nin: ["draft", "archived"] },
      }),
    );
  });

  it("redirects an old category slug to the current active category", async () => {
    mocks.categoryFindOne.mockReturnValue(leanResult({ slug: "solar-panels" }));

    await expect(getCategoryRedirect("panels")).resolves.toBe("solar-panels");
    expect(mocks.categoryFindOne).toHaveBeenCalledWith({
      slugHistory: "panels",
      active: { $ne: false },
    });
  });

  it("redirects a renamed page only when the target page is published", async () => {
    mocks.pageFindOne.mockReturnValue(leanResult({ slug: "frequently-asked-questions" }));

    await expect(getPageRedirect("faq")).resolves.toBe("frequently-asked-questions");
    expect(mocks.pageFindOne).toHaveBeenCalledWith({
      slugHistory: "faq",
      status: "published",
    });
  });

  it("returns null when no record owns the old slug", async () => {
    mocks.productFindOne.mockReturnValue(leanResult(null));
    mocks.categoryFindOne.mockReturnValue(leanResult(null));
    mocks.pageFindOne.mockReturnValue(leanResult(null));

    await expect(getProductRedirect("missing")).resolves.toBeNull();
    await expect(getCategoryRedirect("missing")).resolves.toBeNull();
    await expect(getPageRedirect("missing")).resolves.toBeNull();
  });
});

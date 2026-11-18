import { beforeEach, describe, expect, it } from "vitest";
import {
  buildMerchantFeed,
  renderMerchantTsv,
  renderMerchantXml,
  type MerchantFeedContext,
} from "@/lib/seo/merchant-feed";
import { productFixture } from "./seo-fixtures";

const context: MerchantFeedContext = {
  siteUrl: "https://shop.example",
  storeName: "Solar Home System",
  currency: "USD",
  shippingZones: [
    { district: "Kigali", rate: 0, eta: "1-2 business days" },
    { district: "Northern Province", rate: 8, eta: "2-4 business days" },
  ],
  taxRate: 18,
};

function variantProduct() {
  return productFixture({
    name: "Solar Panel",
    options: {
      colors: [
        { value: "black", label: "Black", hex: "#000000" },
        { value: "white", label: "White", hex: "#ffffff" },
      ],
      sizes: [],
    },
    variants: [
      {
        sku: "SP-BLK",
        color: "black",
        size: null,
        price: 229,
        compareAtPrice: null,
        stock: 8,
        isDefault: true,
      },
      {
        sku: "SP-WHT",
        color: "white",
        size: null,
        price: 239,
        compareAtPrice: null,
        stock: 0,
      },
    ],
    variantPricing: {
      "SP-BLK": {
        originalPrice: 229,
        effectivePrice: 229,
        discountPercent: 0,
        campaignId: null,
        campaignName: null,
        campaignStartsAt: null,
        campaignEndsAt: null,
      },
      "SP-WHT": {
        originalPrice: 239,
        effectivePrice: 239,
        discountPercent: 0,
        campaignId: null,
        campaignName: null,
        campaignStartsAt: null,
        campaignEndsAt: null,
      },
    },
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example";
});

describe("Merchant feed items", () => {
  it("creates one item per variant with required Google fields", () => {
    const feed = buildMerchantFeed([variantProduct()], context);

    expect(feed.skipped).toEqual([]);
    expect(feed.items).toHaveLength(2);

    const [black, white] = feed.items;
    expect(black).toMatchObject({
      id: "SP-BLK",
      title: "Solar Panel - Black",
      itemGroupId: "64b7f0c2f1a2b3c4d5e6f701",
      availability: "in_stock",
      price: "229.00 USD",
      condition: "new",
      brand: "SunPower",
      gtin: "0123456789012",
      mpn: "SP-450",
      productType: "Solar Panels",
      googleProductCategory: "Home & Garden > Lighting",
    });
    expect(black.link).toBe("https://shop.example/product/monocrystalline-solar-panel?color=black");
    expect(black.imageLink).toBe("https://shop.example/images/products/panel.jpg");
    expect(black.shipping).toHaveLength(2);
    expect(black.taxRate).toBe(18);
    expect(white.availability).toBe("out_of_stock");
    expect(white.price).toBe("239.00 USD");
    expect(white.salePrice).toBeUndefined();
    expect(white.identifierExists).toBeUndefined();
  });

  it("uses the campaign price, campaign dates and custom label for sale items", () => {
    const product = variantProduct();
    product.variantPricing = {
      ...product.variantPricing,
      "SP-BLK": {
        originalPrice: 229,
        effectivePrice: 183.2,
        discountPercent: 20,
        campaignId: "campaign-1",
        campaignName: "Sun Sale",
        campaignStartsAt: "2026-11-01T00:00:00.000Z",
        campaignEndsAt: "2026-11-30T23:59:59.000Z",
      },
    };

    const [black] = buildMerchantFeed([product], context).items;
    expect(black.price).toBe("229.00 USD");
    expect(black.salePrice).toBe("183.20 USD");
    expect(black.salePriceEffectiveDate).toBe(
      "2026-11-01T00:00:00.000Z/2026-11-30T23:59:59.000Z",
    );
    expect(black.customLabel0).toBe("Sun Sale");
  });

  it("declares identifier_exists=no when GTIN and MPN are missing", () => {
    const product = variantProduct();
    product.gtin = "";
    product.mpn = "";
    product.brand = "";

    const [item] = buildMerchantFeed([product], context).items;
    expect(item.gtin).toBeUndefined();
    expect(item.mpn).toBeUndefined();
    expect(item.identifierExists).toBe(false);
    expect(item.brand).toBe("Solar Home System");
  });

  it("creates a single item from the product when no variants are defined", () => {
    const product = productFixture({
      slug: "portable-solar-panel",
      name: "Portable Solar Panel",
      price: 159,
      stock: 0,
      variants: [],
      variantPricing: {},
      pricing: {
        originalPrice: 159,
        effectivePrice: 159,
        discountPercent: 0,
        campaignId: null,
        campaignName: null,
        campaignStartsAt: null,
        campaignEndsAt: null,
      },
    });

    const [item] = buildMerchantFeed([product], context).items;
    expect(item).toMatchObject({
      id: product.id,
      title: "Portable Solar Panel",
      availability: "out_of_stock",
      price: "159.00 USD",
      itemGroupId: product.id,
      link: "https://shop.example/product/portable-solar-panel",
    });
  });

  it("skips products without the data needed for a valid feed item", () => {
    const noImage = productFixture({ slug: "no-image", images: [], image: "", gallery: [] });
    const noDescription = productFixture({
      slug: "no-description",
      shortDescription: "",
      description: "",
    });
    const noCategory = productFixture({
      slug: "no-category",
      category: { id: "", name: "", slug: "", googleProductCategory: "" },
    });
    const invalidPrice = productFixture({
      slug: "invalid-price",
      price: 0,
      variants: [
        {
          sku: "BAD",
          color: null,
          size: null,
          price: 0,
          compareAtPrice: null,
          stock: 1,
          isDefault: true,
        },
      ],
      variantPricing: {},
    });
    const noindex = productFixture({ slug: "hidden-product", noindex: true });

    const feed = buildMerchantFeed(
      [noImage, noDescription, noCategory, invalidPrice, noindex],
      context,
    );

    expect(feed.items).toEqual([]);
    expect(feed.skipped.map((product) => [product.slug, product.reason])).toEqual([
      ["no-image", "No product image"],
      ["no-description", "Missing description"],
      ["no-category", "Category not assigned"],
      ["invalid-price", "Invalid price for SKU BAD"],
      ["hidden-product", "Marked noindex"],
    ]);
  });
});

describe("Merchant XML", () => {
  it("renders shipping and tax from the configured zones", () => {
    const xml = renderMerchantXml(buildMerchantFeed([variantProduct()], context), context);

    expect(xml).toContain('<g:shipping><g:country>RW</g:country><g:region>Kigali</g:region>');
    expect(xml).toContain("<g:price>0.00 USD</g:price>");
    expect(xml).toContain("<g:price>8.00 USD</g:price>");
    expect(xml).toContain("<g:tax><g:country>RW</g:country><g:rate>18.00</g:rate>");
    expect(xml).toContain('<g:price>229.00 USD</g:price>');
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
  });

  it("escapes XML and includes identifier_exists=no", () => {
    const product = variantProduct();
    product.name = "Panel & Mount <Kit>";
    product.gtin = "";
    product.mpn = "";

    const xml = renderMerchantXml(buildMerchantFeed([product], context), context);
    expect(xml).toContain("Panel &amp; Mount &lt;Kit&gt;");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(xml).not.toContain("<g:gtin>");
  });
});

describe("Merchant TSV", () => {
  it("writes a header row and one tab-separated row per variant", () => {
    const tsv = renderMerchantTsv(buildMerchantFeed([variantProduct()], context), context);
    const [header, firstRow, secondRow] = tsv.split("\n");

    expect(header.split("\t")).toContain("sale_price_effective_date");
    expect(header.split("\t")).toContain("identifier_exists");
    expect(firstRow.split("\t")[0]).toBe("SP-BLK");
    expect(firstRow).toContain("229.00 USD");
    expect(firstRow).toContain("RW:Kigali:Standard:0.00 USD");
    expect(secondRow.split("\t")[0]).toBe("SP-WHT");
    expect(tsv.split("\n")).toHaveLength(3);
  });

  it("keeps tabs and line breaks out of field values", () => {
    const product = variantProduct();
    product.name = "Panel\twith\nnewline";
    const tsv = renderMerchantTsv(buildMerchantFeed([product], context), context);

    expect(tsv.split("\n")[1]).not.toContain("Panel\twith");
    expect(tsv).toContain("Panel with newline");
  });
});

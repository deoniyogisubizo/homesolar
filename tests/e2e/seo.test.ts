import { expect, test, type Page } from "@playwright/test";

test.use({ javaScriptEnabled: false });

type JsonLdNode = Record<string, unknown> & {
  "@type"?: string | string[];
  hasVariant?: JsonLdNode[];
  offers?: Record<string, unknown> | Record<string, unknown>[];
  mainEntity?: unknown;
};

async function jsonLd(page: Page): Promise<JsonLdNode[]> {
  const contents = await page.locator('script[type="application/ld+json"]').allTextContents();
  return contents.map((content) => JSON.parse(content) as JsonLdNode);
}

function typesOf(nodes: JsonLdNode[]): string[] {
  return nodes.flatMap((node) =>
    Array.isArray(node["@type"]) ? node["@type"] : node["@type"] ? [node["@type"]] : [],
  );
}

function offersOf(node: JsonLdNode): Record<string, unknown> {
  return Array.isArray(node.offers) ? node.offers[0] : (node.offers ?? {});
}

test.describe("server-rendered SEO output", () => {
  test("product page includes variant price, availability and ProductGroup markup", async ({
    page,
  }) => {
    const response = await page.goto("/product/monocrystalline-solar-panel");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Monocrystalline Solar Panel/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBe("http://localhost:3000/product/monocrystalline-solar-panel");

    await expect(page.locator("body")).toContainText("In Stock");
    await expect(page.locator("body")).toContainText(/RWF\s*442,442/);

    const nodes = await jsonLd(page);
    const product = nodes.find((node) => node["@type"] === "ProductGroup");
    expect(product, "ProductGroup JSON-LD").toBeTruthy();
    expect(product?.hasVariant?.length).toBeGreaterThan(0);

    const defaultVariant = product?.hasVariant?.find((variant) => {
      const offer = offersOf(variant);
      return variant.sku === "MSP-550W-BLUE" && Boolean(offer.price);
    });
    expect(defaultVariant, "default variant offer").toBeTruthy();
    expect(offersOf(defaultVariant as JsonLdNode)).toMatchObject({
      priceCurrency: "USD",
      price: "299.00",
      availability: "https://schema.org/InStock",
    });

    const breadcrumb = nodes.find((node) => node["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeTruthy();
  });

  test("out-of-stock product stays 200 and declares OutOfStock", async ({ page }) => {
    const response = await page.goto("/product/portable-solar-panel-200w");
    expect(response?.status()).toBe(200);

    await expect(page.locator("body")).toContainText("Out of Stock");
    const nodes = await jsonLd(page);
    const product = nodes.find((node) => node["@type"] === "Product");
    expect(product).toBeTruthy();
    expect(offersOf(product as JsonLdNode)).toMatchObject({
      priceCurrency: "USD",
      price: "159.00",
      availability: "https://schema.org/OutOfStock",
    });
  });

  test("category page uses CollectionPage and ItemList without Product markup", async ({
    page,
  }) => {
    const response = await page.goto("/category/solar-panels");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Solar Panels/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBe("http://localhost:3000/category/solar-panels");

    const nodes = await jsonLd(page);
    expect(typesOf(nodes)).toContain("CollectionPage");
    expect(typesOf(nodes)).toContain("ItemList");
    expect(typesOf(nodes)).not.toContain("Product");

    const collection = nodes.find((node) => node["@type"] === "CollectionPage");
    const itemList = collection?.mainEntity as JsonLdNode;
    expect(itemList?.["@type"]).toBe("ItemList");
    expect(itemList.numberOfItems).toBeGreaterThan(0);
  });

  test("home page includes Organization, WebSite and Store markup", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Solar Home System/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBe("http://localhost:3000/");

    const nodes = await jsonLd(page);
    const types = typesOf(nodes);
    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "Store"]));

    const website = nodes.find((node) => node["@type"] === "WebSite");
    expect(JSON.stringify(website)).toContain("search_term_string");
  });

  test("FAQ page renders visible questions and matching FAQPage markup", async ({ page }) => {
    const response = await page.goto("/faq");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
    await expect(page.locator("body")).toContainText("How do I place an order?");
    await expect(page.locator("body")).toContainText("Do you deliver outside Kigali?");

    const nodes = await jsonLd(page);
    const faq = nodes.find((node) => node["@type"] === "FAQPage");
    expect(faq).toBeTruthy();
    const questions = faq?.mainEntity as JsonLdNode[];
    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(questions[0]["@type"]).toBe("Question");
    expect(JSON.stringify(questions)).toContain("How do I place an order?");
  });

  test("contact page includes ContactPage markup and real contact details", async ({ page }) => {
    const response = await page.goto("/contact");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { name: /Contact Solar Home System/ })).toBeVisible();
    await expect(page.locator("body")).toContainText("+250788123456");
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();

    const nodes = await jsonLd(page);
    const contact = nodes.find((node) => node["@type"] === "ContactPage");
    expect(contact).toBeTruthy();
    expect(contact?.url).toBe("http://localhost:3000/contact");
  });

  test("private pages send noindex headers and meta robots", async ({ page }) => {
    const response = await page.goto("/cart");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });
});

test.describe("discovery files", () => {
  test("robots.txt follows the configured crawler rules and references the sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const text = (await response.text()).toLowerCase();

    expect(text).toContain("user-agent: googlebot");
    expect(text).toContain("user-agent: oai-searchbot");
    expect(text).toContain("user-agent: gptbot");
    expect(text).toContain("disallow: /admin");
    expect(text).toContain("sitemap: http://localhost:3000/sitemap.xml");

    const gptBot = text.slice(text.indexOf("user-agent: gptbot"));
    expect(gptBot.slice(0, 80)).toContain("disallow: /");
  });

  test("sitemap.xml lists storefront URLs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const xml = await response.text();

    expect(xml).toContain("http://localhost:3000/</loc>");
    expect(xml).toContain("http://localhost:3000/category/solar-panels</loc>");
    expect(xml).toContain("http://localhost:3000/product/monocrystalline-solar-panel</loc>");
    expect(xml).toContain("http://localhost:3000/faq</loc>");
    expect(xml).toContain("<image:image>");
  });

  test("llms.txt describes the store, pages and products", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    const text = await response.text();

    expect(text).toContain("# Solar Home System & Electronic");
    expect(text).toContain("## Categories");
    expect(text).toContain("## Pages");
    expect(text).toContain("## Best-selling products");
    expect(text).toContain("http://localhost:3000/product/monocrystalline-solar-panel");
  });

  test("Merchant XML and TSV feeds expose every variant", async ({ request }) => {
    const xmlResponse = await request.get("/feeds/google-merchant.xml");
    expect(xmlResponse.status()).toBe(200);
    expect(xmlResponse.headers()["content-type"]).toContain("xml");
    const xml = await xmlResponse.text();
    expect(xml).toContain("<g:id>MSP-550W-BLUE</g:id>");
    expect(xml).toContain("<g:price>299.00 USD</g:price>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:country>RW</g:country>");

    const tsvResponse = await request.get("/feeds/google-merchant.tsv");
    expect(tsvResponse.status()).toBe(200);
    expect(tsvResponse.headers()["content-type"]).toContain("tab-separated-values");
    const tsv = await tsvResponse.text();
    const [header, firstRow] = tsv.split("\n");
    expect(header.split("\t")).toEqual(expect.arrayContaining(["id", "title", "price", "brand"]));
    expect(firstRow.split("\t")[0]).toBe("MSP-550W-BLUE");
  });
});

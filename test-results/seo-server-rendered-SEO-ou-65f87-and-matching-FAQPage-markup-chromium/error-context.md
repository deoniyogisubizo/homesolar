# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seo.test.ts >> server-rendered SEO output >> FAQ page renders visible questions and matching FAQPage markup
- Location: tests/e2e/seo.test.ts:113:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Frequently asked questions' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Frequently asked questions' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Frequently asked questions' })

```

# Test source

```ts
  17  | function typesOf(nodes: JsonLdNode[]): string[] {
  18  |   return nodes.flatMap((node) =>
  19  |     Array.isArray(node["@type"]) ? node["@type"] : node["@type"] ? [node["@type"]] : [],
  20  |   );
  21  | }
  22  | 
  23  | function offersOf(node: JsonLdNode): Record<string, unknown> {
  24  |   return Array.isArray(node.offers) ? node.offers[0] : (node.offers ?? {});
  25  | }
  26  | 
  27  | test.describe("server-rendered SEO output", () => {
  28  |   test("product page includes variant price, availability and ProductGroup markup", async ({
  29  |     page,
  30  |   }) => {
  31  |     const response = await page.goto("/product/monocrystalline-solar-panel");
  32  |     expect(response?.status()).toBe(200);
  33  | 
  34  |     await expect(page).toHaveTitle(/Monocrystalline Solar Panel/);
  35  |     const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  36  |     expect(canonical).toBe("http://localhost:3000/product/monocrystalline-solar-panel");
  37  | 
  38  |     await expect(page.locator("body")).toContainText("In Stock");
  39  |     await expect(page.locator("body")).toContainText(/RWF\s*442,442/);
  40  | 
  41  |     const nodes = await jsonLd(page);
  42  |     const product = nodes.find((node) => node["@type"] === "ProductGroup");
  43  |     expect(product, "ProductGroup JSON-LD").toBeTruthy();
  44  |     expect(product?.hasVariant?.length).toBeGreaterThan(0);
  45  | 
  46  |     const defaultVariant = product?.hasVariant?.find((variant) => {
  47  |       const offer = offersOf(variant);
  48  |       return variant.sku === "MSP-550W-BLUE" && Boolean(offer.price);
  49  |     });
  50  |     expect(defaultVariant, "default variant offer").toBeTruthy();
  51  |     expect(offersOf(defaultVariant as JsonLdNode)).toMatchObject({
  52  |       priceCurrency: "USD",
  53  |       price: "299.00",
  54  |       availability: "https://schema.org/InStock",
  55  |     });
  56  | 
  57  |     const breadcrumb = nodes.find((node) => node["@type"] === "BreadcrumbList");
  58  |     expect(breadcrumb).toBeTruthy();
  59  |   });
  60  | 
  61  |   test("out-of-stock product stays 200 and declares OutOfStock", async ({ page }) => {
  62  |     const response = await page.goto("/product/portable-solar-panel-200w");
  63  |     expect(response?.status()).toBe(200);
  64  | 
  65  |     await expect(page.locator("body")).toContainText("Out of Stock");
  66  |     const nodes = await jsonLd(page);
  67  |     const product = nodes.find((node) => node["@type"] === "Product");
  68  |     expect(product).toBeTruthy();
  69  |     expect(offersOf(product as JsonLdNode)).toMatchObject({
  70  |       priceCurrency: "USD",
  71  |       price: "159.00",
  72  |       availability: "https://schema.org/OutOfStock",
  73  |     });
  74  |   });
  75  | 
  76  |   test("category page uses CollectionPage and ItemList without Product markup", async ({
  77  |     page,
  78  |   }) => {
  79  |     const response = await page.goto("/category/solar-panels");
  80  |     expect(response?.status()).toBe(200);
  81  | 
  82  |     await expect(page).toHaveTitle(/Solar Panels/);
  83  |     const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  84  |     expect(canonical).toBe("http://localhost:3000/category/solar-panels");
  85  | 
  86  |     const nodes = await jsonLd(page);
  87  |     expect(typesOf(nodes)).toContain("CollectionPage");
  88  |     expect(typesOf(nodes)).toContain("ItemList");
  89  |     expect(typesOf(nodes)).not.toContain("Product");
  90  | 
  91  |     const collection = nodes.find((node) => node["@type"] === "CollectionPage");
  92  |     const itemList = collection?.mainEntity as JsonLdNode;
  93  |     expect(itemList?.["@type"]).toBe("ItemList");
  94  |     expect(itemList.numberOfItems).toBeGreaterThan(0);
  95  |   });
  96  | 
  97  |   test("home page includes Organization, WebSite and Store markup", async ({ page }) => {
  98  |     const response = await page.goto("/");
  99  |     expect(response?.status()).toBe(200);
  100 | 
  101 |     await expect(page).toHaveTitle(/Solar Home System/);
  102 |     const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  103 |     expect(canonical).toBe("http://localhost:3000/");
  104 | 
  105 |     const nodes = await jsonLd(page);
  106 |     const types = typesOf(nodes);
  107 |     expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "Store"]));
  108 | 
  109 |     const website = nodes.find((node) => node["@type"] === "WebSite");
  110 |     expect(JSON.stringify(website)).toContain("search_term_string");
  111 |   });
  112 | 
  113 |   test("FAQ page renders visible questions and matching FAQPage markup", async ({ page }) => {
  114 |     const response = await page.goto("/faq");
  115 |     expect(response?.status()).toBe(200);
  116 | 
> 117 |     await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  118 |     await expect(page.locator("body")).toContainText("How do I place an order?");
  119 |     await expect(page.locator("body")).toContainText("Do you deliver outside Kigali?");
  120 | 
  121 |     const nodes = await jsonLd(page);
  122 |     const faq = nodes.find((node) => node["@type"] === "FAQPage");
  123 |     expect(faq).toBeTruthy();
  124 |     const questions = faq?.mainEntity as JsonLdNode[];
  125 |     expect(questions.length).toBeGreaterThanOrEqual(5);
  126 |     expect(questions[0]["@type"]).toBe("Question");
  127 |     expect(JSON.stringify(questions)).toContain("How do I place an order?");
  128 |   });
  129 | 
  130 |   test("contact page includes ContactPage markup and real contact details", async ({ page }) => {
  131 |     const response = await page.goto("/contact");
  132 |     expect(response?.status()).toBe(200);
  133 | 
  134 |     await expect(page.getByRole("heading", { name: /Contact Solar Home System/ })).toBeVisible();
  135 |     await expect(page.locator("body")).toContainText("+250788123456");
  136 |     await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
  137 | 
  138 |     const nodes = await jsonLd(page);
  139 |     const contact = nodes.find((node) => node["@type"] === "ContactPage");
  140 |     expect(contact).toBeTruthy();
  141 |     expect(contact?.url).toBe("http://localhost:3000/contact");
  142 |   });
  143 | 
  144 |   test("private pages send noindex headers and meta robots", async ({ page }) => {
  145 |     const response = await page.goto("/cart");
  146 |     expect(response?.status()).toBe(200);
  147 |     expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  148 |     await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
  149 |       "content",
  150 |       /noindex/,
  151 |     );
  152 |   });
  153 | });
  154 | 
  155 | test.describe("discovery files", () => {
  156 |   test("robots.txt follows the configured crawler rules and references the sitemap", async ({
  157 |     request,
  158 |   }) => {
  159 |     const response = await request.get("/robots.txt");
  160 |     expect(response.status()).toBe(200);
  161 |     const text = (await response.text()).toLowerCase();
  162 | 
  163 |     expect(text).toContain("user-agent: googlebot");
  164 |     expect(text).toContain("user-agent: oai-searchbot");
  165 |     expect(text).toContain("user-agent: gptbot");
  166 |     expect(text).toContain("disallow: /admin");
  167 |     expect(text).toContain("sitemap: http://localhost:3000/sitemap.xml");
  168 | 
  169 |     const gptBot = text.slice(text.indexOf("user-agent: gptbot"));
  170 |     expect(gptBot.slice(0, 80)).toContain("disallow: /");
  171 |   });
  172 | 
  173 |   test("sitemap.xml lists storefront URLs", async ({ request }) => {
  174 |     const response = await request.get("/sitemap.xml");
  175 |     expect(response.status()).toBe(200);
  176 |     expect(response.headers()["content-type"]).toContain("xml");
  177 |     const xml = await response.text();
  178 | 
  179 |     expect(xml).toContain("http://localhost:3000/</loc>");
  180 |     expect(xml).toContain("http://localhost:3000/category/solar-panels</loc>");
  181 |     expect(xml).toContain("http://localhost:3000/product/monocrystalline-solar-panel</loc>");
  182 |     expect(xml).toContain("http://localhost:3000/faq</loc>");
  183 |     expect(xml).toContain("<image:image>");
  184 |   });
  185 | 
  186 |   test("llms.txt describes the store, pages and products", async ({ request }) => {
  187 |     const response = await request.get("/llms.txt");
  188 |     expect(response.status()).toBe(200);
  189 |     const text = await response.text();
  190 | 
  191 |     expect(text).toContain("# Solar Home System & Electronic");
  192 |     expect(text).toContain("## Categories");
  193 |     expect(text).toContain("## Pages");
  194 |     expect(text).toContain("## Best-selling products");
  195 |     expect(text).toContain("http://localhost:3000/product/monocrystalline-solar-panel");
  196 |   });
  197 | 
  198 |   test("Merchant XML and TSV feeds expose every variant", async ({ request }) => {
  199 |     const xmlResponse = await request.get("/feeds/google-merchant.xml");
  200 |     expect(xmlResponse.status()).toBe(200);
  201 |     expect(xmlResponse.headers()["content-type"]).toContain("xml");
  202 |     const xml = await xmlResponse.text();
  203 |     expect(xml).toContain("<g:id>MSP-550W-BLUE</g:id>");
  204 |     expect(xml).toContain("<g:price>299.00 USD</g:price>");
  205 |     expect(xml).toContain("<g:availability>in_stock</g:availability>");
  206 |     expect(xml).toContain("<g:country>RW</g:country>");
  207 | 
  208 |     const tsvResponse = await request.get("/feeds/google-merchant.tsv");
  209 |     expect(tsvResponse.status()).toBe(200);
  210 |     expect(tsvResponse.headers()["content-type"]).toContain("tab-separated-values");
  211 |     const tsv = await tsvResponse.text();
  212 |     const [header, firstRow] = tsv.split("\n");
  213 |     expect(header.split("\t")).toEqual(expect.arrayContaining(["id", "title", "price", "brand"]));
  214 |     expect(firstRow.split("\t")[0]).toBe("MSP-550W-BLUE");
  215 |   });
  216 | });
  217 | 
```
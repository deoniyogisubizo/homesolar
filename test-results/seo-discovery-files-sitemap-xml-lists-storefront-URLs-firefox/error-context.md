# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seo.test.ts >> discovery files >> sitemap.xml lists storefront URLs
- Location: tests/e2e/seo.test.ts:173:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "http://localhost:3000/faq</loc>"
Received string:    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">
  <url>
    <loc>http://localhost:3000/</loc>
    <lastmod>2026-11-17T21:34:53.652Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>http://localhost:3000/category/batteries</loc>
    <lastmod>2026-11-17T21:34:49.788Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image><image:loc>http://localhost:3000/images/categories/batteries.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/category/lighting</loc>
    <lastmod>2026-11-17T21:34:49.937Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image><image:loc>http://localhost:3000/images/products/led-solar-bulb.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/category/water-heating</loc>
    <lastmod>2026-11-17T21:34:50.185Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-water-heater.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/category/inverters</loc>
    <lastmod>2026-11-17T21:34:49.404Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image><image:loc>http://localhost:3000/images/categories/inverters.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/category/solar-panels</loc>
    <lastmod>2026-11-17T21:34:48.504Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image><image:loc>http://localhost:3000/images/categories/panels.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/category/accessories</loc>
    <lastmod>2026-11-17T21:34:50.313Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-tool-kit.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-cable</loc>
    <lastmod>2026-11-17T21:34:51.140Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-cable.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/led-solar-bulb</loc>
    <lastmod>2026-11-17T21:34:52.985Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/led-solar-bulb.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-charge-controller</loc>
    <lastmod>2026-11-17T21:34:51.399Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/related-charge-controller.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/off-grid-inverter-5kw</loc>
    <lastmod>2026-11-17T21:34:51.659Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/hybrid-inverter.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/mppt-solar-inverter-3-6kw</loc>
    <lastmod>2026-11-17T21:34:51.937Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/hybrid-inverter.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/bifacial-solar-panel-450w</loc>
    <lastmod>2026-11-17T21:34:50.586Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/monocrystalline-panel.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-panel-cleaning-kit</loc>
    <lastmod>2026-11-17T21:34:50.879Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-tool-kit.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/hybrid-inverter</loc>
    <lastmod>2026-11-17T21:34:51.269Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/related-hybrid-inverter.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/battery-monitor-shunt</loc>
    <lastmod>2026-11-17T21:34:52.724Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-cable.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-garden-light</loc>
    <lastmod>2026-11-17T21:34:53.114Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-garden-light.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-led-light</loc>
    <lastmod>2026-11-17T21:34:52.854Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-led-light.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/portable-solar-panel-200w</loc>
    <lastmod>2026-11-17T21:34:50.732Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/monocrystalline-panel.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-mounting-kit</loc>
    <lastmod>2026-11-17T21:34:51.009Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/related-solar-mounting-kit.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/lithium-battery-100ah</loc>
    <lastmod>2026-11-17T21:34:52.069Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/related-lithium-battery.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/portable-power-station</loc>
    <lastmod>2026-11-17T21:34:51.530Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/portable-power-station.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/pure-sine-wave-inverter-3kw</loc>
    <lastmod>2026-11-17T21:34:51.789Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/hybrid-inverter.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/lifepo4-battery-200ah</loc>
    <lastmod>2026-11-17T21:34:52.334Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/lithium-battery.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/monocrystalline-solar-panel</loc>
    <lastmod>2026-11-17T21:34:53.652Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/monocrystalline-panel-main.jpg</image:loc></image:image>
    <image:image><image:loc>http://localhost:3000/images/products/monocrystalline-panel-thumb-2.jpg</image:loc></image:image>
    <image:image><image:loc>http://localhost:3000/images/products/monocrystalline-panel-thumb-3.jpg</image:loc></image:image>
    <image:image><image:loc>http://localhost:3000/images/products/monocrystalline-panel-thumb-4.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/battery-rack</loc>
    <lastmod>2026-11-17T21:34:52.595Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-mounting-kit.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-tool-kit</loc>
    <lastmod>2026-11-17T21:34:53.379Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-tool-kit.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/deep-cycle-battery-200ah</loc>
    <lastmod>2026-11-17T21:34:52.207Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/lithium-battery.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/gel-battery-150ah</loc>
    <lastmod>2026-11-17T21:34:52.464Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/lithium-battery.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/product/solar-water-heater</loc>
    <lastmod>2026-11-17T21:34:53.252Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <image:image><image:loc>http://localhost:3000/images/products/solar-water-heater.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>http://localhost:3000/contact</loc>
    <lastmod>2026-11-18T13:41:45.590Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>http://localhost:3000/privacy-policy</loc>
    <lastmod>2026-11-18T13:41:45.590Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>http://localhost:3000/terms-and-conditions</loc>
    <lastmod>2026-11-18T13:41:45.590Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>"
```

# Test source

```ts
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
  117 |     await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
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
> 182 |     expect(xml).toContain("http://localhost:3000/faq</loc>");
      |                 ^ Error: expect(received).toContain(expected) // indexOf
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
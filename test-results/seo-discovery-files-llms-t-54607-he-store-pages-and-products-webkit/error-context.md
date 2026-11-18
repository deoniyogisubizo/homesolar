# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seo.test.ts >> discovery files >> llms.txt describes the store, pages and products
- Location: tests/e2e/seo.test.ts:186:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "## Pages"
Received string:    "# Solar Home System & Electronic·
> Solar Home System & Electronic supplies solar panels, inverters, batteries, lighting, water-heating systems and installation accessories for homes and businesses in Rwanda.·
## Categories·
- [Solar Panels](http://localhost:3000/category/solar-panels): 6 products. High-efficiency panels built to turn sunlight into dependable power.
- [Inverters](http://localhost:3000/category/inverters): 6 products. Clean, stable conversion for homes, offices, and off-grid systems.
- [Batteries](http://localhost:3000/category/batteries): 6 products. Reliable storage that keeps your energy available day and night.
- [Lighting](http://localhost:3000/category/lighting): 3 products. Solar-powered lighting for indoors, outdoors, and everything between.
- [Water Heating](http://localhost:3000/category/water-heating): 1 products. Efficient solar water heating for comfortable, lower-cost living.
- [Accessories](http://localhost:3000/category/accessories): 1 products. The cables, mounts, and tools that complete a safe installation.·
## Best-selling products·
- [Bifacial Solar Panel 450W](http://localhost:3000/product/bifacial-solar-panel-450w): USD 229.00. Double-sided generation for rooftops, carports, and ground mounts.
- [Portable Solar Panel 200W](http://localhost:3000/product/portable-solar-panel-200w): USD 159.00. Foldable 200W charging for camping, travel, and backup power.
- [Solar Cable](http://localhost:3000/product/solar-cable): USD 49.00. UV-rated twin-core cable with durable MC4 connectors.
- [Solar Mounting Kit](http://localhost:3000/product/solar-mounting-kit): USD 59.00. Corrosion-resistant rails and clamps for a secure panel install.
- [Solar Panel Cleaning Kit](http://localhost:3000/product/solar-panel-cleaning-kit): USD 39.00. A safe, streak-free cleaning set for keeping panel output high.
- [Off-Grid Inverter 5kW](http://localhost:3000/product/off-grid-inverter-5kw): USD 899.00. Purpose-built off-grid power with a high surge rating.
- [Deep Cycle Battery 200Ah](http://localhost:3000/product/deep-cycle-battery-200ah): USD 349.00. A dependable 200Ah lead-acid battery for daily cycling.
- [Pure Sine Wave Inverter 3kW](http://localhost:3000/product/pure-sine-wave-inverter-3kw): USD 549.00. Clean 3kW output for sensitive electronics and appliances.
- [Portable Power Station](http://localhost:3000/product/portable-power-station): USD 199.00. A compact 500Wh station for outages, travel, and outdoor work.
- [MPPT Solar Inverter 3.6kW](http://localhost:3000/product/mppt-solar-inverter-3-6kw): USD 649.00. A grid-tied inverter with dual MPPT inputs and app monitoring.·
## Contact·
- Store: 123 Renewable Energy Way, Kigali, RW
- Phone: +250788123456
- Email: info@solarhometech.rw
- Opening hours: Monday to Saturday, 8:00 to 18:00·
## Sitemap·
- http://localhost:3000/sitemap.xml
"
```

# Test source

```ts
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
> 193 |     expect(text).toContain("## Pages");
      |                  ^ Error: expect(received).toContain(expected) // indexOf
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
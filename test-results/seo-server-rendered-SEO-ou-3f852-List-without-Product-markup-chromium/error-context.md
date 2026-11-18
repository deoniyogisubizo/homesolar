# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seo.test.ts >> server-rendered SEO output >> category page uses CollectionPage and ItemList without Product markup
- Location: tests/e2e/seo.test.ts:76:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: "ItemList"
Received array: ["CollectionPage", "BreadcrumbList"]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - button "RWF — Rwandan Franc" [ref=e7]: RWF
        - generic [ref=e11]: ENG
        - searchbox "Search products" [ref=e15]
      - link "Solar Home System & Electronic" [ref=e16] [cursor=pointer]:
        - /url: /
        - img "Solar Home System & Electronic" [ref=e17]
      - generic [ref=e18]:
        - link "Account" [ref=e19] [cursor=pointer]:
          - /url: /login
        - generic [ref=e24]:
          - link "0 Wishlist" [ref=e25] [cursor=pointer]:
            - /url: /wishlist
            - generic [ref=e26]: "0"
            - generic [ref=e30]: Wishlist
          - link "0 RWF 0" [ref=e31] [cursor=pointer]:
            - /url: /cart
            - generic [ref=e32]: "0"
            - generic [ref=e39]: RWF 0
    - navigation [ref=e40]:
      - generic [ref=e41]:
        - link "Home" [ref=e43] [cursor=pointer]:
          - /url: /
        - generic [ref=e44]:
          - link "Categories" [ref=e45] [cursor=pointer]:
            - /url: /category/solar-panels
          - generic:
            - link "Solar Panels":
              - /url: /category/solar-panels
            - link "Inverters":
              - /url: /category/inverters
            - link "Batteries":
              - /url: /category/batteries
            - link "Lighting":
              - /url: /category/lighting
            - link "Water Heating":
              - /url: /category/water-heating
            - link "Accessories":
              - /url: /category/accessories
        - generic [ref=e48]:
          - link "Products" [ref=e49] [cursor=pointer]:
            - /url: /search
          - generic:
            - link "Best Selling":
              - /url: /#best-selling
            - link "Featured":
              - /url: /#featured
            - link "All Products":
              - /url: /search
        - generic [ref=e52]:
          - link "Pages" [ref=e53] [cursor=pointer]:
            - /url: "#"
          - generic:
            - link "About Us":
              - /url: "#"
            - link "Contact Us":
              - /url: "#"
            - link "FAQs":
              - /url: "#"
        - link "Blog" [ref=e57] [cursor=pointer]:
          - /url: "#"
        - link "Elements" [ref=e59] [cursor=pointer]:
          - /url: "#"
        - link "About Us" [ref=e61] [cursor=pointer]:
          - /url: "#"
        - link "Buy Rider" [ref=e63] [cursor=pointer]:
          - /url: "#"
  - main [ref=e64]
  - contentinfo [ref=e72]:
    - generic [ref=e73]:
      - generic [ref=e74]:
        - generic [ref=e75]:
          - link "Solar Home System & Electronic" [ref=e76] [cursor=pointer]:
            - /url: /
            - img "Solar Home System & Electronic" [ref=e77]
          - generic [ref=e78]:
            - paragraph [ref=e79]:
              - generic [ref=e83]: 123 Renewable Energy Way, Kigali, RW
            - paragraph [ref=e84]:
              - link "+250788123456" [ref=e87] [cursor=pointer]:
                - /url: tel:+250788123456
            - paragraph [ref=e88]:
              - link "info@solarhometech.rw" [ref=e92] [cursor=pointer]:
                - /url: mailto:info@solarhometech.rw
            - paragraph [ref=e93]: Murakaza neza · Welcome
          - generic [ref=e94]:
            - link "Facebook" [ref=e95] [cursor=pointer]:
              - /url: https://facebook.com
            - link "Instagram" [ref=e98] [cursor=pointer]:
              - /url: https://instagram.com
            - link "X" [ref=e103] [cursor=pointer]:
              - /url: https://x.com
            - link "LinkedIn" [ref=e106] [cursor=pointer]:
              - /url: https://linkedin.com
            - link "YouTube" [ref=e109] [cursor=pointer]:
              - /url: https://youtube.com
            - link "WhatsApp" [ref=e112] [cursor=pointer]:
              - /url: https://wa.me/250788123456?text=Hello%20Solar%20Home%20System%20%26%20Electronic%2C%20I%20have%20a%20question.
        - generic [ref=e115]:
          - heading "About Us" [level=3] [ref=e116]
          - list [ref=e117]:
            - listitem [ref=e118]:
              - link "About Us" [ref=e119] [cursor=pointer]:
                - /url: /about-us
            - listitem [ref=e120]:
              - link "Our Blog" [ref=e121] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e122]:
              - link "FAQs" [ref=e123] [cursor=pointer]:
                - /url: /faq
            - listitem [ref=e124]:
              - link "Contact Us" [ref=e125] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e126]:
              - link "Terms & Conditions" [ref=e127] [cursor=pointer]:
                - /url: /terms-and-conditions
        - generic [ref=e128]:
          - heading "Customer Service" [level=3] [ref=e129]
          - list [ref=e130]:
            - listitem [ref=e131]:
              - link "Shipping & Delivery" [ref=e132] [cursor=pointer]:
                - /url: /shipping-and-delivery
            - listitem [ref=e133]:
              - link "Returns & Refunds" [ref=e134] [cursor=pointer]:
                - /url: /returns-and-refunds
            - listitem [ref=e135]:
              - link "Warranty" [ref=e136] [cursor=pointer]:
                - /url: /warranty
            - listitem [ref=e137]:
              - link "Privacy Policy" [ref=e138] [cursor=pointer]:
                - /url: /privacy-policy
            - listitem [ref=e139]:
              - link "Terms & Conditions" [ref=e140] [cursor=pointer]:
                - /url: /terms-and-conditions
        - generic [ref=e141]:
          - heading "Instagram" [level=3] [ref=e142]
          - link "Instagram" [ref=e143] [cursor=pointer]:
            - /url: "#"
            - img "Solar Home System Instagram" [ref=e144]
      - generic [ref=e145]:
        - generic [ref=e146]:
          - paragraph [ref=e147]: © 2024 Solar Home System & Electronic. All Rights Reserved.
          - link "I am admin" [ref=e149] [cursor=pointer]:
            - /url: /admin/login
        - generic [ref=e150]:
          - link "Facebook" [ref=e151] [cursor=pointer]:
            - /url: https://facebook.com
          - link "Instagram" [ref=e154] [cursor=pointer]:
            - /url: https://instagram.com
          - link "X" [ref=e159] [cursor=pointer]:
            - /url: https://x.com
          - link "LinkedIn" [ref=e162] [cursor=pointer]:
            - /url: https://linkedin.com
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | 
  3   | test.use({ javaScriptEnabled: false });
  4   | 
  5   | type JsonLdNode = Record<string, unknown> & {
  6   |   "@type"?: string | string[];
  7   |   hasVariant?: JsonLdNode[];
  8   |   offers?: Record<string, unknown> | Record<string, unknown>[];
  9   |   mainEntity?: unknown;
  10  | };
  11  | 
  12  | async function jsonLd(page: Page): Promise<JsonLdNode[]> {
  13  |   const contents = await page.locator('script[type="application/ld+json"]').allTextContents();
  14  |   return contents.map((content) => JSON.parse(content) as JsonLdNode);
  15  | }
  16  | 
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
> 88  |     expect(typesOf(nodes)).toContain("ItemList");
      |                            ^ Error: expect(received).toContain(expected) // indexOf
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
  182 |     expect(xml).toContain("http://localhost:3000/faq</loc>");
  183 |     expect(xml).toContain("<image:image>");
  184 |   });
  185 | 
  186 |   test("llms.txt describes the store, pages and products", async ({ request }) => {
  187 |     const response = await request.get("/llms.txt");
  188 |     expect(response.status()).toBe(200);
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.test.ts >> Storefront smoke tests >> 404 page renders for unknown route
- Location: tests/e2e/smoke.test.ts:38:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 200
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - button "RWF — Rwandan Franc" [ref=e8]: RWF
        - generic [ref=e12]: ENG
        - searchbox "Search products" [ref=e16]
      - link "Solar Home System & Electronic" [ref=e17] [cursor=pointer]:
        - /url: /
        - img "Solar Home System & Electronic" [ref=e18]
      - generic [ref=e19]:
        - link "Account" [ref=e20] [cursor=pointer]:
          - /url: /login
        - generic [ref=e25]:
          - link "0 Wishlist" [ref=e26] [cursor=pointer]:
            - /url: /wishlist
            - generic [ref=e27]: "0"
            - generic [ref=e31]: Wishlist
          - link "0 RWF 0" [ref=e32] [cursor=pointer]:
            - /url: /cart
            - generic [ref=e33]: "0"
            - generic [ref=e40]: RWF 0
    - navigation [ref=e41]:
      - generic [ref=e42]:
        - link "Home" [ref=e44] [cursor=pointer]:
          - /url: /
        - generic [ref=e45]:
          - link "Categories" [ref=e46] [cursor=pointer]:
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
        - generic [ref=e49]:
          - link "Products" [ref=e50] [cursor=pointer]:
            - /url: /search
          - generic:
            - link "Best Selling":
              - /url: /#best-selling
            - link "Featured":
              - /url: /#featured
            - link "All Products":
              - /url: /search
        - generic [ref=e53]:
          - link "Pages" [ref=e54] [cursor=pointer]:
            - /url: "#"
          - generic:
            - link "About Us":
              - /url: "#"
            - link "Contact Us":
              - /url: "#"
            - link "FAQs":
              - /url: "#"
        - link "Blog" [ref=e58] [cursor=pointer]:
          - /url: "#"
        - link "Elements" [ref=e60] [cursor=pointer]:
          - /url: "#"
        - link "About Us" [ref=e62] [cursor=pointer]:
          - /url: "#"
        - link "Buy Rider" [ref=e64] [cursor=pointer]:
          - /url: "#"
  - main [ref=e65]:
    - generic [ref=e66]:
      - paragraph [ref=e67]: "404"
      - heading "Page not found" [level=1] [ref=e68]
      - paragraph [ref=e69]: The page you are looking for may have moved. Explore our solar products or head back home.
      - generic [ref=e70]:
        - link "Back home" [ref=e71] [cursor=pointer]:
          - /url: /
        - link "Shop products" [ref=e72] [cursor=pointer]:
          - /url: /search
  - contentinfo [ref=e73]:
    - generic [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e76]:
          - link "Solar Home System & Electronic" [ref=e77] [cursor=pointer]:
            - /url: /
            - img "Solar Home System & Electronic" [ref=e78]
          - generic [ref=e79]:
            - paragraph [ref=e80]:
              - generic [ref=e84]: 123 Renewable Energy Way, Kigali, RW
            - paragraph [ref=e85]:
              - link "+250788123456" [ref=e88] [cursor=pointer]:
                - /url: tel:+250788123456
            - paragraph [ref=e89]:
              - link "info@solarhometech.rw" [ref=e93] [cursor=pointer]:
                - /url: mailto:info@solarhometech.rw
            - paragraph [ref=e94]: Murakaza neza · Welcome
          - generic [ref=e95]:
            - link "Facebook" [ref=e96] [cursor=pointer]:
              - /url: https://facebook.com
            - link "Instagram" [ref=e99] [cursor=pointer]:
              - /url: https://instagram.com
            - link "X" [ref=e104] [cursor=pointer]:
              - /url: https://x.com
            - link "LinkedIn" [ref=e107] [cursor=pointer]:
              - /url: https://linkedin.com
            - link "YouTube" [ref=e110] [cursor=pointer]:
              - /url: https://youtube.com
            - link "WhatsApp" [ref=e113] [cursor=pointer]:
              - /url: https://wa.me/250788123456?text=Hello%20Solar%20Home%20System%20%26%20Electronic%2C%20I%20have%20a%20question.
        - generic [ref=e116]:
          - heading "About Us" [level=3] [ref=e117]
          - list [ref=e118]:
            - listitem [ref=e119]:
              - link "About Us" [ref=e120] [cursor=pointer]:
                - /url: /about-us
            - listitem [ref=e121]:
              - link "Our Blog" [ref=e122] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e123]:
              - link "FAQs" [ref=e124] [cursor=pointer]:
                - /url: /faq
            - listitem [ref=e125]:
              - link "Contact Us" [ref=e126] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e127]:
              - link "Terms & Conditions" [ref=e128] [cursor=pointer]:
                - /url: /terms-and-conditions
        - generic [ref=e129]:
          - heading "Customer Service" [level=3] [ref=e130]
          - list [ref=e131]:
            - listitem [ref=e132]:
              - link "Shipping & Delivery" [ref=e133] [cursor=pointer]:
                - /url: /shipping-and-delivery
            - listitem [ref=e134]:
              - link "Returns & Refunds" [ref=e135] [cursor=pointer]:
                - /url: /returns-and-refunds
            - listitem [ref=e136]:
              - link "Warranty" [ref=e137] [cursor=pointer]:
                - /url: /warranty
            - listitem [ref=e138]:
              - link "Privacy Policy" [ref=e139] [cursor=pointer]:
                - /url: /privacy-policy
            - listitem [ref=e140]:
              - link "Terms & Conditions" [ref=e141] [cursor=pointer]:
                - /url: /terms-and-conditions
        - generic [ref=e142]:
          - heading "Instagram" [level=3] [ref=e143]
          - link "Instagram" [ref=e144] [cursor=pointer]:
            - /url: "#"
            - img "Solar Home System Instagram" [ref=e145]
      - generic [ref=e146]:
        - generic [ref=e147]:
          - paragraph [ref=e148]: © 2024 Solar Home System & Electronic. All Rights Reserved.
          - link "I am admin" [ref=e150] [cursor=pointer]:
            - /url: /admin/login
        - generic [ref=e151]:
          - link "Facebook" [ref=e152] [cursor=pointer]:
            - /url: https://facebook.com
          - link "Instagram" [ref=e155] [cursor=pointer]:
            - /url: https://instagram.com
          - link "X" [ref=e160] [cursor=pointer]:
            - /url: https://x.com
          - link "LinkedIn" [ref=e163] [cursor=pointer]:
            - /url: https://linkedin.com
  - alert [ref=e166]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Storefront smoke tests", () => {
  4  |   test("homepage loads with key sections", async ({ page }) => {
  5  |     await page.goto("/");
  6  |     await expect(page).toHaveTitle(/Solar/);
  7  |     await expect(page.locator("body")).toContainText(/Solar|energy|power/i);
  8  |     await page.screenshot({ path: "test-results/home-desktop.png", fullPage: true });
  9  |   });
  10 | 
  11 |   test("product page loads", async ({ page }) => {
  12 |     await page.goto("/product/monocrystalline-solar-panel");
  13 |     await expect(page.locator("body")).toBeVisible();
  14 |     await expect(page.locator("body")).toContainText(/Solar|Panel|Monocrystalline/i);
  15 |   });
  16 | 
  17 |   test("category page loads", async ({ page }) => {
  18 |     await page.goto("/category/solar-panels");
  19 |     await expect(page.locator("body")).toContainText(/Solar|Panel/i);
  20 |   });
  21 | 
  22 |   test("cart page loads", async ({ page }) => {
  23 |     await page.goto("/cart");
  24 |     await expect(page.locator("body")).toBeVisible();
  25 |   });
  26 | 
  27 |   test("checkout page redirects to cart when empty", async ({ page }) => {
  28 |     await page.goto("/checkout");
  29 |     await expect(page).toHaveURL(/cart|checkout/);
  30 |   });
  31 | 
  32 |   test("admin login page loads", async ({ page }) => {
  33 |     await page.goto("/admin/login");
  34 |     await expect(page.locator('input[type="email"]')).toBeVisible();
  35 |     await expect(page.locator('input[type="password"]')).toBeVisible();
  36 |   });
  37 | 
  38 |   test("404 page renders for unknown route", async ({ page }) => {
  39 |     const response = await page.goto("/this-page-does-not-exist-xyz");
> 40 |     expect(response?.status()).toBe(404);
     |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  41 |   });
  42 | });
  43 | 
  44 | test.describe("Admin dashboard", () => {
  45 |   test("unauthenticated admin redirects to login", async ({ page }) => {
  46 |     await page.goto("/admin");
  47 |     await expect(page).toHaveURL(/admin\/login/);
  48 |   });
  49 | });
```
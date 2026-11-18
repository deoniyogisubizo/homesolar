# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seo.test.ts >> server-rendered SEO output >> home page includes Organization, WebSite and Store markup
- Location: tests/e2e/seo.test.ts:97:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "http://localhost:3000/"
Received: "http://localhost:3000"
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
  - main [ref=e64]:
    - generic [ref=e65]:
      - region "Featured solar solutions" [ref=e66]:
        - generic [ref=e68]:
          - generic [ref=e69]:
            - img "Solar panels installed on a home" [ref=e70]
            - generic [ref=e72]:
              - generic [ref=e73]: BEST SELLERS
              - heading "Solar Home System for a Brighter Future" [level=2] [ref=e74]:
                - generic [ref=e75]:
                  - text: Solar Home System
                  - generic [ref=e76]: for a Brighter Future
              - generic [ref=e77]: Clean Energy. Save More.
              - link "SHOP NOW" [ref=e78] [cursor=pointer]:
                - /url: /search
          - generic [ref=e81]:
            - generic [ref=e82]:
              - paragraph [ref=e83]: NEW COLLECTION
              - heading "SOLAR ENERGY SOLUTIONS" [level=2] [ref=e84]:
                - text: SOLAR ENERGY
                - generic [ref=e85]: SOLUTIONS
              - paragraph [ref=e86]: Power Your Home Sustainably
            - generic [ref=e87]:
              - link "featured product Solar Water Heater RWF 442,442" [ref=e94] [cursor=pointer]:
                - /url: /product/solar-water-heater
                - generic [ref=e95]:
                  - generic [ref=e96]: featured product
                  - paragraph [ref=e98]: Solar Water Heater
                  - paragraph [ref=e99]:
                    - generic [ref=e100]: RWF 442,442
              - link [aria-hidden]:
                - /url: /product/solar-tool-kit
                - generic:
                  - generic: featured product
                  - paragraph: Solar Tool Kit
                  - paragraph:
                    - generic: RWF 87,305
              - link [aria-hidden]:
                - /url: /product/solar-garden-light
                - generic:
                  - generic: featured product
                  - paragraph: Solar Garden Light
                  - paragraph:
                    - generic: RWF 42,912
              - link [aria-hidden]:
                - /url: /product/led-solar-bulb
                - generic:
                  - generic: featured product
                  - paragraph: LED Solar Bulb
                  - paragraph:
                    - generic: RWF 28,115
              - link [aria-hidden]:
                - /url: /product/solar-led-light
                - generic:
                  - generic: featured product
                  - paragraph: Solar LED Light
                  - paragraph:
                    - generic: RWF 72,507
          - generic [ref=e111]:
            - link "Facebook" [ref=e112] [cursor=pointer]:
              - /url: "#"
            - link "X" [ref=e115] [cursor=pointer]:
              - /url: "#"
            - link "Instagram" [ref=e118] [cursor=pointer]:
              - /url: "#"
            - link "LinkedIn" [ref=e123] [cursor=pointer]:
              - /url: "#"
            - link "YouTube" [ref=e126] [cursor=pointer]:
              - /url: "#"
      - generic [ref=e130]:
        - heading "End of Summer Sale" [level=2] [ref=e131]
        - paragraph [ref=e132]: Get 20% off all solar products and accessories. Use promo code SOLAR20 through 9/20. Limitations apply.
        - generic [ref=e133]:
          - link "SHOP SOLAR" [ref=e134] [cursor=pointer]:
            - /url: /category/solar-panels
          - link "SHOP ACCESSORIES" [ref=e137] [cursor=pointer]:
            - /url: /category/accessories
      - generic [ref=e141]:
        - link [ref=e142] [cursor=pointer]:
          - /url: /category/solar-panels
          - generic [ref=e143]:
            - paragraph [ref=e144]: THE SMARTER CHOICE
            - heading "SOLAR POWER" [level=2] [ref=e145]
            - paragraph [ref=e146]: SALE UP TO 30% OFF
            - generic [ref=e147]: SHOP NOW
          - img "SOLAR POWER" [ref=e151]
        - link [ref=e152] [cursor=pointer]:
          - /url: /category/inverters
          - generic [ref=e153]:
            - paragraph [ref=e154]: PREMIUM INVERTERS
            - heading "FOR HOMES & BUSINESS" [level=2] [ref=e155]
            - paragraph [ref=e156]: SALE UP TO 20% OFF
            - generic [ref=e157]: SHOP NOW
          - img "FOR HOMES & BUSINESS" [ref=e161]
      - generic [ref=e164]:
        - article [ref=e165]:
          - link [ref=e166] [cursor=pointer]:
            - /url: /category/solar-panels
            - img "Solar Panels" [ref=e168]
          - generic [ref=e169]:
            - heading [level=3] [ref=e170]:
              - link "Solar Panels" [ref=e171] [cursor=pointer]:
                - /url: /category/solar-panels
            - link "View all Solar Panels" [ref=e173] [cursor=pointer]:
              - /url: /search?q=Solar%20Panels
        - article [ref=e177]:
          - link [ref=e178] [cursor=pointer]:
            - /url: /category/inverters
            - img "Inverters" [ref=e180]
          - generic [ref=e181]:
            - heading [level=3] [ref=e182]:
              - link "Inverters" [ref=e183] [cursor=pointer]:
                - /url: /category/inverters
            - link "View all Inverters" [ref=e185] [cursor=pointer]:
              - /url: /search?q=Inverters
        - article [ref=e189]:
          - link [ref=e190] [cursor=pointer]:
            - /url: /category/batteries
            - img "Batteries" [ref=e192]
          - generic [ref=e193]:
            - heading [level=3] [ref=e194]:
              - link "Batteries" [ref=e195] [cursor=pointer]:
                - /url: /category/batteries
            - link "View all Batteries" [ref=e197] [cursor=pointer]:
              - /url: /search?q=Batteries
      - generic [ref=e202]:
        - heading "Best Selling" [level=2] [ref=e203]
        - generic [ref=e204]:
          - link [ref=e205] [cursor=pointer]:
            - /url: /category/solar-panels
            - img "SOLAR PANELS" [ref=e206]
            - generic [ref=e208]:
              - paragraph [ref=e209]: Featured
              - heading "SOLAR PANELS Collection" [level=3] [ref=e210]:
                - text: SOLAR PANELS
                - generic [ref=e211]: Collection
              - generic [ref=e212]: SHOP NOW
          - article [ref=e215] [cursor=pointer]:
            - generic [ref=e216]:
              - link "Monocrystalline Solar Panel 550W 50% off" [ref=e217]:
                - /url: /product/monocrystalline-solar-panel
                - img "Monocrystalline Solar Panel 550W" [ref=e218]
                - generic [ref=e219]: 50% off
              - generic [ref=e221]:
                - button "Add Monocrystalline Solar Panel 550W to wishlist" [ref=e222]
                - button "Add Monocrystalline Solar Panel 550W to cart" [ref=e225]
            - generic [ref=e231]:
              - link "Monocrystalline Solar Panel" [ref=e232]:
                - /url: /product/monocrystalline-solar-panel
              - paragraph [ref=e233]: High-efficiency solar panel with monocrystalline cells for maximum energy output and durability.
              - paragraph [ref=e234]:
                - generic [ref=e235]: RWF 294,468
                - generic [ref=e236]: RWF 590,416
          - article [ref=e237] [cursor=pointer]:
            - generic [ref=e238]:
              - link [ref=e239]:
                - /url: /product/hybrid-inverter
                - img "Hybrid Solar Inverter" [ref=e240]
              - generic [ref=e242]:
                - button "Add Hybrid Solar Inverter to wishlist" [ref=e243]
                - button "Add Hybrid Solar Inverter to cart" [ref=e246]
            - generic [ref=e252]:
              - link "Hybrid Inverter" [ref=e253]:
                - /url: /product/hybrid-inverter
              - paragraph [ref=e254]: 5KW
              - paragraph [ref=e255]:
                - generic [ref=e256]: RWF 738,390
          - article [ref=e257] [cursor=pointer]:
            - generic [ref=e258]:
              - link "Lithium Battery 100Ah Top" [ref=e259]:
                - /url: /product/lithium-battery-100ah
                - img "Lithium Battery 100Ah" [ref=e260]
                - generic [ref=e261]: Top
              - generic [ref=e263]:
                - button "Add Lithium Battery 100Ah to wishlist" [ref=e264]
                - button "Add Lithium Battery 100Ah to cart" [ref=e267]
            - generic [ref=e273]:
              - link "Lithium Battery 100Ah" [ref=e274]:
                - /url: /product/lithium-battery-100ah
              - paragraph [ref=e275]: LiFePO4
              - paragraph [ref=e276]:
                - generic [ref=e277]: RWF 1,182,312
          - article [ref=e278] [cursor=pointer]:
            - generic [ref=e279]:
              - link "Solar Charge Controller Sale" [ref=e280]:
                - /url: /product/solar-charge-controller
                - img "Solar Charge Controller" [ref=e281]
                - generic [ref=e282]: Sale
              - generic [ref=e284]:
                - button "Add Solar Charge Controller to wishlist" [ref=e285]
                - button "Add Solar Charge Controller to cart" [ref=e288]
            - generic [ref=e294]:
              - link "Solar Charge Controller" [ref=e295]:
                - /url: /product/solar-charge-controller
              - paragraph [ref=e296]: MPPT 40A
              - paragraph [ref=e297]:
                - generic [ref=e298]: RWF 131,697 – RWF 190,886
          - article [ref=e299] [cursor=pointer]:
            - generic [ref=e300]:
              - link [ref=e301]:
                - /url: /product/solar-led-light
                - img "Solar LED Light" [ref=e302]
              - generic [ref=e304]:
                - button "Add Solar LED Light to wishlist" [ref=e305]
                - button "Add Solar LED Light to cart" [ref=e308]
            - generic [ref=e314]:
              - link "Solar LED Light" [ref=e315]:
                - /url: /product/solar-led-light
              - paragraph [ref=e316]: A bright, weather-ready solar light for paths and patios.
              - paragraph [ref=e317]:
                - generic [ref=e318]: RWF 72,507
          - article [ref=e319] [cursor=pointer]:
            - generic [ref=e320]:
              - link "Solar Water Heater Top" [ref=e321]:
                - /url: /product/solar-water-heater
                - img "Solar Water Heater" [ref=e322]
                - generic [ref=e323]: Top
              - generic [ref=e325]:
                - button "Add Solar Water Heater to wishlist" [ref=e326]
                - button "Add Solar Water Heater to cart" [ref=e329]
            - generic [ref=e335]:
              - link "Solar Water Heater" [ref=e336]:
                - /url: /product/solar-water-heater
              - paragraph [ref=e337]: A rooftop solar heater that cuts water-heating bills.
              - paragraph [ref=e338]:
                - generic [ref=e339]: RWF 442,442
      - generic [ref=e341]:
        - heading "Featured" [level=2] [ref=e342]
        - generic [ref=e343]:
          - generic [ref=e344]:
            - article [ref=e345] [cursor=pointer]:
              - generic [ref=e346]:
                - link [ref=e347]:
                  - /url: /product/led-solar-bulb
                  - img "LED Solar Bulb" [ref=e348]
                - generic [ref=e350]:
                  - button "Add LED Solar Bulb to wishlist" [ref=e351]
                  - button "Add LED Solar Bulb to cart" [ref=e354]
              - generic [ref=e360]:
                - link "LED Solar Bulb" [ref=e361]:
                  - /url: /product/led-solar-bulb
                - paragraph [ref=e362]: An efficient solar-charged bulb for sheds, stalls, and rooms.
                - paragraph [ref=e363]:
                  - generic [ref=e364]: RWF 28,115 – RWF 42,912
            - article [ref=e365] [cursor=pointer]:
              - generic [ref=e366]:
                - link [ref=e367]:
                  - /url: /product/portable-power-station
                  - img "Portable Power Station" [ref=e368]
                - generic [ref=e370]:
                  - button "Add Portable Power Station to wishlist" [ref=e371]
                  - button "Add Portable Power Station to cart" [ref=e374]
              - generic [ref=e380]:
                - link "Portable Power Station" [ref=e381]:
                  - /url: /product/portable-power-station
                - paragraph [ref=e382]: A compact 500Wh station for outages, travel, and outdoor work.
                - paragraph [ref=e383]:
                  - generic [ref=e384]: RWF 294,468
            - article [ref=e385] [cursor=pointer]:
              - generic [ref=e386]:
                - link [ref=e387]:
                  - /url: /product/solar-garden-light
                  - img "Solar Garden Light" [ref=e388]
                - generic [ref=e390]:
                  - button "Add Solar Garden Light to wishlist" [ref=e391]
                  - button "Add Solar Garden Light to cart" [ref=e394]
              - generic [ref=e400]:
                - link "Solar Garden Light" [ref=e401]:
                  - /url: /product/solar-garden-light
                - paragraph [ref=e402]: Stake-mounted solar lighting that brightens garden beds.
                - paragraph [ref=e403]:
                  - generic [ref=e404]: RWF 42,912
            - article [ref=e405] [cursor=pointer]:
              - generic [ref=e406]:
                - link [ref=e407]:
                  - /url: /product/solar-cable
                  - img "Solar Cable" [ref=e408]
                - generic [ref=e410]:
                  - button "Add Solar Cable to wishlist" [ref=e411]
                  - button "Add Solar Cable to cart" [ref=e414]
              - generic [ref=e420]:
                - link "Solar Cable" [ref=e421]:
                  - /url: /product/solar-cable
                - paragraph [ref=e422]: UV-rated twin-core cable with durable MC4 connectors.
                - paragraph [ref=e423]:
                  - generic [ref=e424]: RWF 72,507 – RWF 116,899
            - article [ref=e425] [cursor=pointer]:
              - generic [ref=e426]:
                - link [ref=e427]:
                  - /url: /product/solar-tool-kit
                  - img "Solar Tool Kit" [ref=e428]
                - generic [ref=e430]:
                  - button "Add Solar Tool Kit to wishlist" [ref=e431]
                  - button "Add Solar Tool Kit to cart" [ref=e434]
              - generic [ref=e440]:
                - link "Solar Tool Kit" [ref=e441]:
                  - /url: /product/solar-tool-kit
                - paragraph [ref=e442]: The essential hand tools for safe solar installations.
                - paragraph [ref=e443]:
                  - generic [ref=e444]: RWF 87,305
            - article [ref=e445] [cursor=pointer]:
              - generic [ref=e446]:
                - link [ref=e447]:
                  - /url: /product/solar-mounting-kit
                  - img "Solar Mounting Kit" [ref=e448]
                - generic [ref=e450]:
                  - button "Add Solar Mounting Kit to wishlist" [ref=e451]
                  - button "Add Solar Mounting Kit to cart" [ref=e454]
              - generic [ref=e460]:
                - link "Solar Mounting Kit" [ref=e461]:
                  - /url: /product/solar-mounting-kit
                - paragraph [ref=e462]: For Roof
                - paragraph [ref=e463]:
                  - generic [ref=e464]: RWF 87,305 – RWF 146,494
          - link [ref=e465] [cursor=pointer]:
            - /url: /category/inverters
            - img "SOLAR SYSTEM" [ref=e466]
            - generic [ref=e468]:
              - paragraph [ref=e469]: Featured
              - heading "SOLAR SYSTEM 2021 Collection" [level=3] [ref=e470]:
                - text: SOLAR SYSTEM
                - generic [ref=e471]: 2021 Collection
              - generic [ref=e472]: SHOP NOW
      - heading "Explore Products" [level=2] [ref=e477]
      - generic [ref=e488]:
        - heading "Meet Us in Real Life" [level=2] [ref=e489]
        - generic [ref=e491]:
          - paragraph [ref=e492]: SUBSCRIBE TO OUR
          - heading "NEWSLETTER" [level=3] [ref=e493]
          - paragraph [ref=e494]: Stay updated on the latest solar solutions.
          - generic [ref=e495]:
            - generic [ref=e496]:
              - textbox "Enter your email" [ref=e497]
              - button "SUBSCRIBE" [ref=e498]
            - paragraph [ref=e499]
      - generic [ref=e501]:
        - heading "The Best Clients" [level=2] [ref=e502]
        - generic [ref=e503]:
          - link "Solar & Energy" [ref=e504] [cursor=pointer]:
            - /url: "#"
            - img "Solar & Energy" [ref=e505]
          - link "Green Power" [ref=e506] [cursor=pointer]:
            - /url: "#"
            - img "Green Power" [ref=e507]
          - link "EcoSolar" [ref=e508] [cursor=pointer]:
            - /url: "#"
            - img "EcoSolar" [ref=e509]
          - link "SunTech" [ref=e510] [cursor=pointer]:
            - /url: "#"
            - img "SunTech" [ref=e511]
          - link "SolMax" [ref=e512] [cursor=pointer]:
            - /url: "#"
            - img "SolMax" [ref=e513]
          - link "PowerGreen" [ref=e514] [cursor=pointer]:
            - /url: "#"
            - img "PowerGreen" [ref=e515]
  - contentinfo [ref=e516]:
    - generic [ref=e517]:
      - generic [ref=e518]:
        - generic [ref=e519]:
          - link "Solar Home System & Electronic" [ref=e520] [cursor=pointer]:
            - /url: /
            - img "Solar Home System & Electronic" [ref=e521]
          - generic [ref=e522]:
            - paragraph [ref=e523]:
              - generic [ref=e527]: 123 Renewable Energy Way, Kigali, RW
            - paragraph [ref=e528]:
              - link "+250788123456" [ref=e531] [cursor=pointer]:
                - /url: tel:+250788123456
            - paragraph [ref=e532]:
              - link "info@solarhometech.rw" [ref=e536] [cursor=pointer]:
                - /url: mailto:info@solarhometech.rw
            - paragraph [ref=e537]: Murakaza neza · Welcome
          - generic [ref=e538]:
            - link "Facebook" [ref=e539] [cursor=pointer]:
              - /url: https://facebook.com
            - link "Instagram" [ref=e542] [cursor=pointer]:
              - /url: https://instagram.com
            - link "X" [ref=e547] [cursor=pointer]:
              - /url: https://x.com
            - link "LinkedIn" [ref=e550] [cursor=pointer]:
              - /url: https://linkedin.com
            - link "YouTube" [ref=e553] [cursor=pointer]:
              - /url: https://youtube.com
            - link "WhatsApp" [ref=e556] [cursor=pointer]:
              - /url: https://wa.me/250788123456?text=Hello%20Solar%20Home%20System%20%26%20Electronic%2C%20I%20have%20a%20question.
        - generic [ref=e559]:
          - heading "About Us" [level=3] [ref=e560]
          - list [ref=e561]:
            - listitem [ref=e562]:
              - link "About Us" [ref=e563] [cursor=pointer]:
                - /url: /about-us
            - listitem [ref=e564]:
              - link "Our Blog" [ref=e565] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e566]:
              - link "FAQs" [ref=e567] [cursor=pointer]:
                - /url: /faq
            - listitem [ref=e568]:
              - link "Contact Us" [ref=e569] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e570]:
              - link "Terms & Conditions" [ref=e571] [cursor=pointer]:
                - /url: /terms-and-conditions
        - generic [ref=e572]:
          - heading "Customer Service" [level=3] [ref=e573]
          - list [ref=e574]:
            - listitem [ref=e575]:
              - link "Shipping & Delivery" [ref=e576] [cursor=pointer]:
                - /url: /shipping-and-delivery
            - listitem [ref=e577]:
              - link "Returns & Refunds" [ref=e578] [cursor=pointer]:
                - /url: /returns-and-refunds
            - listitem [ref=e579]:
              - link "Warranty" [ref=e580] [cursor=pointer]:
                - /url: /warranty
            - listitem [ref=e581]:
              - link "Privacy Policy" [ref=e582] [cursor=pointer]:
                - /url: /privacy-policy
            - listitem [ref=e583]:
              - link "Terms & Conditions" [ref=e584] [cursor=pointer]:
                - /url: /terms-and-conditions
        - generic [ref=e585]:
          - heading "Instagram" [level=3] [ref=e586]
          - link "Instagram" [ref=e587] [cursor=pointer]:
            - /url: "#"
            - img "Solar Home System Instagram" [ref=e588]
      - generic [ref=e589]:
        - generic [ref=e590]:
          - paragraph [ref=e591]: © 2024 Solar Home System & Electronic. All Rights Reserved.
          - link "I am admin" [ref=e593] [cursor=pointer]:
            - /url: /admin/login
        - generic [ref=e594]:
          - link "Facebook" [ref=e595] [cursor=pointer]:
            - /url: https://facebook.com
          - link "Instagram" [ref=e598] [cursor=pointer]:
            - /url: https://instagram.com
          - link "X" [ref=e603] [cursor=pointer]:
            - /url: https://x.com
          - link "LinkedIn" [ref=e606] [cursor=pointer]:
            - /url: https://linkedin.com
```

# Test source

```ts
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
> 103 |     expect(canonical).toBe("http://localhost:3000/");
      |                       ^ Error: expect(received).toBe(expected) // Object.is equality
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
```
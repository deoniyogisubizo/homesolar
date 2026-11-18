import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  "/",
  "/cart",
  "/checkout",
  "/search",
  "/category/solar-panels",
  "/product/monocrystalline-solar-panel",
  "/login",
];

for (const page of PAGES) {
  test.describe(`a11y: ${page}`, () => {
    test("no critical a11y violations", async ({ page: browserPage }) => {
      await browserPage.goto(page);
      await expect(browserPage.locator("body")).toBeVisible();

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");

      expect(critical).toHaveLength(0);
    });
  });
}
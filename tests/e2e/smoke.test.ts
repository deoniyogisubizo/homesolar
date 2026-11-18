import { test, expect } from "@playwright/test";

test.describe("Storefront smoke tests", () => {
  test("homepage loads with key sections", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Solar/);
    await expect(page.locator("body")).toContainText(/Solar|energy|power/i);
    await page.screenshot({ path: "test-results/home-desktop.png", fullPage: true });
  });

  test("product page loads", async ({ page }) => {
    await page.goto("/product/monocrystalline-solar-panel");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).toContainText(/Solar|Panel|Monocrystalline/i);
  });

  test("category page loads", async ({ page }) => {
    await page.goto("/category/solar-panels");
    await expect(page.locator("body")).toContainText(/Solar|Panel/i);
  });

  test("cart page loads", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("body")).toBeVisible();
  });

  test("checkout page redirects to cart when empty", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/cart|checkout/);
  });

  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("404 page renders for unknown route", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-xyz");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Admin dashboard", () => {
  test("unauthenticated admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/admin\/login/);
  });
});
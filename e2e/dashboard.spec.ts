import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("welcome heading visible", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Welcome back");
  });

  test("stat cards render", async ({ page }) => {
    await expect(page.locator("text=Total listings")).toBeVisible();
    await expect(page.locator("text=Published")).toBeVisible();
    await expect(page.getByText("Offers", { exact: true })).toBeVisible();
  });

  test("reach and clicks cards render", async ({ page }) => {
    await expect(page.getByText("Reach", { exact: true })).toBeVisible();
    await expect(page.locator("text=unique viewers")).toBeVisible();
  });

  test("portfolio value tile renders", async ({ page }) => {
    // Admin sees "Total market value", sellers see "Portfolio value"
    await expect(
      page.locator("text=Total market value, text=Portfolio value").first(),
    ).toBeVisible({ timeout: 5000 }).catch(() =>
      expect(
        page.locator(':text("market value"), :text("Portfolio value")').first(),
      ).toBeVisible(),
    );
  });

  test("My listings and New listing nav links visible", async ({ page }) => {
    await expect(page.getByRole("link", { name: "My listings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New listing" }).first()).toBeVisible();
  });
});

test.describe("view tracking", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("listing detail shows reach and clicks row", async ({ page }) => {
    await page.goto("/listings");
    await page.waitForLoadState("networkidle");

    const listingLinks = page.locator(
      'a[href*="/listings/"]:not([href="/listings/new"])',
    );
    const count = await listingLinks.count();
    test.skip(count === 0, "No listings to test view tracking");

    const href = await listingLinks.first().getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=reach")).toBeVisible();
    await expect(page.locator("text=clicks")).toBeVisible();
  });

  test("reach and clicks are numeric", async ({ page }) => {
    await page.goto("/listings");
    await page.waitForLoadState("networkidle");

    const listingLinks = page.locator(
      'a[href*="/listings/"]:not([href="/listings/new"])',
    );
    const count = await listingLinks.count();
    test.skip(count === 0, "No listings to test view tracking");

    const href = await listingLinks.first().getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    // Find the reach/clicks container and verify both have numeric values
    const reachText = await page.locator("text=reach").locator("..").textContent();
    const clicksText = await page.locator("text=clicks").locator("..").textContent();

    expect(reachText).toMatch(/\d/);
    expect(clicksText).toMatch(/\d/);
  });
});

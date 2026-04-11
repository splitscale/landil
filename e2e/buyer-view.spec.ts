import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsBuyer, BUYER_USERNAME } from "./helpers/auth";

// ── Direct buyer login ────────────────────────────────────────────────────────

test.describe("buyer — direct login", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBuyer(page);
  });

  test("lands on browse page after login", async ({ page }) => {
    expect(page.url()).toMatch(/\/$/);
    await expect(page.locator("h1")).toContainText("Browse listings");
  });

  test("no Admin nav link visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const adminLink = page.getByRole("link", { name: /^Admin$/i });
    await expect(adminLink).toHaveCount(0);
  });

  test("no My listings nav link visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const listingsLink = page.getByRole("link", { name: /My listings/i });
    await expect(listingsLink).toHaveCount(0);
  });

  test("/listings redirects away (buyer has no seller role)", async ({ page }) => {
    await page.goto("/listings");
    await page.waitForLoadState("networkidle");
    // requireRole redirects non-sellers to /
    expect(page.url()).not.toContain("/listings");
  });

  test("/admin redirects away", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/admin");
  });

  test("browse page shows listing count and offer stats", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/properties available/")).toBeVisible();
    await expect(page.locator("text=/active offer/")).toBeVisible();
    await expect(page.locator("text=/tracked/")).toBeVisible();
  });

  test("public profile route renders without crash", async ({ page }) => {
    await page.goto(`/u/${BUYER_USERNAME}`);
    await page.waitForLoadState("networkidle");
    // purdyBuyer has no username set in DB, so /u/purdyBuyer shows the 404 page —
    // assert the page rendered (not a blank/error screen)
    await expect(page.locator("text=404")).toBeVisible();
  });
});

// ── Buyer view via impersonation ──────────────────────────────────────────────

test.describe("buyer — via impersonation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    // Find and impersonate the buyer
    const buyerRow = page
      .locator("tbody tr")
      .filter({ hasText: BUYER_USERNAME });
    await buyerRow.locator("button").last().click();
    await page.waitForTimeout(400);
    await page.getByRole("menuitem", { name: /impersonate/i }).click();
    await page.waitForURL("**/", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
  });

  test("impersonation banner visible", async ({ page }) => {
    await expect(page.locator("text=/Admin mode/i").first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Exit" })).toBeVisible();
  });

  test("no Admin nav link while impersonating buyer", async ({ page }) => {
    const adminLink = page.getByRole("link", { name: /^Admin$/i });
    await expect(adminLink).toHaveCount(0);
  });

  test("no My listings nav link while impersonating buyer", async ({ page }) => {
    const listingsLink = page.getByRole("link", { name: /My listings/i });
    await expect(listingsLink).toHaveCount(0);
  });

  test("/listings redirects while impersonating buyer", async ({ page }) => {
    await page.goto("/listings");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/listings");
  });

  test("exit impersonation returns to /admin/users", async ({ page }) => {
    await page.locator("button", { hasText: "Exit" }).click();
    await page.waitForURL("**/admin/users", { timeout: 10000 });
    expect(page.url()).toContain("/admin/users");
    // Banner gone
    await expect(page.locator("text=/Impersonating/i").first()).toHaveCount(0);
  });
});

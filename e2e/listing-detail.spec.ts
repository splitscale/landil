import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("listing detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("detail page shows Documents and Offers", async ({ page }) => {
    await page.goto("/listings");
    await page.waitForLoadState("networkidle");

    const listingLinks = page.locator(
      'a[href*="/listings/"]:not([href="/listings/new"])',
    );
    const count = await listingLinks.count();
    test.skip(count === 0, "No listings found for this user");

    const href = await listingLinks.first().getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("text=Documents")).toBeVisible();

    // Offers — link for pro/admin, locked span for free
    await expect(
      page.locator('a[href*="/offers"], span:has-text("Offers")').first(),
    ).toBeVisible({ timeout: 5000 });
  });
});

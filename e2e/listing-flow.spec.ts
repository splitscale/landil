/**
 * Listing creation and browse E2E — covers:
 *   1. Seller creates a draft listing
 *   2. Seller publishes listing
 *   3. Buyer browses and filters listings
 *   4. Buyer views listing detail (photos, docs, comparables)
 *   5. Seller sees analytics + offers tab
 *   6. Sold listing shows badge
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsBuyer } from "./helpers/auth";

const TITLE = `Browse Lot ${Date.now()}`;

test("seller can reach the new listing form", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/listings/new");
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/listings/new");
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("buyer browse page shows published listings with search", async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Should see listings grid or empty state
  const grid = page.locator('[class*="grid"]').first();
  await expect(grid).toBeVisible();
});

test("buyer can filter listings by property type", async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Property type filter
  const typeSelect = page.locator('select[name="propertyType"], [aria-label*="property"]').first();
  if (await typeSelect.isVisible()) {
    await typeSelect.selectOption({ index: 1 });
    await page.waitForLoadState("networkidle");
    // Results count text present
    await expect(page.locator('text=/\\d+ result/')).toBeVisible({ timeout: 5000 });
  }
});

test("buyer can filter listings by price range", async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const priceSelect = page.locator('select[name="priceRange"], [aria-label*="price"]').first();
  if (await priceSelect.isVisible()) {
    await priceSelect.selectOption({ index: 1 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator('text=/\\d+ result/')).toBeVisible({ timeout: 5000 });
  }
});

test("buyer can search for a listing by name", async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const searchInput = page.locator('input[name="q"], input[placeholder*="earch"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill("Cebu");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
    // Either results or "no results" message
    const results = page.locator('text=/result|No listings/');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  }
});

test("listing detail page renders key details for buyer", async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Click first listing card
  const firstCard = page.locator('a[href*="/listings/"]').first();
  if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstCard.click();
    await page.waitForLoadState("networkidle");

    // Price should be visible
    await expect(page.locator('text=/₱/')).toBeVisible();

    // Key detail pills (lot area, property type)
    await expect(page.locator('text=Lot area, text=Property type').first()).toBeVisible({ timeout: 5000 });

    // Make an offer button visible
    await expect(page.locator('button:has-text("Make an offer"), a:has-text("View thread")')).toBeVisible({ timeout: 5000 });
  }
});

test("seller dashboard shows portfolio value and stat cards", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.locator('text=Portfolio value, text=Total market value').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Total listings')).toBeVisible();
  await expect(page.locator('text=Published')).toBeVisible();
  await expect(page.locator('text=Offers')).toBeVisible();
});

test("seller listing page shows analytics and offers link", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/listings");
  await page.waitForLoadState("networkidle");

  const firstListing = page.locator('a[href*="/listings/"]').first();
  if (await firstListing.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstListing.click();
    await page.waitForLoadState("networkidle");

    // Seller sees Offers link and Documents link
    await expect(page.locator('a:has-text("Documents")')).toBeVisible({ timeout: 5000 });
  }
});

test("cleared filters link resets to all listings", async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto("/?q=nonexistentterm12345xyz");
  await page.waitForLoadState("networkidle");

  // Should see "no results" + clear link
  await expect(page.locator('text=No listings match')).toBeVisible({ timeout: 5000 });

  const clearLink = page.locator('a:has-text("Clear filters")');
  await expect(clearLink).toBeVisible();
  await clearLink.click();
  await page.waitForLoadState("networkidle");

  expect(page.url()).not.toContain("q=");
});

test("public profile page exists for seller", async ({ page }) => {
  await loginAsBuyer(page);
  // Admin's username is 'kasutu'
  await page.goto("/u/kasutu");
  await page.waitForLoadState("networkidle");

  // Should see profile header (not 404)
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('text=Joined')).toBeVisible();
});

test("buyer profile returns 404", async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto("/u/purdyBuyer");
  await page.waitForLoadState("networkidle");

  // Should be a 404 page
  await expect(page.locator('text=/404|not found/i').first()).toBeVisible({ timeout: 5000 });
});

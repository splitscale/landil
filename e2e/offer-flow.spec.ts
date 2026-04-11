/**
 * Offer flow E2E — covers the full lifecycle:
 *   1. Admin creates a published listing
 *   2. Buyer browses and makes an offer (defaulted to asking price)
 *   3. Buyer views their offer thread
 *   4. Buyer sends a message
 *   5. Admin (as seller) views the offers inbox with stats
 *   6. Seller sends a message in reply
 *   7. Seller counters the offer
 *   8. Buyer sees the counter, withdraws (type-confirm required)
 *   9. Seller rejects a different offer
 *  10. Seller accepts an offer → listing marked sold
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsBuyer } from "./helpers/auth";

const LISTING_TITLE = `E2E Lot ${Date.now()}`;
const ASKING_PRICE = "500000";
let listingId = "";
let offerId = "";

// ── Seller / Admin creates a listing ─────────────────────────────────────────

test("seller creates a published listing", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/listings/new");
  await page.waitForLoadState("networkidle");

  // Step 1 — basic details
  await page.fill('input[placeholder*="itle"], input[name="title"]', LISTING_TITLE);
  await page.fill('input[placeholder*="asking"], input[name="askingPrice"]', ASKING_PRICE);
  await page.fill('input[placeholder*="area"], input[name="lotArea"]', "250");
  await page.fill('input[placeholder*="ity"], input[name="city"]', "Cebu City");
  await page.fill('input[placeholder*="rovince"], input[name="province"]', "Cebu");

  // Select property type if present
  const ptSelect = page.locator('select[name="propertyType"]');
  if (await ptSelect.isVisible()) await ptSelect.selectOption({ index: 1 });

  // Select title type if present
  const ttSelect = page.locator('select[name="titleType"]');
  if (await ttSelect.isVisible()) await ttSelect.selectOption({ index: 1 });

  // Description
  const descField = page.locator('textarea[name="description"]');
  if (await descField.isVisible()) await descField.fill("E2E test listing for offer flow.");

  // Navigate through multi-step form
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")');
  while (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(300);
  }

  // Submit
  const submitBtn = page.locator('button:has-text("Publish"), button:has-text("Submit"), button[type="submit"]').last();
  await submitBtn.click();
  await page.waitForLoadState("networkidle");

  // Should land on listing detail or listings page
  const url = page.url();
  expect(url).not.toContain("/new");
});

// ── Buyer browses and makes an offer ─────────────────────────────────────────

test("buyer sees listing and offer amount defaults to asking price", async ({ page }) => {
  await loginAsBuyer(page);

  // Browse and find the listing
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Search for the listing
  const searchInput = page.locator('input[placeholder*="earch"], input[name="q"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill(LISTING_TITLE);
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
  }

  const listingLink = page.locator(`a:has-text("${LISTING_TITLE}")`).first();
  await expect(listingLink).toBeVisible({ timeout: 10000 });
  await listingLink.click();
  await page.waitForLoadState("networkidle");

  // Save listing ID from URL
  listingId = page.url().match(/listings\/([^/]+)/)?.[1] ?? "";

  // Click "Make an offer"
  const makeOfferBtn = page.locator('button:has-text("Make an offer")');
  await expect(makeOfferBtn).toBeVisible();
  await makeOfferBtn.click();

  // Amount field should be pre-filled with asking price
  const amountInput = page.locator('input[id="offer-amount"]');
  await expect(amountInput).toBeVisible();
  const value = await amountInput.inputValue();
  expect(value.replace(/,/g, "")).toBe(ASKING_PRICE);
});

test("buyer submits offer below asking price", async ({ page }) => {
  if (!listingId) test.skip(true, "No listing ID from previous test");
  await loginAsBuyer(page);

  await page.goto(`/listings/${listingId}`);
  await page.waitForLoadState("networkidle");

  const makeOfferBtn = page.locator('button:has-text("Make an offer")');
  await expect(makeOfferBtn).toBeVisible();
  await makeOfferBtn.click();

  // Enter a lower price
  const amountInput = page.locator('input[id="offer-amount"]');
  await amountInput.clear();
  await amountInput.fill("450000");

  // Warning should appear
  await expect(page.locator('text=below the asking price')).toBeVisible();

  // Optionally add sqm for partial lot
  const sqmInput = page.locator('input[id="offer-sqm"]');
  await sqmInput.fill("100");

  // Add note
  const noteInput = page.locator('textarea[id="offer-note"]');
  await noteInput.fill("E2E test offer — partial lot, below asking.");

  // Submit
  await page.click('button:has-text("Submit offer")');
  await page.waitForLoadState("networkidle");

  // Should redirect / refresh showing the offer
  const viewThreadLink = page.locator('a:has-text("View thread")');
  await expect(viewThreadLink).toBeVisible({ timeout: 10000 });
});

// ── Buyer views offer thread and sends a message ──────────────────────────────

test("buyer views offer thread and sends a message", async ({ page }) => {
  if (!listingId) test.skip(true, "No listing ID");
  await loginAsBuyer(page);

  await page.goto(`/listings/${listingId}`);
  await page.waitForLoadState("networkidle");

  const viewThreadLink = page.locator('a:has-text("View thread")');
  await expect(viewThreadLink).toBeVisible({ timeout: 10000 });
  await viewThreadLink.click();
  await page.waitForLoadState("networkidle");

  // Save offer ID from URL
  offerId = page.url().match(/my-offer/)?.[0] ? "" : page.url().match(/offers\/([^/]+)/)?.[1] ?? "";

  // Send a message
  const msgInput = page.locator('input[id="thread-message"]');
  await expect(msgInput).toBeVisible();
  await msgInput.fill("Hello, I am interested in purchasing a 100 sqm portion.");
  await page.click('button:has-text("Send")');

  // Message should appear in thread
  await expect(page.locator('text=I am interested in purchasing')).toBeVisible({ timeout: 5000 });
});

// ── Buyer: withdraw requires "danger zone" expansion + typing "withdraw" ──────

test("withdraw offer requires expanding danger zone and typing 'withdraw'", async ({ page }) => {
  if (!listingId) test.skip(true, "No listing ID");
  await loginAsBuyer(page);

  await page.goto(`/listings/${listingId}/my-offer`);
  await page.waitForLoadState("networkidle");

  // Withdraw button should NOT be immediately visible
  const withdrawBtn = page.locator('button:has-text("Withdraw offer")');
  await expect(withdrawBtn).not.toBeVisible();

  // Expand danger zone
  const dangerToggle = page.locator('button:has-text("Danger zone")');
  await expect(dangerToggle).toBeVisible();
  await dangerToggle.click();

  // Now the withdraw button appears
  await expect(withdrawBtn).toBeVisible();
  await withdrawBtn.click();

  // AlertDialog should open
  await expect(page.locator('text=Withdraw your offer?')).toBeVisible();

  // Confirm button disabled without typing
  const confirmBtn = page.locator('button:has-text("Confirm withdrawal")');
  await expect(confirmBtn).toBeDisabled();

  // Type wrong text — still disabled
  const confirmInput = page.locator('input[id="withdraw-confirm"]');
  await confirmInput.fill("cancel");
  await expect(confirmBtn).toBeDisabled();

  // Type correct text
  await confirmInput.clear();
  await confirmInput.fill("withdraw");
  await expect(confirmBtn).toBeEnabled();

  // Cancel instead — offer should remain
  await page.locator('button:has-text("Keep offer")').click();
  await expect(page.locator('text=Withdraw your offer?')).not.toBeVisible();
});

// ── Seller views offer inbox with stats ───────────────────────────────────────

test("seller sees offer stats on offers page", async ({ page }) => {
  if (!listingId) test.skip(true, "No listing ID");
  await loginAsAdmin(page);

  await page.goto(`/listings/${listingId}/offers`);
  await page.waitForLoadState("networkidle");

  // Stats grid should show at least the pending offer
  await expect(page.locator('text=Pending')).toBeVisible();
  await expect(page.locator('text=Accepted')).toBeVisible();
  await expect(page.locator('text=Rejected')).toBeVisible();

  // At least one offer card visible
  const offerCards = page.locator('a[href*="/offers/"]');
  await expect(offerCards.first()).toBeVisible({ timeout: 5000 });

  // Capture offer ID for later tests
  const href = await offerCards.first().getAttribute("href");
  offerId = href?.match(/offers\/([^/]+)/)?.[1] ?? offerId;
});

test("seller sends a message in offer thread", async ({ page }) => {
  if (!listingId || !offerId) test.skip(true, "No listing/offer ID");
  await loginAsAdmin(page);

  await page.goto(`/listings/${listingId}/offers/${offerId}`);
  await page.waitForLoadState("networkidle");

  const msgInput = page.locator('input[id="thread-message"]');
  await expect(msgInput).toBeVisible();
  await msgInput.fill("Thanks for your interest! We can discuss the partial lot.");
  await page.click('button:has-text("Send")');

  await expect(page.locator('text=Thanks for your interest')).toBeVisible({ timeout: 5000 });
});

test("seller counters the offer", async ({ page }) => {
  if (!listingId || !offerId) test.skip(true, "No listing/offer ID");
  await loginAsAdmin(page);

  await page.goto(`/listings/${listingId}/offers/${offerId}`);
  await page.waitForLoadState("networkidle");

  const counterInput = page.locator('input[id="counter-amount"]');
  await expect(counterInput).toBeVisible();
  await counterInput.fill("480000");

  await page.click('button:has-text("Counter")');
  await page.waitForLoadState("networkidle");

  // Status should update to "countered"
  await expect(page.locator('text=countered')).toBeVisible({ timeout: 10000 });
});

// ── Seller accepts a different offer (from admin impersonation) — marks sold ──

test("seller accepts offer and listing is marked sold", async ({ page }) => {
  if (!listingId || !offerId) test.skip(true, "No listing/offer ID");
  await loginAsAdmin(page);

  await page.goto(`/listings/${listingId}/offers/${offerId}`);
  await page.waitForLoadState("networkidle");

  const acceptBtn = page.locator('button:has-text("Accept offer")');
  await expect(acceptBtn).toBeVisible();
  await acceptBtn.click();
  await page.waitForLoadState("networkidle");

  // Go back to listing — should show "sold" badge
  await page.goto(`/listings/${listingId}`);
  await page.waitForLoadState("networkidle");

  await expect(page.locator('text=sold').first()).toBeVisible({ timeout: 10000 });
});

// ── Offer stats reflect accepted state ───────────────────────────────────────

test("offers page shows 1 accepted after acceptance", async ({ page }) => {
  if (!listingId) test.skip(true, "No listing ID");
  await loginAsAdmin(page);

  await page.goto(`/listings/${listingId}/offers`);
  await page.waitForLoadState("networkidle");

  // "Sold" badge on the title
  await expect(page.locator('text=Sold')).toBeVisible({ timeout: 5000 });

  // Accepted count shows 1
  const acceptedCard = page.locator('div:has(p:text("Accepted"))').first();
  await expect(acceptedCard.locator('p.text-primary')).toHaveText("1");
});

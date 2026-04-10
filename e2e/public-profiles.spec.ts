import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test("admin badge visible on own profile", async ({ page }) => {
  await page.goto("/u/kasutu");
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator("span.text-destructive", { hasText: "Admin" }).first(),
  ).toBeVisible();
});

test("buyer profile page loads", async ({ page }) => {
  await page.goto("/u/purdybuyer");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1").first()).toBeVisible();
});

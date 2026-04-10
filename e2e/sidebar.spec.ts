import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test("sidebar trigger is visible", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator('button[data-sidebar="trigger"]')).toBeVisible();
});

test("sidebar collapses to icon rail on trigger click", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const trigger = page.locator('button[data-sidebar="trigger"]');
  await trigger.click();
  await page.waitForTimeout(400);
  await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible();
});

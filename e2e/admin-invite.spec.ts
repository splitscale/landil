import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");
  await page.waitForLoadState("networkidle");
});

test("invite dialog opens", async ({ page }) => {
  await page.getByRole("button", { name: /Invite admin/i }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("generate invite then revoke removes it", async ({ page }) => {
  await page.getByRole("button", { name: /Invite admin/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Generate/i }).click();
  await page.waitForTimeout(1500);

  // Wait for the new invite row to appear before counting
  const revokeBtn = page.getByRole("dialog").locator('button[title="Revoke"]');
  await expect(revokeBtn.first()).toBeVisible({ timeout: 5000 });

  const countBefore = await revokeBtn.count();
  expect(countBefore).toBeGreaterThan(0);

  await revokeBtn.first().click();
  // Wait for the revoked row to disappear
  await expect(page.getByRole("dialog").locator('button[title="Revoke"]')).toHaveCount(countBefore - 1, { timeout: 5000 });

  await page.keyboard.press("Escape");
});

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

  const revokeBtn = page.getByRole("dialog").locator('button[title="Revoke"]');
  expect(await revokeBtn.count()).toBeGreaterThan(0);

  const countBefore = await revokeBtn.count();
  await revokeBtn.first().click();
  await page.waitForTimeout(2000);
  const countAfter = await page
    .getByRole("dialog")
    .locator('button[title="Revoke"]')
    .count();
  expect(countAfter).toBeLessThan(countBefore);

  await page.keyboard.press("Escape");
});

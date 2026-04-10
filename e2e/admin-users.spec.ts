import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");
  await page.waitForLoadState("networkidle");
});

test("users table renders rows", async ({ page }) => {
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("invite admin button visible", async ({ page }) => {
  await expect(
    page.locator("button", { hasText: /Invite admin/i }),
  ).toBeVisible();
});

test("per-row checkboxes exist", async ({ page }) => {
  expect(await page.locator("tbody input[type='checkbox']").count()).toBeGreaterThan(0);
});

test("bulk selection toolbar appears", async ({ page }) => {
  await page.locator("tbody input[type='checkbox']").last().check();
  await page.waitForTimeout(300);
  await expect(page.locator("text=/\\d+ selected/")).toBeVisible();
  await page.locator("button", { hasText: "Clear" }).click();
});

test("row dots menu has Copy link, Impersonate, Delete", async ({ page }) => {
  const purdyRow = page.locator("tbody tr").filter({ hasText: "purdybuyer" });
  await purdyRow.locator("button").last().click();
  await page.waitForTimeout(300);
  await expect(page.getByRole("menuitem", { name: /copy link/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /impersonate/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /delete/i })).toBeVisible();
  await page.keyboard.press("Escape");
});

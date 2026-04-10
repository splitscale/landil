import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/listings");
  await page.waitForLoadState("networkidle");
});

test("listings table renders", async ({ page }) => {
  // tbody is always present; 0 rows is valid for an empty DB
  await expect(page.locator("table tbody")).toBeVisible();
});

test("bulk select + status dropdown + copy links + clear", async ({ page }) => {
  const rowCount = await page.locator("tbody tr").count();
  test.skip(rowCount === 0, "No listings in DB");

  await page.locator("tbody input[type='checkbox']").first().check();
  await page.waitForTimeout(300);
  await expect(page.locator("text=/\\d+ selected/")).toBeVisible();
  expect(
    await page.locator("select").filter({ hasText: "Set status…" }).count(),
  ).toBeGreaterThan(0);
  await expect(page.locator("button", { hasText: "Copy links" })).toBeVisible();
  await page.locator("button", { hasText: "Clear" }).click();
});

test("row dots menu has Copy link and Delete", async ({ page }) => {
  const rowCount = await page.locator("tbody tr").count();
  test.skip(rowCount === 0, "No listings in DB");

  await page.locator("tbody button").last().click();
  await page.waitForTimeout(300);
  await expect(page.getByRole("menuitem", { name: /copy link/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /delete/i })).toBeVisible();
  await page.keyboard.press("Escape");
});

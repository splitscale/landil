import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("impersonation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
  });

  test("impersonation banner shows and exit returns to /admin/users", async ({
    page,
  }) => {
    // Start impersonation
    const purdyRow = page.locator("tbody tr").filter({ hasText: "purdybuyer" });
    await purdyRow.locator("button").last().click();
    await page.waitForTimeout(400);
    await page.getByRole("menuitem", { name: /impersonate/i }).click();
    await page.waitForURL("**/", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Banner visible
    await expect(page.locator("text=/Impersonating/i").first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Exit" })).toBeVisible();

    // No Admin nav link while impersonating buyer
    const adminNavLink = page
      .locator("text=Admin")
      .filter({ has: page.locator("a") });
    expect(await adminNavLink.isVisible().catch(() => false)).toBe(false);

    // Exit
    await page.locator("button", { hasText: "Exit" }).click();
    await page.waitForURL("**/admin/users", { timeout: 10000 });
    expect(page.url()).toContain("/admin/users");

    // Banner gone
    expect(
      await page.locator("text=/Impersonating/i").isVisible().catch(() => false),
    ).toBe(false);
  });
});

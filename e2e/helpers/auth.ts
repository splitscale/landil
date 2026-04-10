import { type Page } from "@playwright/test";

export const ADMIN_USERNAME = "kasutu";
export const ADMIN_PASSWORD = "uKPfP$hAMD2LUpT";

export const BUYER_USERNAME = "purdyBuyer";
export const BUYER_PASSWORD = "qcXNj1nZrHmOe0t!";

export async function loginAsAdmin(page: Page) {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="username"]', ADMIN_USERNAME);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => !window.location.pathname.includes("/signin"),
    { timeout: 15000 },
  );
}

export async function loginAsBuyer(page: Page) {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="username"]', BUYER_USERNAME);
  await page.fill('input[name="password"]', BUYER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => !window.location.pathname.includes("/signin"),
    { timeout: 15000 },
  );
}

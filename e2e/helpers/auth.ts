import { type Page } from "@playwright/test";

export const ADMIN_USERNAME = "kasutu";
export const ADMIN_PASSWORD = "uKPfP$hAMD2LUpT";

export const SELLER_USERNAME = "testSeller";
export const SELLER_PASSWORD = "sElLeR!p4ss2025";

export const BUYER_USERNAME = "purdyBuyer";
export const BUYER_PASSWORD = "qcXNj1nZrHmOe0t!";

async function loginWith(page: Page, username: string, password: string) {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => !window.location.pathname.includes("/signin"),
    { timeout: 15000 },
  );
}

export async function loginAsAdmin(page: Page) {
  await loginWith(page, ADMIN_USERNAME, ADMIN_PASSWORD);
}

export async function loginAsSeller(page: Page) {
  await loginWith(page, SELLER_USERNAME, SELLER_PASSWORD);
}

export async function loginAsBuyer(page: Page) {
  await loginWith(page, BUYER_USERNAME, BUYER_PASSWORD);
}

export async function logout(page: Page) {
  // Navigate home first to ensure sidebar/navbar is mounted
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test("login redirects away from /signin", async ({ page }) => {
  await loginAsAdmin(page);
  expect(page.url()).not.toContain("/signin");
});

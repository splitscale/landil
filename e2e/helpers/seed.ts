/**
 * Ensures test accounts exist in the database by calling Better Auth's
 * sign-up endpoint. If the account already exists the API returns 422 and
 * we silently continue — the account is already there.
 */

import { ADMIN_USERNAME, ADMIN_PASSWORD, BUYER_USERNAME, BUYER_PASSWORD } from "./auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function ensureAccount({
  name,
  username,
  email,
  password,
  gender,
}: {
  name: string;
  username: string;
  email: string;
  password: string;
  gender: boolean;
}) {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, username, email, password, gender }),
  });

  if (res.ok) {
    console.log(`[seed] created account: ${username}`);
  } else if (res.status === 422 || res.status === 409) {
    // Already exists — fine
  } else {
    const body = await res.text().catch(() => "");
    console.warn(`[seed] unexpected status ${res.status} for ${username}: ${body}`);
  }
}

/**
 * Seed all test accounts. Call this from globalSetup or a beforeAll fixture.
 * Order matters: admin must exist so it can be promoted, but Better Auth doesn't
 * auto-assign the admin role — that's done via the setup wizard in the app.
 * For E2E we rely on the role already being set in the shared dev DB.
 */
export async function seedTestAccounts() {
  await Promise.all([
    ensureAccount({
      name: "Test Admin",
      username: ADMIN_USERNAME,
      email: `${ADMIN_USERNAME}@test.landil.dev`,
      password: ADMIN_PASSWORD,
      gender: true,
    }),
    ensureAccount({
      name: "Purdy Buyer",
      username: BUYER_USERNAME,
      email: `${BUYER_USERNAME}@test.landil.dev`,
      password: BUYER_PASSWORD,
      gender: false,
    }),
  ]);
}

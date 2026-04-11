import { seedTestAccounts } from "./helpers/seed";

export default async function globalSetup() {
  await seedTestAccounts();
}

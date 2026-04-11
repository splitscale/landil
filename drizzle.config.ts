import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
  schemaFilter: ["public", "listings", "marketplace", "notifications"],
  verbose: true,
  strict: true,
});

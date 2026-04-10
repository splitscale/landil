import { sql } from "drizzle-orm";

export type Window = "1h" | "1d" | "7d" | "30d";
export const VALID_WINDOWS: Window[] = ["1h", "1d", "7d", "30d"];

export function bucketConfig(w: Window): {
  truncExpr: ReturnType<typeof sql>;
  since: Date;
} {
  const now = new Date();
  switch (w) {
    case "1h":
      return {
        since: new Date(now.getTime() - 60 * 60 * 1000),
        truncExpr: sql`date_trunc('hour', created_at) + interval '5 minutes' * (extract(minute from created_at)::integer / 5)`,
      };
    case "1d":
      return {
        since: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        truncExpr: sql`date_trunc('hour', created_at)`,
      };
    case "7d":
      return {
        since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        truncExpr: sql`date_trunc('day', created_at)`,
      };
    case "30d":
      return {
        since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        truncExpr: sql`date_trunc('day', created_at)`,
      };
  }
}

export function formatBucket(date: Date, w: Window): string {
  if (w === "1h" || w === "1d") {
    return date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: w === "1h" ? "2-digit" : undefined,
      hour12: true,
      timeZone: "Asia/Manila",
    });
  }
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

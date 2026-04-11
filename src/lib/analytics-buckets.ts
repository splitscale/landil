import { sql } from "drizzle-orm";

export type Window = "1h" | "1d" | "7d" | "30d";
export const VALID_WINDOWS: Window[] = ["1h", "1d", "7d", "30d"];

export function bucketConfig(w: Window): {
  truncExpr: ReturnType<typeof sql>;
  since: string;
} {
  const now = Date.now();
  switch (w) {
    case "1h":
      return {
        since: new Date(now - 60 * 60 * 1000).toISOString(),
        truncExpr: sql`date_trunc('hour', created_at) + interval '5 minutes' * (extract(minute from created_at)::integer / 5)`,
      };
    case "1d":
      return {
        since: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        truncExpr: sql`date_trunc('hour', created_at)`,
      };
    case "7d":
      return {
        since: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        truncExpr: sql`date_trunc('day', created_at)`,
      };
    case "30d":
      return {
        since: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
        truncExpr: sql`date_trunc('day', created_at)`,
      };
  }
}

/** Normalised string key for matching generated buckets against DB results. */
function pad(n: number) { return String(n).padStart(2, "0"); }

export function bucketKey(date: Date, w: Window): string {
  const y  = date.getUTCFullYear();
  const mo = pad(date.getUTCMonth() + 1);
  const d  = pad(date.getUTCDate());
  const h  = pad(date.getUTCHours());
  const m  = pad(Math.floor(date.getUTCMinutes() / 5) * 5); // 5-min floor

  if (w === "1h")  return `${y}-${mo}-${d}T${h}:${m}`;
  if (w === "1d")  return `${y}-${mo}-${d}T${h}:00`;
  return `${y}-${mo}-${d}`;
}

/** Generate every expected bucket in the window so gaps can be zero-filled. */
export function generateBuckets(w: Window): Date[] {
  const now  = new Date();
  const buckets: Date[] = [];

  if (w === "1h") {
    // 5-minute buckets — last 60 min
    const t = new Date(now.getTime() - 60 * 60 * 1000);
    t.setUTCSeconds(0, 0);
    t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 5) * 5);
    while (t <= now) {
      buckets.push(new Date(t));
      t.setUTCMinutes(t.getUTCMinutes() + 5);
    }
  } else if (w === "1d") {
    // Hourly buckets — last 24 h
    const t = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    t.setUTCMinutes(0, 0, 0);
    while (t <= now) {
      buckets.push(new Date(t));
      t.setUTCHours(t.getUTCHours() + 1);
    }
  } else if (w === "7d") {
    // Daily buckets — last 7 days
    const t = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    t.setUTCHours(0, 0, 0, 0);
    while (t <= now) {
      buckets.push(new Date(t));
      t.setUTCDate(t.getUTCDate() + 1);
    }
  } else {
    // Daily buckets — last 30 days
    const t = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    t.setUTCHours(0, 0, 0, 0);
    while (t <= now) {
      buckets.push(new Date(t));
      t.setUTCDate(t.getUTCDate() + 1);
    }
  }

  return buckets;
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

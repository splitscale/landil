import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Singleton publisher
let pub: Redis | null = null;

export function getPublisher(): Redis {
  if (!pub) {
    pub = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }
  return pub;
}

// Each SSE subscriber needs its own connection
export function createSubscriber(): Redis {
  return new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
}

export function offerChannel(offerId: string) {
  return `offer:${offerId}:messages`;
}

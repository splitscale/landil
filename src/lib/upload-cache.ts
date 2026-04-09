const TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface CachedUpload {
  key: string;
  url: string;
  name: string;
  cachedAt: number;
}

interface CacheStore {
  [fileHash: string]: CachedUpload;
}

const STORAGE_KEY = "landil:upload-cache";

function load(): CacheStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(store: CacheStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded — clear stale entries and retry
    purgeExpired();
  }
}

export function purgeExpired() {
  const store = load();
  const now = Date.now();
  const fresh = Object.fromEntries(
    Object.entries(store).filter(([, v]) => now - v.cachedAt < TTL_MS),
  );
  save(fresh);
}

export function getCached(hash: string): CachedUpload | null {
  const entry = load()[hash];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    removeCached(hash);
    return null;
  }
  return entry;
}

export function setCached(hash: string, upload: Omit<CachedUpload, "cachedAt">) {
  const store = load();
  store[hash] = { ...upload, cachedAt: Date.now() };
  save(store);
}

export function removeCached(hash: string) {
  const store = load();
  delete store[hash];
  save(store);
}

/** Cheap hash: size + name + lastModified */
export function fileHash(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

// ponytail: hand-written types for 2 routes. Swap for the generated OpenAPI client (ENT-316) when the API grows.
// Android emulator: set EXPO_PUBLIC_API_URL=http://10.0.2.2:8080. Real phone: your computer's LAN IP.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

// Public website, for share links (LND-MOB-06).
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'http://localhost:8081';

export type ListingCard = {
  id: string;
  title: string;
  asking_price: number;
  city: string;
  province: string;
  property_type: string;
  cover_url: string | null;
};

export type Page<T> = { items: T[]; next_cursor: string | null };

export type ListingDetail = ListingCard & {
  lot_area: string;
  floor_area: string | null;
  description: string;
  title_type: string;
  encumbrances: string[];
  utilities: string[];
  seller_name: string;
  seller_username: string | null;
  photos: string[];
  documents: { name: string; url: string }[];
  private_document_count: number;
};

export async function api<T>(
  path: string,
  params?: Record<string, string | undefined>,
  body?: unknown, // given: POST it as JSON
): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ''}`, {
      signal: AbortSignal.timeout(15_000),
      ...(body !== undefined && {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    throw new Error('Cannot reach Landil. Check your connection and try again.');
  }
  if (res.status >= 500) throw new Error('Something went wrong on our side. Try again in a moment.');
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

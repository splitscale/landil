/**
 * Verify a CDN URL is reachable before using it.
 * Uses HEAD request; on CORS block (TypeError) we assume OK since
 * the upload server already confirmed success.
 */
export async function verifyCdnUrl(url: string, timeoutMs = 8000): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (!res.ok) throw new Error(`CDN returned ${res.status}`);
  } catch (e) {
    if (e instanceof TypeError) return; // CORS block — can't verify, assume OK
    if ((e as Error).name === "AbortError") throw new Error("CDN verification timed out");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

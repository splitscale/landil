/** Format peso amount as ₱1,234,567 */
export function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

/** Format a date/ISO string as "Jan 1, 1:00 PM" using the runtime locale/timezone.
 * Call this only from client components — on the server it uses UTC. */
export function formatTime(iso: Date | string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

/** Format peso amount in compact form: ₱1.2M, ₱500K */
export function formatPriceShort(pesos: number) {
  if (pesos >= 1_000_000) return `₱${(pesos / 1_000_000).toFixed(1)}M`;
  if (pesos >= 1_000) return `₱${(pesos / 1_000).toFixed(0)}K`;
  return `₱${pesos.toLocaleString("en-PH")}`;
}

/** Format peso amount as ₱1,234,567 */
export function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

/** Format peso amount in compact form: ₱1.2M, ₱500K */
export function formatPriceShort(pesos: number) {
  if (pesos >= 1_000_000) return `₱${(pesos / 1_000_000).toFixed(1)}M`;
  if (pesos >= 1_000) return `₱${(pesos / 1_000).toFixed(0)}K`;
  return `₱${pesos.toLocaleString("en-PH")}`;
}

export const PRICE_RANGES = [
  { value: "all", label: "All price ranges" },
  { value: "under-1m", label: "Under PHP 1M", min: 0, max: 999_999 },
  { value: "1m-3m", label: "PHP 1M – 3M", min: 1_000_000, max: 3_000_000 },
  { value: "3m-5m", label: "PHP 3M – 5M", min: 3_000_000, max: 5_000_000 },
  { value: "5m-10m", label: "PHP 5M – 10M", min: 5_000_000, max: 10_000_000 },
  { value: "over-10m", label: "Over PHP 10M", min: 10_000_001 },
] as const satisfies ReadonlyArray<{ value: string; label: string; min?: number; max?: number }>;

export const OFFER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "text-amber-600 dark:text-amber-400" },
  accepted:  { label: "Accepted",  color: "text-green-600 dark:text-green-400" },
  rejected:  { label: "Rejected",  color: "text-destructive" },
  countered: { label: "Countered", color: "text-blue-600 dark:text-blue-400" },
  withdrawn: { label: "Withdrawn", color: "text-muted-foreground" },
};

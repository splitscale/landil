"use client";

/**
 * Renders a date in the user's local timezone. Using `suppressHydrationWarning`
 * so the server-rendered UTC string is silently corrected by the client after
 * hydration without a React warning.
 */
export function FormattedTime({
  date,
  className,
}: {
  date: Date | string;
  className?: string;
}) {
  const d = new Date(date);
  return (
    <time
      dateTime={d.toISOString()}
      suppressHydrationWarning
      className={className}
    >
      {d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}
    </time>
  );
}

/** Locale-aware formatting helpers used across charts and tables. */

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const num0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const formatCurrency = (n: number) => usd0.format(n);

export const formatNumber = (n: number) => num0.format(n);

/** Compact employment counts: 1656880 -> "1.66M". */
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function formatPercent(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

/** 0–1 score -> "0.74" with two decimals. */
export const formatScore = (n: number) => n.toFixed(2);

export const exposureLabel: Record<string, string> = {
  low: "Low exposure",
  moderate: "Moderate exposure",
  high: "High exposure",
};

/** Tailwind text/bg helpers for the exposure palette. */
export const exposureColor: Record<string, string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  high: "text-rose-600 dark:text-rose-400",
};

export const exposureBg: Record<string, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-rose-500",
};

/**
 * Color scale for growth rate using the shared four-bucket semantic palette
 * (green = growing, yellow = stable, orange = slower growth, red = declining).
 * Meaning is identical in light and dark themes.
 */
export function growthColor(growth: number): string {
  if (growth >= 7) return "#22c55e"; // green: growing
  if (growth >= 3) return "#eab308"; // yellow: stable
  if (growth >= 0) return "#f97316"; // orange: slower growth
  return "#ef4444"; // red: declining
}

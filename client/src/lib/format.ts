export interface FormatNumberENOptions {
  decimals?: number;
  useGrouping?: boolean;
  trimTrailingZeros?: boolean;
  fallback?: string;
}

export function formatNumberEN(
  value: number | string | null | undefined,
  options: FormatNumberENOptions = {}
): string {
  const {
    decimals = 2,
    useGrouping = true,
    trimTrailingZeros = true,
    fallback = "0",
  } = options;

  if (value === null || value === undefined) return fallback;

  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) return fallback;

  const safeDecimals = Math.max(0, Math.min(20, decimals));
  const formatter = new Intl.NumberFormat("en-US", {
    useGrouping,
    minimumFractionDigits: trimTrailingZeros ? 0 : safeDecimals,
    maximumFractionDigits: safeDecimals,
  });

  return formatter.format(parsed);
}

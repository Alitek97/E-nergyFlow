const LRM = "\u200E";

export interface FormatNumberOptions {
  decimals?: number;
  thousandsSeparator?: boolean;
  unit?: string;
  forceSign?: boolean;
}

export function formatNumber(
  value: number | string,
  options: FormatNumberOptions = {}
): string {
  const {
    decimals = 2,
    thousandsSeparator = true,
    unit,
    forceSign = false,
  } = options;

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (!Number.isFinite(numValue)) {
    return unit ? `0 ${unit}` : "0";
  }

  const rounded = Math.round(numValue * Math.pow(10, decimals)) / Math.pow(10, decimals);
  const isNegative = rounded < 0;
  const absValue = Math.abs(rounded);

  const hasDecimalPart = absValue % 1 !== 0;
  let formattedAbs: string;

  if (hasDecimalPart) {
    formattedAbs = absValue.toFixed(decimals);
    formattedAbs = formattedAbs.replace(/\.?0+$/, "");
  } else {
    formattedAbs = Math.round(absValue).toString();
  }

  if (thousandsSeparator) {
    const parts = formattedAbs.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    formattedAbs = parts.join(".");
  }

  let result: string;
  if (isNegative) {
    result = LRM + "-" + formattedAbs;
  } else if (forceSign && rounded > 0) {
    result = "+" + formattedAbs;
  } else {
    result = formattedAbs;
  }

  if (unit) {
    result = `${result} ${unit}`;
  }

  return result;
}

export function formatInteger(value: number | string): string {
  return formatNumber(value, { decimals: 0, thousandsSeparator: true });
}

export function format2(value: number | string): string {
  return formatNumber(value, { decimals: 2, thousandsSeparator: false });
}

export function format4(value: number | string): string {
  return formatNumber(value, { decimals: 4, thousandsSeparator: false });
}

export function formatWithCommas(value: number | string, decimals: number = 2): string {
  return formatNumber(value, { decimals, thousandsSeparator: true });
}

export function formatMW(value: number | string): string {
  return formatNumber(value, { decimals: 2, thousandsSeparator: true, unit: "MW" });
}

export function formatMWh(value: number | string): string {
  return formatNumber(value, { decimals: 2, thousandsSeparator: true, unit: "MWh" });
}

export function formatNm3(value: number | string): string {
  return formatNumber(value, { decimals: 2, thousandsSeparator: true, unit: "Nm³" });
}

export const numberTextStyle = { writingDirection: "ltr" as const };

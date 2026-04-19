import type { Language } from "@/lib/i18n";

export const OPERATING_MINUTE_STEPS = [0, 15, 30, 45] as const;

const ARABIC_NUMERALS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

function normalizeNumericString(value: string): string {
  let normalized = value;
  for (const [arabic, western] of Object.entries(ARABIC_NUMERALS)) {
    normalized = normalized.split(arabic).join(western);
  }
  return normalized.replace(/,/g, "").trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nearestStep(minutes: number): number {
  let candidate: number = OPERATING_MINUTE_STEPS[0];
  for (const step of OPERATING_MINUTE_STEPS) {
    if (Math.abs(step - minutes) < Math.abs(candidate - minutes)) {
      candidate = step;
    }
  }
  return candidate;
}

export interface OperatingTimeParts {
  hours: number;
  minutes: number;
}

export function parseOperatingTime(
  value: string | number | null | undefined,
): OperatingTimeParts {
  const raw =
    typeof value === "number"
      ? value
      : Number(normalizeNumericString(String(value ?? "")));
  const safe = Number.isFinite(raw) ? raw : 24;
  const clampedTotal = clamp(safe, 0, 24);

  let hours = Math.floor(clampedTotal);
  const rawMinutes = Math.round((clampedTotal - hours) * 60);
  let minutes = nearestStep(clamp(rawMinutes, 0, 59));

  if (minutes === 60) {
    hours += 1;
    minutes = 0;
  }

  if (hours >= 24) {
    hours = 24;
    minutes = 0;
  }

  return { hours, minutes };
}

export function toOperatingTimeValue(hours: number, minutes: number): string {
  const safeHours = Math.floor(clamp(hours, 0, 24));
  const safeMinutes = Math.floor(clamp(minutes, 0, 59));
  const normalizedMinutes = safeHours === 24 ? 0 : safeMinutes;
  const decimalHours = safeHours + normalizedMinutes / 60;

  if (normalizedMinutes === 0) return String(safeHours);
  return decimalHours.toFixed(2).replace(/\.?0+$/, "");
}

export function formatOperatingTimeDisplay(
  parts: OperatingTimeParts,
  language: Language,
): string {
  const mm = String(parts.minutes).padStart(2, "0");
  if (language === "ar") {
    return `${parts.hours} س ${mm} د`;
  }
  return `${parts.hours} h ${mm} min`;
}

export function formatOperatingTime(parts: OperatingTimeParts): string {
  const hh = String(parts.hours).padStart(2, "0");
  const mm = String(parts.minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

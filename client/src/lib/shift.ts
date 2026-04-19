export const SHIFT_CYCLE = ["A", "C", "B", "D"] as const;
export const ANCHOR_DATE_KEY = "2026-03-01";
const MS_PER_DAY = 86400000;

type ShiftLetter = (typeof SHIFT_CYCLE)[number];

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function parseDateKeyToUtcMs(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMs = Date.UTC(year, month - 1, day);
  const date = new Date(utcMs);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return utcMs;
}

export function dayDiffFromAnchor(dateKey: string): number {
  const targetUtcMs = parseDateKeyToUtcMs(dateKey);
  const anchorUtcMs = parseDateKeyToUtcMs(ANCHOR_DATE_KEY);
  if (targetUtcMs === null || anchorUtcMs === null) return 0;
  return Math.round((targetUtcMs - anchorUtcMs) / MS_PER_DAY);
}

export function getShiftForDate(dateKey: string): ShiftLetter {
  const shiftIndex = mod(dayDiffFromAnchor(dateKey), SHIFT_CYCLE.length);
  return SHIFT_CYCLE[shiftIndex];
}

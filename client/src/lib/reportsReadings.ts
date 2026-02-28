export interface ReadingSummary {
  dateKey: string;
  production: number;
  exportVal: number;
  consumption: number;
}

export interface MonthGroupedReadings {
  key: string;
  year: number;
  month: number;
  countDays: number;
  totalProduction: number;
  totalExport: number;
  totalConsumption: number;
}

export function groupReadingsByMonth(readings: ReadingSummary[]): MonthGroupedReadings[] {
  const map = new Map<string, MonthGroupedReadings>();

  for (const reading of readings) {
    if (!reading.dateKey || reading.dateKey.length < 7) continue;
    const key = reading.dateKey.slice(0, 7);
    const [yearRaw, monthRaw] = key.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue;

    const existing = map.get(key);
    if (existing) {
      existing.countDays += 1;
      existing.totalProduction += reading.production;
      existing.totalExport += reading.exportVal;
      existing.totalConsumption += reading.consumption;
      continue;
    }

    map.set(key, {
      key,
      year,
      month,
      countDays: 1,
      totalProduction: reading.production,
      totalExport: reading.exportVal,
      totalConsumption: reading.consumption,
    });
  }

  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export function getReadingsForMonth(readings: ReadingSummary[], monthKey: string): ReadingSummary[] {
  return readings
    .filter((reading) => reading.dateKey.startsWith(monthKey))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

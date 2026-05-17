import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseOperatingTime } from "@/utils/operatingTime";
import {
  getActiveLocalUserId,
  getAllSql,
  getFirstSql,
  getMetadata,
  runSql,
  setMetadata,
} from "@/lib/localDb";
import { enqueueSyncRecord } from "@/lib/syncQueue";

export {
  formatNumber,
  format2,
  format4,
  formatWithCommas,
  formatMW,
  formatMWh,
  formatNm3,
  formatInteger,
  numberTextStyle,
} from "@/utils/numberFormat";

export const FEEDERS = ["F2", "F3", "F4", "F5"];
export const TURBINES = ["A", "B", "C", "S"];

const STORAGE_PREFIX = "pp-app:v2";

export function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86400000;

function parseDateKeyToUtcMs(dateKey: string): number | null {
  const match = DATE_KEY_RE.exec(dateKey);
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

function formatUtcDateKeyFromMs(utcMs: number): string {
  const date = new Date(utcMs);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDays(dateKey: string, delta: number): string {
  const baseUtcMs = parseDateKeyToUtcMs(dateKey);
  if (baseUtcMs === null || !Number.isInteger(delta)) return "";
  return formatUtcDateKeyFromMs(baseUtcMs + delta * MS_PER_DAY);
}

function storageKey(dateKey: string): string {
  return `${STORAGE_PREFIX}:day:${dateKey}`;
}

function listKey(): string {
  return `${STORAGE_PREFIX}:days:index`;
}

export interface FeederData {
  start: string;
  end: string;
}

export interface TurbineData {
  previous: string;
  present: string;
  hours: string;
}

export interface DayData {
  dateKey: string;
  feeders: Record<string, FeederData>;
  turbines: Record<string, TurbineData>;
  updatedAt?: string;
}

export type ReadingSyncSource = "user" | "sync";

export interface SaveDayOptions {
  source?: ReadingSyncSource;
}

export interface UserSettings {
  displayName: string;
  decimalPrecision: number;
  updatedAt?: string;
}

const SETTINGS_KEY = "@power_plant_settings";

export function defaultDay(dateKey: string): DayData {
  return {
    dateKey,
    feeders: Object.fromEntries(
      FEEDERS.map((f) => [f, { start: "", end: "" }]),
    ),
    turbines: Object.fromEntries(
      TURBINES.map((t) => [t, { previous: "", present: "", hours: "24" }]),
    ),
  };
}

interface LocalDayRow {
  date_key: string;
  remote_id: string | null;
  updated_at: string;
  deleted_at: string | null;
}

interface LocalFeederRow {
  feeder_name: string;
  start_reading: string | null;
  end_reading: string | null;
}

interface LocalTurbineRow {
  turbine_name: string;
  previous_reading: string | null;
  present_reading: string | null;
  hours: string | null;
}

export interface LocalDayMeta {
  dateKey: string;
  remoteId: string | null;
  updatedAt: string;
  deletedAt: string | null;
}

interface SaveDayDataOptions extends SaveDayOptions {
  updatedAt?: string;
  remoteId?: string | null;
}

interface DeleteDayOptions extends SaveDayOptions {
  updatedAt?: string;
  remoteId?: string | null;
}

const LEGACY_MIGRATION_TIMESTAMP = "1970-01-01T00:00:00.000Z";
let isMigratingLegacyData = false;

function nowIso(): string {
  return new Date().toISOString();
}

function activeUserId(): string {
  return getActiveLocalUserId();
}

function legacyMigratedKey(userId: string): string {
  return `legacy-storage-migrated:${userId}`;
}

export function stripCommas(value: string): string {
  return value.replace(/,/g, "");
}

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
  normalized = normalized.replace(/,/g, "").replace(/\s/g, "");
  return normalized;
}

export function parseReading(
  v: string | number | null | undefined,
): number | null {
  return parseOptionalNumber(v);
}

export function parseOptionalNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const normalized = normalizeNumericString(trimmed);
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function computeDiff(start: unknown, end: unknown): number | null {
  const startNumber = parseOptionalNumber(start);
  const endNumber = parseOptionalNumber(end);
  if (startNumber === null || endNumber === null) return null;
  return endNumber - startNumber;
}

if (__DEV__) {
  console.assert(
    computeDiff(null, 10) === null,
    "computeDiff should return null when start is missing",
  );
  console.assert(
    computeDiff(10, null) === null,
    "computeDiff should return null when end is missing",
  );
  console.assert(
    computeDiff(10, 25) === 15,
    "computeDiff should compute when both values are present",
  );
}

export function num(v: string | number | undefined): number {
  const parsed = parseReading(v);
  return parsed !== null ? parsed : 0;
}

export function getPreviousDateKey(dateKey: string): string {
  return addDays(dateKey, -1);
}

async function queueDaySync(
  day: DayData,
  action: "create" | "update" | "delete",
  updatedAt: string,
): Promise<void> {
  await enqueueSyncRecord({
    userId: activeUserId(),
    table: "daily_data",
    entityId: day.dateKey,
    action,
    createdAt: updatedAt,
    payload: {
      dateKey: day.dateKey,
      day,
      updatedAt,
    },
  });
}

async function ensureLegacyDataMigrated(): Promise<void> {
  if (isMigratingLegacyData) return;
  const userId = activeUserId();
  const metadataKey = legacyMigratedKey(userId);
  const migrated = await getMetadata(metadataKey);
  if (migrated === "true") return;

  try {
    isMigratingLegacyData = true;
    const rawIndex = await AsyncStorage.getItem(listKey());
    const legacyIndex = rawIndex ? JSON.parse(rawIndex) : [];

    if (Array.isArray(legacyIndex)) {
      for (const dateKey of legacyIndex) {
        if (typeof dateKey !== "string") continue;
        const rawDay = await AsyncStorage.getItem(storageKey(dateKey));
        if (!rawDay) continue;

        const parsed = JSON.parse(rawDay) as DayData;
        const day = normalizeDayData({ ...parsed, dateKey });
        await saveDayData(day, {
          source: "user",
          updatedAt: LEGACY_MIGRATION_TIMESTAMP,
        });
      }
    }

    const rawSettings = await AsyncStorage.getItem(SETTINGS_KEY);
    if (rawSettings) {
      const parsedSettings = JSON.parse(rawSettings) as Partial<UserSettings>;
      await saveSettings(parsedSettings, {
        source: "user",
        updatedAt: LEGACY_MIGRATION_TIMESTAMP,
      });
    }
  } catch (error) {
    console.warn("Failed to migrate legacy local storage:", error);
  } finally {
    isMigratingLegacyData = false;
    await setMetadata(metadataKey, "true");
  }
}

export async function getDayIndex(): Promise<string[]> {
  try {
    await ensureLegacyDataMigrated();
    const rows = await getAllSql<{ date_key: string }>(
      `SELECT date_key
       FROM local_days
       WHERE user_id = ?
         AND deleted_at IS NULL
       ORDER BY date_key ASC`,
      [activeUserId()],
    );
    return rows.map((row) => row.date_key);
  } catch {
    return [];
  }
}

export async function getDayData(dateKey: string): Promise<DayData> {
  try {
    await ensureLegacyDataMigrated();
    const userId = activeUserId();
    const dayRow = await getFirstSql<LocalDayRow>(
      `SELECT date_key, remote_id, updated_at, deleted_at
       FROM local_days
       WHERE user_id = ?
         AND date_key = ?
       LIMIT 1`,
      [userId, dateKey],
    );

    if (!dayRow || dayRow.deleted_at) {
      return defaultDay(dateKey);
    }

    const [feedersRows, turbinesRows] = await Promise.all([
      getAllSql<LocalFeederRow>(
        `SELECT feeder_name, start_reading, end_reading
         FROM local_feeders
         WHERE user_id = ?
           AND date_key = ?
           AND deleted_at IS NULL`,
        [userId, dateKey],
      ),
      getAllSql<LocalTurbineRow>(
        `SELECT turbine_name, previous_reading, present_reading, hours
         FROM local_turbines
         WHERE user_id = ?
           AND date_key = ?
           AND deleted_at IS NULL`,
        [userId, dateKey],
      ),
    ]);

    const day = defaultDay(dateKey);
    day.updatedAt = dayRow.updated_at;

    for (const row of feedersRows) {
      if (!FEEDERS.includes(row.feeder_name as (typeof FEEDERS)[number])) {
        continue;
      }
      day.feeders[row.feeder_name] = {
        start: row.start_reading ?? "",
        end: row.end_reading ?? "",
      };
    }

    for (const row of turbinesRows) {
      if (!TURBINES.includes(row.turbine_name as (typeof TURBINES)[number])) {
        continue;
      }
      day.turbines[row.turbine_name] = {
        previous: row.previous_reading ?? "",
        present: row.present_reading ?? "",
        hours: row.hours ?? "24",
      };
    }

    return day;
  } catch {
    return defaultDay(dateKey);
  }
}

export async function getLocalDayMeta(
  dateKey: string,
): Promise<LocalDayMeta | null> {
  await ensureLegacyDataMigrated();
  const row = await getFirstSql<LocalDayRow>(
    `SELECT date_key, remote_id, updated_at, deleted_at
     FROM local_days
     WHERE user_id = ?
       AND date_key = ?
     LIMIT 1`,
    [activeUserId(), dateKey],
  );

  if (!row) return null;

  return {
    dateKey: row.date_key,
    remoteId: row.remote_id,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function getDayDataWithLinkedValues(
  dateKey: string,
): Promise<DayData> {
  const currentDay = await getDayData(dateKey);
  const prevDateKey = getPreviousDateKey(dateKey);

  if (!prevDateKey) return currentDay;

  try {
    const prevDay = await getDayData(prevDateKey);
    let wasUpdated = false;

    const linkedFeeders = { ...currentDay.feeders };
    for (const f of FEEDERS) {
      const prevEnd = prevDay.feeders?.[f]?.end;
      const currentStart = currentDay.feeders[f]?.start;
      if (
        prevEnd &&
        prevEnd.trim() !== "" &&
        (!currentStart || currentStart.trim() === "")
      ) {
        linkedFeeders[f] = {
          ...linkedFeeders[f],
          start: prevEnd,
        };
        wasUpdated = true;
      }
    }

    const linkedTurbines = { ...currentDay.turbines };
    for (const t of TURBINES) {
      const prevPresent = prevDay.turbines?.[t]?.present;
      const currentPrevious = currentDay.turbines[t]?.previous;
      if (
        prevPresent &&
        prevPresent.trim() !== "" &&
        (!currentPrevious || currentPrevious.trim() === "")
      ) {
        linkedTurbines[t] = {
          ...linkedTurbines[t],
          previous: prevPresent,
        };
        wasUpdated = true;
      }
    }

    const linkedDay = {
      ...currentDay,
      feeders: linkedFeeders,
      turbines: linkedTurbines,
    };

    if (wasUpdated) {
      await saveDayData(linkedDay, { source: "user" });
    }

    return linkedDay;
  } catch {
    return currentDay;
  }
}

export async function saveDayData(
  day: DayData,
  options: SaveDayDataOptions = {},
): Promise<void> {
  try {
    if (!isMigratingLegacyData) {
      await ensureLegacyDataMigrated();
    }

    const userId = activeUserId();
    const updatedAt = options.updatedAt ?? day.updatedAt ?? nowIso();
    const normalized = normalizeDayData({ ...day, updatedAt });

    await runSql(
      `INSERT INTO local_days (
         user_id,
         date_key,
         remote_id,
         updated_at,
         deleted_at
       )
       VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT(user_id, date_key) DO UPDATE SET
         remote_id = COALESCE(excluded.remote_id, local_days.remote_id),
         updated_at = excluded.updated_at,
         deleted_at = NULL`,
      [userId, normalized.dateKey, options.remoteId ?? null, updatedAt],
    );

    for (const feeder of FEEDERS) {
      const current = normalized.feeders[feeder];
      await runSql(
        `INSERT INTO local_feeders (
           user_id,
           date_key,
           feeder_name,
           start_reading,
           end_reading,
           updated_at,
           deleted_at
         )
         VALUES (?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(user_id, date_key, feeder_name) DO UPDATE SET
           start_reading = excluded.start_reading,
           end_reading = excluded.end_reading,
           updated_at = excluded.updated_at,
           deleted_at = NULL`,
        [
          userId,
          normalized.dateKey,
          feeder,
          current.start,
          current.end,
          updatedAt,
        ],
      );
    }

    for (const turbine of TURBINES) {
      const current = normalized.turbines[turbine];
      await runSql(
        `INSERT INTO local_turbines (
           user_id,
           date_key,
           turbine_name,
           previous_reading,
           present_reading,
           hours,
           updated_at,
           deleted_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(user_id, date_key, turbine_name) DO UPDATE SET
           previous_reading = excluded.previous_reading,
           present_reading = excluded.present_reading,
           hours = excluded.hours,
           updated_at = excluded.updated_at,
           deleted_at = NULL`,
        [
          userId,
          normalized.dateKey,
          turbine,
          current.previous,
          current.present,
          current.hours,
          updatedAt,
        ],
      );
    }

    if (options.source === "user") {
      await queueDaySync(normalized, "update", updatedAt);
    }
  } catch (error) {
    console.error("Error saving day data:", error);
    throw error;
  }
}

function normalizeDayData(input: DayData): DayData {
  const normalized = defaultDay(input.dateKey);
  normalized.updatedAt = input.updatedAt;
  for (const feeder of FEEDERS) {
    const current = input.feeders?.[feeder] ?? { start: "", end: "" };
    normalized.feeders[feeder] = {
      start: current.start ?? "",
      end: current.end ?? "",
    };
  }
  for (const turbine of TURBINES) {
    const current = input.turbines?.[turbine] ?? {
      previous: "",
      present: "",
      hours: "24",
    };
    normalized.turbines[turbine] = {
      previous: current.previous ?? "",
      present: current.present ?? "",
      hours: current.hours ?? "24",
    };
  }
  return normalized;
}

async function getOrCreateDay(
  daysByDate: Map<string, DayData>,
  dateKey: string,
): Promise<DayData> {
  const existing = daysByDate.get(dateKey);
  if (existing) return existing;
  const loaded = await getDayData(dateKey);
  const normalized = normalizeDayData(loaded);
  daysByDate.set(dateKey, normalized);
  return normalized;
}

async function saveDaysBatch(
  daysByDate: Map<string, DayData>,
  options: SaveDayDataOptions = {},
): Promise<DayData[]> {
  const days = Array.from(daysByDate.values());
  const updatedAt = options.updatedAt ?? nowIso();
  for (const day of days) {
    await saveDayData({ ...day, updatedAt }, { ...options, updatedAt });
  }
  return days.map((day) => ({ ...day, updatedAt }));
}

export async function saveDayDataWithLinkage(
  day: DayData,
  options: SaveDayOptions = {},
): Promise<DayData[]> {
  const source = options.source ?? "user";
  const current = normalizeDayData(day);
  const previousSnapshot = normalizeDayData(await getDayData(day.dateKey));
  const daysByDate = new Map<string, DayData>([[current.dateKey, current]]);

  if (source === "user") {
    const previousDateKey = addDays(current.dateKey, -1);
    const nextDateKey = addDays(current.dateKey, 1);

    for (const feeder of FEEDERS) {
      const currentStart = current.feeders[feeder].start;
      const currentEnd = current.feeders[feeder].end;
      const previousStart = previousSnapshot.feeders[feeder].start;
      const previousEnd = previousSnapshot.feeders[feeder].end;

      if (currentEnd !== previousEnd && nextDateKey) {
        const nextDay = await getOrCreateDay(daysByDate, nextDateKey);
        nextDay.feeders[feeder].start = currentEnd;
      }
      if (currentStart !== previousStart && previousDateKey) {
        const previousDay = await getOrCreateDay(daysByDate, previousDateKey);
        previousDay.feeders[feeder].end = currentStart;
      }
    }

    for (const turbine of TURBINES) {
      const currentPrevious = current.turbines[turbine].previous;
      const currentPresent = current.turbines[turbine].present;
      const previousPrevious = previousSnapshot.turbines[turbine].previous;
      const previousPresent = previousSnapshot.turbines[turbine].present;

      if (currentPresent !== previousPresent && nextDateKey) {
        const nextDay = await getOrCreateDay(daysByDate, nextDateKey);
        nextDay.turbines[turbine].previous = currentPresent;
      }
      if (currentPrevious !== previousPrevious && previousDateKey) {
        const previousDay = await getOrCreateDay(daysByDate, previousDateKey);
        previousDay.turbines[turbine].present = currentPrevious;
      }
    }
  }

  return saveDaysBatch(daysByDate, {
    source,
    updatedAt: nowIso(),
  });
}

export type MeterPatch = Partial<FeederData> | Partial<TurbineData>;

export async function upsertDailyReading(
  dateKey: string,
  meterId: string,
  patch: MeterPatch,
  options: SaveDayOptions = {},
): Promise<DayData[]> {
  const baseDay = normalizeDayData(await getDayData(dateKey));

  if (FEEDERS.includes(meterId as (typeof FEEDERS)[number])) {
    const feederId = meterId as (typeof FEEDERS)[number];
    baseDay.feeders[feederId] = {
      ...baseDay.feeders[feederId],
      ...(patch as Partial<FeederData>),
    };
  } else if (TURBINES.includes(meterId as (typeof TURBINES)[number])) {
    const turbineId = meterId as (typeof TURBINES)[number];
    baseDay.turbines[turbineId] = {
      ...baseDay.turbines[turbineId],
      ...(patch as Partial<TurbineData>),
    };
  } else {
    throw new Error(`Unknown meter id: ${meterId}`);
  }

  return saveDayDataWithLinkage(baseDay, options);
}

export async function deleteDayData(
  dateKey: string,
  options: DeleteDayOptions = { source: "user" },
): Promise<void> {
  try {
    await ensureLegacyDataMigrated();
    const userId = activeUserId();
    const updatedAt = options.updatedAt ?? nowIso();

    await runSql(
      `INSERT INTO local_days (
         user_id,
         date_key,
         remote_id,
         updated_at,
         deleted_at
       )
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date_key) DO UPDATE SET
         remote_id = COALESCE(excluded.remote_id, local_days.remote_id),
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [userId, dateKey, options.remoteId ?? null, updatedAt, updatedAt],
    );
    await runSql(
      `UPDATE local_feeders
       SET deleted_at = ?, updated_at = ?
       WHERE user_id = ?
         AND date_key = ?`,
      [updatedAt, updatedAt, userId, dateKey],
    );
    await runSql(
      `UPDATE local_turbines
       SET deleted_at = ?, updated_at = ?
       WHERE user_id = ?
         AND date_key = ?`,
      [updatedAt, updatedAt, userId, dateKey],
    );

    if (options.source === "user") {
      await enqueueSyncRecord({
        userId,
        table: "daily_data",
        entityId: dateKey,
        action: "delete",
        createdAt: updatedAt,
        payload: {
          dateKey,
          updatedAt,
          remoteId: options.remoteId ?? null,
        },
      });
    }
  } catch (error) {
    console.error("Error deleting day data:", error);
    throw error;
  }
}

export async function getAllDaysData(): Promise<DayData[]> {
  try {
    const index = await getDayIndex();
    const days: DayData[] = [];
    for (const dateKey of index) {
      const data = await getDayData(dateKey);
      days.push(data);
    }
    return days;
  } catch {
    return [];
  }
}

export async function getSettings(): Promise<UserSettings> {
  try {
    await ensureLegacyDataMigrated();
    const defaults: UserSettings = {
      displayName: "Engineer",
      decimalPrecision: 2,
    };
    const row = await getFirstSql<{
      display_name: string;
      decimal_precision: number;
      updated_at: string;
    }>(
      `SELECT display_name, decimal_precision, updated_at
       FROM local_settings
       WHERE user_id = ?
       LIMIT 1`,
      [activeUserId()],
    );

    return row
      ? {
          displayName: row.display_name,
          decimalPrecision: row.decimal_precision,
          updatedAt: row.updated_at,
        }
      : defaults;
  } catch {
    return { displayName: "Engineer", decimalPrecision: 2 };
  }
}

interface SaveSettingsOptions extends SaveDayOptions {
  updatedAt?: string;
}

export async function saveSettings(
  settings: Partial<UserSettings>,
  options: SaveSettingsOptions = {},
): Promise<UserSettings> {
  try {
    if (!isMigratingLegacyData) {
      await ensureLegacyDataMigrated();
    }

    const current = await getSettings();
    const updatedAt = options.updatedAt ?? settings.updatedAt ?? nowIso();
    const updated: UserSettings = {
      ...current,
      ...settings,
      updatedAt,
    };

    await runSql(
      `INSERT INTO local_settings (
         user_id,
         display_name,
         decimal_precision,
         updated_at
       )
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         display_name = excluded.display_name,
         decimal_precision = excluded.decimal_precision,
         updated_at = excluded.updated_at`,
      [
        activeUserId(),
        updated.displayName,
        updated.decimalPrecision,
        updatedAt,
      ],
    );

    if (options.source === "user") {
      await enqueueSyncRecord({
        userId: activeUserId(),
        table: "settings",
        entityId: "profile",
        action: "update",
        createdAt: updatedAt,
        payload: {
          settings: updated,
          updatedAt,
        },
      });
    }

    return updated;
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

export interface FeederComputed {
  start: number | null;
  end: number | null;
  diff: number | null;
  isStopped: boolean;
  hasError: boolean;
}

export function isFeederStopped(day: DayData, f: string): boolean {
  const startParsed = parseReading(day.feeders[f]?.start);
  const endParsed = parseReading(day.feeders[f]?.end);
  return startParsed === null || endParsed === null;
}

export function feederRowComputed(day: DayData, f: string): FeederComputed {
  const start = parseOptionalNumber(day.feeders[f]?.start);
  const end = parseOptionalNumber(day.feeders[f]?.end);
  const diff = computeDiff(end, start);
  return { start, end, diff, isStopped: diff === null, hasError: false };
}

export function feederExport(day: DayData): number {
  const total = FEEDERS.reduce((acc, f) => {
    const computed = feederRowComputed(day, f);
    return computed.diff === null ? acc : acc + computed.diff;
  }, 0);
  return total;
}

export function turbineProductionMwh(day: DayData): number {
  return TURBINES.reduce((acc, t) => {
    const computed = turbineRowComputed(day, t);
    return computed.diff === null ? acc : acc + computed.diff;
  }, 0);
}

export interface TurbineComputed {
  prev: number | null;
  pres: number | null;
  hours: number;
  diff: number | null;
  mwPerHr: number | null;
  isStopped: boolean;
  hasError: boolean;
}

export function isTurbineStopped(day: DayData, t: string): boolean {
  const previousParsed = parseReading(day.turbines[t]?.previous);
  const presentParsed = parseReading(day.turbines[t]?.present);
  return previousParsed === null || presentParsed === null;
}

export function turbineRowComputed(day: DayData, t: string): TurbineComputed {
  const prev = parseOptionalNumber(day.turbines[t]?.previous);
  const pres = parseOptionalNumber(day.turbines[t]?.present);
  const operatingTime = parseOperatingTime(day.turbines[t]?.hours || "24");
  const hours = Math.max(
    0.000001,
    operatingTime.hours + operatingTime.minutes / 60,
  );

  const rawDiff = computeDiff(prev, pres);
  if (rawDiff === null) {
    return {
      prev,
      pres,
      hours,
      diff: null,
      mwPerHr: null,
      isStopped: true,
      hasError: false,
    };
  }

  const hasError = rawDiff < 0;
  const diff = hasError ? 0 : rawDiff;
  const mwPerHr = diff / hours;

  return { prev, pres, hours, diff, mwPerHr, isStopped: false, hasError };
}

export function gasForTurbine(diffMwh: number, mwPerHr: number): number {
  const p = diffMwh;
  const r = mwPerHr;

  if (r <= 3) return p * 1000;
  if (r <= 5) return p * 700;
  if (r <= 8) return p * 500;
  return p * 420;
}

export async function exportAllData(): Promise<string> {
  try {
    const days = await getAllDaysData();
    const settings = await getSettings();
    return JSON.stringify(
      { days, settings, exportedAt: new Date().toISOString() },
      null,
      2,
    );
  } catch {
    return "{}";
  }
}

export async function importData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (data.days && Array.isArray(data.days)) {
      for (const day of data.days) {
        await saveDayData(day, { source: "user" });
      }
    }
    if (data.settings) {
      await saveSettings(data.settings, { source: "user" });
    }
    return true;
  } catch {
    return false;
  }
}

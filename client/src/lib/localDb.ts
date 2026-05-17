import * as SQLite from "expo-sqlite";

export type SqlValue = string | number | null;

export const LOCAL_ONLY_USER_ID = "local-only";

let activeUserId = LOCAL_ONLY_USER_ID;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DB_NAME = "energy-flow-offline.db";

export function setActiveLocalUserId(userId: string | null | undefined): void {
  activeUserId = userId || LOCAL_ONLY_USER_ID;
}

export function getActiveLocalUserId(): string {
  return activeUserId;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS local_days (
      user_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      remote_id TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (user_id, date_key)
    );

    CREATE TABLE IF NOT EXISTS local_feeders (
      user_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      feeder_name TEXT NOT NULL,
      start_reading TEXT,
      end_reading TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (user_id, date_key, feeder_name)
    );

    CREATE TABLE IF NOT EXISTS local_turbines (
      user_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      turbine_name TEXT NOT NULL,
      previous_reading TEXT,
      present_reading TEXT,
      hours TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (user_id, date_key, turbine_name)
    );

    CREATE TABLE IF NOT EXISTS local_settings (
      user_id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      decimal_precision INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      entity_table TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'failed')),
      last_error TEXT,
      idempotency_key TEXT NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_local_days_user_date
      ON local_days (user_id, date_key);

    CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status
      ON sync_queue (user_id, sync_status, created_at);

    CREATE TABLE IF NOT EXISTS local_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

export async function getLocalDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }

  return dbPromise;
}

export async function runSql(
  sql: string,
  params: SqlValue[] = [],
): Promise<SQLite.SQLiteRunResult> {
  const db = await getLocalDb();
  return db.runAsync(sql, ...params);
}

export async function getAllSql<T>(
  sql: string,
  params: SqlValue[] = [],
): Promise<T[]> {
  const db = await getLocalDb();
  return db.getAllAsync<T>(sql, ...params);
}

export async function getFirstSql<T>(
  sql: string,
  params: SqlValue[] = [],
): Promise<T | null> {
  const db = await getLocalDb();
  return db.getFirstAsync<T>(sql, ...params);
}

export async function getMetadata(key: string): Promise<string | null> {
  const row = await getFirstSql<{ value: string }>(
    "SELECT value FROM local_metadata WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function setMetadata(key: string, value: string): Promise<void> {
  await runSql(
    `INSERT INTO local_metadata (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function clearLocalUserData(userId: string): Promise<void> {
  await runSql("DELETE FROM sync_queue WHERE user_id = ?", [userId]);
  await runSql("DELETE FROM local_turbines WHERE user_id = ?", [userId]);
  await runSql("DELETE FROM local_feeders WHERE user_id = ?", [userId]);
  await runSql("DELETE FROM local_days WHERE user_id = ?", [userId]);
  await runSql("DELETE FROM local_settings WHERE user_id = ?", [userId]);
}

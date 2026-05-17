import {
  getActiveLocalUserId,
  getAllSql,
  getFirstSql,
  runSql,
} from "@/lib/localDb";

export type SyncEntityTable = "daily_data" | "settings";
export type SyncAction = "create" | "update" | "delete";
export type SyncStatus = "pending" | "synced" | "failed";

export interface SyncQueueRecord {
  id: string;
  userId: string;
  table: SyncEntityTable;
  entityId: string;
  action: SyncAction;
  payload: unknown;
  createdAt: string;
  retryCount: number;
  syncStatus: SyncStatus;
  lastError: string | null;
}

interface SyncQueueRow {
  id: string;
  user_id: string;
  entity_table: SyncEntityTable;
  entity_id: string;
  action: SyncAction;
  payload: string;
  created_at: string;
  retry_count: number;
  sync_status: SyncStatus;
  last_error: string | null;
}

export interface EnqueueSyncInput {
  userId?: string;
  table: SyncEntityTable;
  entityId: string;
  action: SyncAction;
  payload: unknown;
  createdAt?: string;
}

function createSyncId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRecord(row: SyncQueueRow): SyncQueueRecord {
  return {
    id: row.id,
    userId: row.user_id,
    table: row.entity_table,
    entityId: row.entity_id,
    action: row.action,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
    retryCount: row.retry_count,
    syncStatus: row.sync_status,
    lastError: row.last_error,
  };
}

async function markSupersededEntityItems({
  userId,
  table,
  entityId,
  action,
}: {
  userId: string;
  table: SyncEntityTable;
  entityId: string;
  action: SyncAction;
}): Promise<void> {
  // Keep one final intent per entity. A delete supersedes older updates, and a
  // later update supersedes a pending delete for the same day.
  await runSql(
    `UPDATE sync_queue
     SET sync_status = 'synced'
     WHERE user_id = ?
       AND entity_table = ?
       AND entity_id = ?
       AND action <> ?
       AND sync_status IN ('pending', 'failed')`,
    [userId, table, entityId, action],
  );
}

export async function enqueueSyncRecord(
  input: EnqueueSyncInput,
): Promise<SyncQueueRecord> {
  const userId = input.userId ?? getActiveLocalUserId();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const idempotencyKey = `${userId}:${input.table}:${input.entityId}:${input.action}`;
  const payload = JSON.stringify(input.payload);
  const id = createSyncId();

  await markSupersededEntityItems({
    userId,
    table: input.table,
    entityId: input.entityId,
    action: input.action,
  });

  await runSql(
    `INSERT INTO sync_queue (
       id,
       user_id,
       entity_table,
       entity_id,
       action,
       payload,
       created_at,
       retry_count,
       sync_status,
       last_error,
       idempotency_key
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', NULL, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       payload = excluded.payload,
       created_at = excluded.created_at,
       retry_count = 0,
       sync_status = 'pending',
       last_error = NULL`,
    [
      id,
      userId,
      input.table,
      input.entityId,
      input.action,
      payload,
      createdAt,
      idempotencyKey,
    ],
  );

  const row = await getFirstSql<SyncQueueRow>(
    "SELECT * FROM sync_queue WHERE idempotency_key = ?",
    [idempotencyKey],
  );

  if (!row) {
    throw new Error("Queued sync record could not be loaded");
  }

  return toRecord(row);
}

export async function getPendingSyncRecords(
  userId: string,
): Promise<SyncQueueRecord[]> {
  const rows = await getAllSql<SyncQueueRow>(
    `SELECT *
     FROM sync_queue
     WHERE user_id = ?
       AND sync_status IN ('pending', 'failed')
     ORDER BY created_at ASC`,
    [userId],
  );
  return rows.map(toRecord);
}

export async function hasPendingSyncForEntity({
  userId,
  table,
  entityId,
}: {
  userId: string;
  table: SyncEntityTable;
  entityId: string;
}): Promise<boolean> {
  const row = await getFirstSql<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM sync_queue
     WHERE user_id = ?
       AND entity_table = ?
       AND entity_id = ?
       AND sync_status IN ('pending', 'failed')`,
    [userId, table, entityId],
  );
  return (row?.count ?? 0) > 0;
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  const row = await getFirstSql<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM sync_queue
     WHERE user_id = ?
       AND sync_status IN ('pending', 'failed')`,
    [userId],
  );
  return row?.count ?? 0;
}

export async function markSyncRecordSynced(id: string): Promise<void> {
  await runSql(
    `UPDATE sync_queue
     SET sync_status = 'synced', last_error = NULL
     WHERE id = ?`,
    [id],
  );
}

export async function markSyncRecordFailed(
  id: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await runSql(
    `UPDATE sync_queue
     SET sync_status = 'failed',
         retry_count = retry_count + 1,
         last_error = ?
     WHERE id = ?`,
    [message.slice(0, 500), id],
  );
}

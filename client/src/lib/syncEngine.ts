import {
  canUseRemoteNetwork,
  getCurrentConnectivity,
  isExpectedOfflineError,
} from "@/lib/connectivity";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getDayData,
  getLocalDayMeta,
  getSettings,
  saveDayData,
  saveSettings,
  type DayData,
  type UserSettings,
} from "@/lib/storage";
import {
  deleteDayFromSupabaseByDateKey,
  fetchAllRemoteDayMeta,
  fetchRemoteDayMeta,
  fetchRemoteDaySnapshot,
  fetchUserProfile,
  syncDayToSupabase,
  updateUserProfile,
} from "@/lib/supabaseSync";
import {
  getPendingSyncCount,
  getPendingSyncRecords,
  hasPendingSyncForEntity,
  markSyncRecordFailed,
  markSyncRecordSynced,
  type SyncQueueRecord,
} from "@/lib/syncQueue";

export type SyncEngineStatus = "offline" | "syncing" | "synced" | "failed";

export interface SyncRunResult {
  status: SyncEngineStatus;
  pushed: number;
  pulled: number;
  failed: number;
  pending: number;
  error?: string;
}

type DaySyncPayload = {
  dateKey: string;
  day?: DayData;
  updatedAt?: string;
  remoteId?: string | null;
};

type SettingsSyncPayload = {
  settings?: UserSettings;
  updatedAt?: string;
};

let runningSync: Promise<SyncRunResult> | null = null;

class SyncPausedOfflineError extends Error {
  constructor() {
    super("Sync paused while offline");
    this.name = "SyncPausedOfflineError";
  }
}

function compareTimestamp(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftMs = left ? Date.parse(left) : 0;
  const rightMs = right ? Date.parse(right) : 0;
  return leftMs - rightMs;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function assertStillOnline(): Promise<void> {
  if (!(await canUseRemoteNetwork())) {
    throw new SyncPausedOfflineError();
  }
}

async function assertRemoteSuccess(
  success: boolean,
  message: string,
): Promise<void> {
  if (success) return;
  await assertStillOnline();
  throw new Error(message);
}

async function isOfflineSyncError(error: unknown): Promise<boolean> {
  if (error instanceof SyncPausedOfflineError) return true;
  if (!isExpectedOfflineError(error)) return false;
  return !(await canUseRemoteNetwork());
}

async function pushDayUpdate(
  userId: string,
  record: SyncQueueRecord,
): Promise<"pushed" | "pulled"> {
  const payload = record.payload as DaySyncPayload;
  const dateKey = payload.dateKey;
  const localMeta = await getLocalDayMeta(dateKey);
  const localUpdatedAt =
    localMeta?.updatedAt ?? payload.updatedAt ?? new Date().toISOString();
  const remote = await fetchRemoteDaySnapshot(userId, dateKey);
  await assertStillOnline();

  if (remote && compareTimestamp(remote.updatedAt, localUpdatedAt) > 0) {
    await saveDayData(remote.day, {
      source: "sync",
      updatedAt: remote.updatedAt,
      remoteId: remote.remoteId,
    });
    return "pulled";
  }

  const localDay = {
    ...(await getDayData(dateKey)),
    updatedAt: localUpdatedAt,
  };
  const success = await syncDayToSupabase(userId, localDay, {
    updatedAt: localUpdatedAt,
  });
  await assertRemoteSuccess(success, `Failed to upload day ${dateKey}`);

  return "pushed";
}

async function pushDayDelete(
  userId: string,
  record: SyncQueueRecord,
): Promise<"pushed" | "pulled"> {
  const payload = record.payload as DaySyncPayload;
  const dateKey = payload.dateKey;
  const localDeletedAt = payload.updatedAt ?? new Date().toISOString();
  const remoteMeta = await fetchRemoteDayMeta(userId, dateKey);
  await assertStillOnline();

  if (
    remoteMeta &&
    compareTimestamp(remoteMeta.updatedAt, localDeletedAt) > 0
  ) {
    const remote = await fetchRemoteDaySnapshot(userId, dateKey);
    await assertStillOnline();
    if (remote) {
      await saveDayData(remote.day, {
        source: "sync",
        updatedAt: remote.updatedAt,
        remoteId: remote.remoteId,
      });
    }
    return "pulled";
  }

  const success = await deleteDayFromSupabaseByDateKey(userId, dateKey);
  await assertRemoteSuccess(success, `Failed to delete day ${dateKey}`);

  return "pushed";
}

async function pushSettings(
  userId: string,
  record: SyncQueueRecord,
): Promise<"pushed" | "pulled"> {
  const payload = record.payload as SettingsSyncPayload;
  const localSettings = payload.settings ?? (await getSettings());
  const localUpdatedAt =
    payload.updatedAt ?? localSettings.updatedAt ?? new Date().toISOString();
  const remoteSettings = await fetchUserProfile(userId);
  await assertStillOnline();

  if (
    remoteSettings?.updatedAt &&
    compareTimestamp(remoteSettings.updatedAt, localUpdatedAt) > 0
  ) {
    await saveSettings(remoteSettings, {
      source: "sync",
      updatedAt: remoteSettings.updatedAt,
    });
    return "pulled";
  }

  const success = await updateUserProfile(userId, {
    ...localSettings,
    updatedAt: localUpdatedAt,
  });
  await assertRemoteSuccess(success, "Failed to upload settings");

  return "pushed";
}

async function processQueue(userId: string): Promise<{
  pushed: number;
  pulled: number;
  failed: number;
  offline: boolean;
}> {
  let pushed = 0;
  let pulled = 0;
  let failed = 0;
  const records = await getPendingSyncRecords(userId);

  for (const record of records) {
    try {
      let result: "pushed" | "pulled" = "pushed";

      if (record.table === "daily_data" && record.action === "delete") {
        result = await pushDayDelete(userId, record);
      } else if (record.table === "daily_data") {
        result = await pushDayUpdate(userId, record);
      } else if (record.table === "settings") {
        result = await pushSettings(userId, record);
      }

      await markSyncRecordSynced(record.id);
      if (result === "pushed") pushed += 1;
      else pulled += 1;
    } catch (error) {
      if (await isOfflineSyncError(error)) {
        if (__DEV__) console.warn("Sync paused while offline.");
        return { pushed, pulled, failed, offline: true };
      }

      failed += 1;
      await markSyncRecordFailed(record.id, error);
      console.warn("Sync queue item failed:", error);
    }
  }

  return { pushed, pulled, failed, offline: false };
}

async function pullRemoteChanges(userId: string): Promise<{
  pushed: number;
  pulled: number;
}> {
  let pushed = 0;
  let pulled = 0;
  const remoteDays = await fetchAllRemoteDayMeta(userId);
  await assertStillOnline();

  for (const remoteMeta of remoteDays) {
    const hasPending = await hasPendingSyncForEntity({
      userId,
      table: "daily_data",
      entityId: remoteMeta.dateKey,
    });

    if (hasPending) continue;

    const localMeta = await getLocalDayMeta(remoteMeta.dateKey);

    if (localMeta?.deletedAt) {
      if (compareTimestamp(remoteMeta.updatedAt, localMeta.deletedAt) > 0) {
        const remote = await fetchRemoteDaySnapshot(userId, remoteMeta.dateKey);
        await assertStillOnline();
        if (remote) {
          await saveDayData(remote.day, {
            source: "sync",
            updatedAt: remote.updatedAt,
            remoteId: remote.remoteId,
          });
          pulled += 1;
        }
      } else {
        const success = await deleteDayFromSupabaseByDateKey(
          userId,
          remoteMeta.dateKey,
        );
        await assertRemoteSuccess(
          success,
          `Failed to delete day ${remoteMeta.dateKey}`,
        );
        if (success) pushed += 1;
      }
      continue;
    }

    if (
      !localMeta ||
      compareTimestamp(remoteMeta.updatedAt, localMeta.updatedAt) > 0
    ) {
      const remote = await fetchRemoteDaySnapshot(userId, remoteMeta.dateKey);
      await assertStillOnline();
      if (remote) {
        await saveDayData(remote.day, {
          source: "sync",
          updatedAt: remote.updatedAt,
          remoteId: remote.remoteId,
        });
        pulled += 1;
      }
      continue;
    }

    if (compareTimestamp(localMeta.updatedAt, remoteMeta.updatedAt) > 0) {
      const localDay = {
        ...(await getDayData(remoteMeta.dateKey)),
        updatedAt: localMeta.updatedAt,
      };
      const success = await syncDayToSupabase(userId, localDay, {
        updatedAt: localMeta.updatedAt,
      });
      await assertRemoteSuccess(
        success,
        `Failed to upload day ${remoteMeta.dateKey}`,
      );
      if (success) pushed += 1;
    }
  }

  return { pushed, pulled };
}

async function runSync(userId: string): Promise<SyncRunResult> {
  if (!isSupabaseConfigured) {
    return {
      status: "synced",
      pushed: 0,
      pulled: 0,
      failed: 0,
      pending: 0,
    };
  }

  const connectivity = await getCurrentConnectivity();
  if (!connectivity.isOnline) {
    const pending = await getPendingSyncCount(userId);
    return {
      status: "offline",
      pushed: 0,
      pulled: 0,
      failed: 0,
      pending,
    };
  }

  try {
    const queueResult = await processQueue(userId);
    if (queueResult.offline) {
      const pending = await getPendingSyncCount(userId);
      return {
        status: "offline",
        pushed: queueResult.pushed,
        pulled: queueResult.pulled,
        failed: 0,
        pending,
      };
    }

    const pullResult = await pullRemoteChanges(userId);
    await assertStillOnline();

    const pending = await getPendingSyncCount(userId);
    const failed = queueResult.failed;

    return {
      status: failed > 0 || pending > 0 ? "failed" : "synced",
      pushed: queueResult.pushed + pullResult.pushed,
      pulled: queueResult.pulled + pullResult.pulled,
      failed,
      pending,
    };
  } catch (error) {
    if (await isOfflineSyncError(error)) {
      const pending = await getPendingSyncCount(userId);
      return {
        status: "offline",
        pushed: 0,
        pulled: 0,
        failed: 0,
        pending,
      };
    }

    throw error;
  }
}

export async function synchronizeOfflineChanges(
  userId: string,
): Promise<SyncRunResult> {
  if (runningSync) return runningSync;

  runningSync = runSync(userId)
    .catch(async (error) => {
      const pending = await getPendingSyncCount(userId).catch(() => 0);
      return {
        status: "failed" as const,
        pushed: 0,
        pulled: 0,
        failed: pending,
        pending,
        error: errorMessage(error),
      };
    })
    .finally(() => {
      runningSync = null;
    });

  return runningSync;
}

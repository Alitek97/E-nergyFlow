import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import {
  LOCAL_DATABASE_NAME,
  getLocalDatabaseStatus,
  type LocalDatabaseStatus,
} from "@/lib/localDb";
import { getSyncQueueSummary, type SyncQueueSummary } from "@/lib/syncQueue";
import {
  getLastSuccessfulSyncAt,
  synchronizeOfflineChanges,
  type SyncEngineStatus,
  type SyncRunResult,
} from "@/lib/syncEngine";

type SyncLocalDatabaseStatus =
  | LocalDatabaseStatus
  | {
      status: "checking";
      name: string;
    };

interface SyncContextType {
  status: SyncEngineStatus;
  pendingCount: number;
  queueSummary: SyncQueueSummary;
  lastSuccessfulSyncAt: string | null;
  localDatabaseStatus: SyncLocalDatabaseStatus;
  lastError: string | null;
  isOnline: boolean;
  triggerSync: () => Promise<SyncRunResult | null>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const EMPTY_QUEUE_SUMMARY: SyncQueueSummary = {
  pending: 0,
  failed: 0,
  total: 0,
  retryCount: 0,
  oldestCreatedAt: null,
  lastError: null,
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const connectivity = useConnectivity();
  const [status, setStatus] = useState<SyncEngineStatus>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const [queueSummary, setQueueSummary] =
    useState<SyncQueueSummary>(EMPTY_QUEUE_SUMMARY);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAtState] = useState<
    string | null
  >(null);
  const [localDatabaseStatus, setLocalDatabaseStatus] =
    useState<SyncLocalDatabaseStatus>({
      status: "checking",
      name: LOCAL_DATABASE_NAME,
    });
  const [lastError, setLastError] = useState<string | null>(null);
  const syncInFlightRef = useRef<Promise<SyncRunResult | null> | null>(null);

  const refreshSyncDetails = useCallback(async () => {
    const databaseStatus = await getLocalDatabaseStatus();
    setLocalDatabaseStatus(databaseStatus);

    if (!user?.id || databaseStatus.status !== "ready") {
      setPendingCount(0);
      setQueueSummary(EMPTY_QUEUE_SUMMARY);
      setLastSuccessfulSyncAtState(null);
      return EMPTY_QUEUE_SUMMARY;
    }

    const [summary, lastSuccessfulAt] = await Promise.all([
      getSyncQueueSummary(user.id),
      getLastSuccessfulSyncAt(user.id),
    ]);

    setQueueSummary(summary);
    setPendingCount(summary.total);
    setLastSuccessfulSyncAtState(lastSuccessfulAt);
    return summary;
  }, [user?.id]);

  const triggerSync = useCallback(async () => {
    if (syncInFlightRef.current) {
      return syncInFlightRef.current;
    }

    const syncTask = (async () => {
      if (!user?.id || !isConfigured) {
        setStatus(connectivity.isOnline ? "synced" : "offline");
        setLastError(null);
        await refreshSyncDetails();
        return null;
      }

      if (!connectivity.isOnline) {
        setStatus("offline");
        setLastError(null);
        await refreshSyncDetails();
        return null;
      }

      setStatus("syncing");
      setLastError(null);
      const result = await synchronizeOfflineChanges(user.id);
      setStatus(result.status);
      setLastError(result.error ?? null);
      await refreshSyncDetails();
      return result;
    })().finally(() => {
      syncInFlightRef.current = null;
    });

    syncInFlightRef.current = syncTask;
    return syncTask;
  }, [connectivity.isOnline, isConfigured, refreshSyncDetails, user?.id]);

  useEffect(() => {
    if (!connectivity.isOnline) {
      setStatus("offline");
      setLastError(null);
      void refreshSyncDetails();
      return;
    }

    void triggerSync();
  }, [connectivity.isOnline, refreshSyncDetails, triggerSync]);

  const value = useMemo(
    () => ({
      status,
      pendingCount,
      queueSummary,
      lastSuccessfulSyncAt,
      localDatabaseStatus,
      lastError,
      isOnline: connectivity.isOnline,
      triggerSync,
    }),
    [
      connectivity.isOnline,
      lastError,
      lastSuccessfulSyncAt,
      localDatabaseStatus,
      pendingCount,
      queueSummary,
      status,
      triggerSync,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncStatus() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncStatus must be used within a SyncProvider");
  }
  return context;
}

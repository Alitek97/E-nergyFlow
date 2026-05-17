import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getPendingSyncCount } from "@/lib/syncQueue";
import {
  synchronizeOfflineChanges,
  type SyncEngineStatus,
  type SyncRunResult,
} from "@/lib/syncEngine";

interface SyncContextType {
  status: SyncEngineStatus;
  pendingCount: number;
  lastError: string | null;
  isOnline: boolean;
  triggerSync: () => Promise<SyncRunResult | null>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const connectivity = useConnectivity();
  const [status, setStatus] = useState<SyncEngineStatus>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    if (!user?.id) {
      setPendingCount(0);
      return 0;
    }

    const count = await getPendingSyncCount(user.id);
    setPendingCount(count);
    return count;
  }, [user?.id]);

  const triggerSync = useCallback(async () => {
    if (!user?.id || !isConfigured) {
      setStatus(connectivity.isOnline ? "synced" : "offline");
      await refreshPendingCount();
      return null;
    }

    if (!connectivity.isOnline) {
      setStatus("offline");
      await refreshPendingCount();
      return null;
    }

    setStatus("syncing");
    const result = await synchronizeOfflineChanges(user.id);
    setStatus(result.status);
    setPendingCount(result.pending);
    setLastError(result.error ?? null);
    return result;
  }, [connectivity.isOnline, isConfigured, refreshPendingCount, user?.id]);

  useEffect(() => {
    if (!connectivity.isOnline) {
      setStatus("offline");
      void refreshPendingCount();
      return;
    }

    void triggerSync();
  }, [connectivity.isOnline, refreshPendingCount, triggerSync]);

  const value = useMemo(
    () => ({
      status,
      pendingCount,
      lastError,
      isOnline: connectivity.isOnline,
      triggerSync,
    }),
    [connectivity.isOnline, lastError, pendingCount, status, triggerSync],
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

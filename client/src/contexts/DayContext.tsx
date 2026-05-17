import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  DayData,
  todayKey,
  defaultDay,
  getDayDataWithLinkedValues,
  saveDayDataWithLinkage,
} from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncStatus } from "@/contexts/SyncContext";

interface DayContextType {
  dateKey: string;
  setDateKey: (key: string) => void;
  day: DayData;
  setDay: React.Dispatch<React.SetStateAction<DayData>>;
  saveDay: () => Promise<void>;
  resetDay: () => void;
  loading: boolean;
  syncing: boolean;
}

const DayContext = createContext<DayContextType | undefined>(undefined);

export function DayProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { status: syncStatus, triggerSync } = useSyncStatus();
  const [dateKey, setDateKey] = useState(todayKey());
  const [day, setDay] = useState<DayData>(defaultDay(dateKey));
  const [loading, setLoading] = useState(true);
  const syncing = syncStatus === "syncing";

  const loadDay = useCallback(async () => {
    setLoading(true);

    const data = await getDayDataWithLinkedValues(dateKey);

    setDay(data);
    setLoading(false);
  }, [dateKey]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  useEffect(() => {
    if (!user?.id) return;

    void triggerSync().then((result) => {
      if (result && result.pulled > 0) {
        void loadDay();
      }
    });
  }, [loadDay, triggerSync, user?.id]);

  const saveDay = useCallback(async () => {
    const dayToSave = { ...day, dateKey };

    await saveDayDataWithLinkage(dayToSave, {
      source: "user",
    });

    if (user?.id) {
      void triggerSync();
    }
  }, [day, dateKey, triggerSync, user?.id]);

  const resetDay = useCallback(() => {
    setDay(defaultDay(dateKey));
  }, [dateKey]);

  const value = useMemo(
    () => ({
      dateKey,
      setDateKey,
      day,
      setDay,
      saveDay,
      resetDay,
      loading,
      syncing,
    }),
    [dateKey, day, saveDay, resetDay, loading, syncing],
  );

  return <DayContext.Provider value={value}>{children}</DayContext.Provider>;
}

export function useDay() {
  const context = useContext(DayContext);
  if (!context) {
    throw new Error("useDay must be used within a DayProvider");
  }
  return context;
}

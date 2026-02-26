import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  DayData,
  todayKey,
  defaultDay,
  getDayDataWithLinkedValues,
  saveDayData,
} from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import {
  syncDayToSupabase,
  initializeDayCarryOver,
} from "@/lib/supabaseSync";

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
  const [dateKey, setDateKey] = useState(todayKey());
  const [day, setDay] = useState<DayData>(defaultDay(dateKey));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadDay = useCallback(async () => {
    setLoading(true);
    
    let data = await getDayDataWithLinkedValues(dateKey);
    
    if (user?.id) {
      try {
        const { day: cloudData } = await initializeDayCarryOver(user.id, dateKey);
        data = cloudData;
      } catch (error) {
        console.error("Error fetching from Supabase:", error);
      }
    }
    
    setDay(data);
    setLoading(false);
  }, [dateKey, user?.id]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const saveDay = useCallback(async () => {
    const dayToSave = { ...day, dateKey };
    
    await saveDayData(dayToSave);
    
    if (user?.id) {
      setSyncing(true);
      try {
        await syncDayToSupabase(user.id, dayToSave);
      } catch (error) {
        console.error("Error syncing to Supabase:", error);
      } finally {
        setSyncing(false);
      }
    }
  }, [day, dateKey, user?.id]);

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
    [dateKey, day, saveDay, resetDay, loading, syncing]
  );

  return (
    <DayContext.Provider value={value}>
      {children}
    </DayContext.Provider>
  );
}

export function useDay() {
  const context = useContext(DayContext);
  if (!context) {
    throw new Error("useDay must be used within a DayProvider");
  }
  return context;
}

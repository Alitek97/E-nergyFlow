import { supabase } from "./supabase";
import {
  canUseRemoteNetwork,
  shouldSilenceExpectedOfflineError,
} from "./connectivity";
import {
  DayData,
  FeederData,
  TurbineData,
  UserSettings,
  FEEDERS,
  TURBINES,
  defaultDay,
  getDayData,
  getPreviousDateKey,
  saveDayData,
  parseReading,
} from "./storage";

async function canStartRemoteRequest(): Promise<boolean> {
  return canUseRemoteNetwork();
}

async function logSupabaseError(
  message: string,
  error: unknown,
): Promise<void> {
  if (await shouldSilenceExpectedOfflineError(error)) {
    return;
  }

  console.error(`${message}:`, error);
}

export async function syncDayToSupabase(
  userId: string,
  day: DayData,
  options: { updatedAt?: string } = {},
): Promise<boolean> {
  if (!(await canStartRemoteRequest())) return false;

  try {
    const updatedAt =
      options.updatedAt ?? day.updatedAt ?? new Date().toISOString();
    const { data: existingDay, error: fetchError } = await supabase
      .from("daily_data")
      .select("id, updated_at")
      .eq("user_id", userId)
      .eq("date_key", day.dateKey)
      .single();

    let dailyDataId: string;

    if (fetchError && fetchError.code === "PGRST116") {
      const { data: newDay, error: insertError } = await supabase
        .from("daily_data")
        .insert({
          user_id: userId,
          date_key: day.dateKey,
          updated_at: updatedAt,
        })
        .select("id")
        .single();

      if (insertError || !newDay) {
        await logSupabaseError("Error creating daily_data", insertError);
        return false;
      }
      dailyDataId = newDay.id;
    } else if (fetchError) {
      await logSupabaseError("Error fetching daily_data", fetchError);
      return false;
    } else {
      dailyDataId = existingDay.id;
      const { error: updateDayError } = await supabase
        .from("daily_data")
        .update({ updated_at: updatedAt })
        .eq("id", dailyDataId);

      if (updateDayError) {
        await logSupabaseError("Error touching daily_data", updateDayError);
        return false;
      }
    }

    let hadRowError = false;

    for (const feederName of FEEDERS) {
      const feeder = day.feeders[feederName] || { start: "", end: "" };
      const startReading =
        feeder.start && feeder.start.trim() !== "" ? feeder.start : null;
      const endReading =
        feeder.end && feeder.end.trim() !== "" ? feeder.end : null;
      const { error } = await supabase.from("feeders").upsert(
        {
          daily_data_id: dailyDataId,
          feeder_name: feederName,
          start_reading: startReading,
          end_reading: endReading,
          updated_at: updatedAt,
        },
        { onConflict: "daily_data_id,feeder_name" },
      );

      if (error) {
        await logSupabaseError(`Error upserting feeder ${feederName}`, error);
        hadRowError = true;
      }
    }

    for (const turbineName of TURBINES) {
      const turbine = day.turbines[turbineName] || {
        previous: "",
        present: "",
        hours: "24",
      };
      const previousReading =
        turbine.previous && turbine.previous.trim() !== ""
          ? turbine.previous
          : null;
      const presentReading =
        turbine.present && turbine.present.trim() !== ""
          ? turbine.present
          : null;
      const { error } = await supabase.from("turbines").upsert(
        {
          daily_data_id: dailyDataId,
          turbine_name: turbineName,
          previous_reading: previousReading,
          present_reading: presentReading,
          hours: turbine.hours,
          updated_at: updatedAt,
        },
        { onConflict: "daily_data_id,turbine_name" },
      );

      if (error) {
        await logSupabaseError(`Error upserting turbine ${turbineName}`, error);
        hadRowError = true;
      }
    }

    return !hadRowError;
  } catch (error) {
    await logSupabaseError("Error syncing day to Supabase", error);
    return false;
  }
}

export async function fetchDayFromSupabase(
  userId: string,
  dateKey: string,
): Promise<DayData | null> {
  if (!(await canStartRemoteRequest())) return null;

  try {
    const { data: dailyData, error: dayError } = await supabase
      .from("daily_data")
      .select("id, updated_at")
      .eq("user_id", userId)
      .eq("date_key", dateKey)
      .single();

    if (dayError) {
      if (dayError.code === "PGRST116") {
        return null;
      }
      await logSupabaseError("Error fetching daily_data", dayError);
      return null;
    }

    const { data: feedersData, error: feedersError } = await supabase
      .from("feeders")
      .select("feeder_name, start_reading, end_reading")
      .eq("daily_data_id", dailyData.id);

    if (feedersError) {
      await logSupabaseError("Error fetching feeders", feedersError);
    }

    const { data: turbinesData, error: turbinesError } = await supabase
      .from("turbines")
      .select("turbine_name, previous_reading, present_reading, hours")
      .eq("daily_data_id", dailyData.id);

    if (turbinesError) {
      await logSupabaseError("Error fetching turbines", turbinesError);
    }

    const feeders: Record<string, FeederData> = {};
    for (const f of FEEDERS) {
      const found = feedersData?.find((fd) => fd.feeder_name === f);
      feeders[f] = {
        start: found?.start_reading || "",
        end: found?.end_reading || "",
      };
    }

    const turbines: Record<string, TurbineData> = {};
    for (const t of TURBINES) {
      const found = turbinesData?.find((td) => td.turbine_name === t);
      turbines[t] = {
        previous: found?.previous_reading || "",
        present: found?.present_reading || "",
        hours: found?.hours || "24",
      };
    }

    return {
      dateKey,
      feeders,
      turbines,
      updatedAt: dailyData.updated_at,
    };
  } catch (error) {
    await logSupabaseError("Error fetching day from Supabase", error);
    return null;
  }
}

export interface RemoteDayMeta {
  remoteId: string;
  dateKey: string;
  updatedAt: string;
}

export interface RemoteDaySnapshot extends RemoteDayMeta {
  day: DayData;
}

interface RemoteDayMetaResult {
  meta: RemoteDayMeta | null;
  requestFailed: boolean;
}

async function fetchRemoteDayMetaResult(
  userId: string,
  dateKey: string,
): Promise<RemoteDayMetaResult> {
  if (!(await canStartRemoteRequest())) {
    return { meta: null, requestFailed: true };
  }

  try {
    const { data, error } = await supabase
      .from("daily_data")
      .select("id, date_key, updated_at")
      .eq("user_id", userId)
      .eq("date_key", dateKey)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { meta: null, requestFailed: false };
      }
      throw error;
    }

    return {
      meta: {
        remoteId: data.id,
        dateKey: data.date_key,
        updatedAt: data.updated_at,
      },
      requestFailed: false,
    };
  } catch (error) {
    await logSupabaseError("Error fetching remote day metadata", error);
    return { meta: null, requestFailed: true };
  }
}

export async function fetchRemoteDayMeta(
  userId: string,
  dateKey: string,
): Promise<RemoteDayMeta | null> {
  const result = await fetchRemoteDayMetaResult(userId, dateKey);
  return result.meta;
}

export async function fetchRemoteDaySnapshot(
  userId: string,
  dateKey: string,
): Promise<RemoteDaySnapshot | null> {
  if (!(await canStartRemoteRequest())) return null;

  const [meta, day] = await Promise.all([
    fetchRemoteDayMeta(userId, dateKey),
    fetchDayFromSupabase(userId, dateKey),
  ]);

  if (!meta || !day) return null;

  return {
    ...meta,
    day: {
      ...day,
      updatedAt: meta.updatedAt,
    },
  };
}

export async function fetchAllRemoteDayMeta(
  userId: string,
): Promise<RemoteDayMeta[]> {
  if (!(await canStartRemoteRequest())) return [];

  try {
    const { data, error } = await supabase
      .from("daily_data")
      .select("id, date_key, updated_at")
      .eq("user_id", userId)
      .order("date_key", { ascending: true });

    if (error || !data) {
      if (error)
        await logSupabaseError("Error fetching remote day metadata", error);
      return [];
    }

    return data.map((row) => ({
      remoteId: row.id,
      dateKey: row.date_key,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    await logSupabaseError("Error fetching all remote day metadata", error);
    return [];
  }
}

export async function deleteDayFromSupabaseByDateKey(
  userId: string,
  dateKey: string,
): Promise<boolean> {
  if (!(await canStartRemoteRequest())) return false;

  const { meta, requestFailed } = await fetchRemoteDayMetaResult(
    userId,
    dateKey,
  );
  if (requestFailed) return false;
  if (!meta) return true;
  return deleteDayFromSupabase(meta.remoteId);
}

export async function fetchAllDaysFromSupabase(
  userId: string,
): Promise<string[]> {
  if (!(await canStartRemoteRequest())) return [];

  try {
    const { data, error } = await supabase
      .from("daily_data")
      .select("date_key")
      .eq("user_id", userId)
      .order("date_key", { ascending: true });

    if (error) {
      await logSupabaseError("Error fetching all days", error);
      return [];
    }

    return data.map((d) => d.date_key);
  } catch (error) {
    await logSupabaseError("Error fetching all days from Supabase", error);
    return [];
  }
}

export async function fetchUserProfile(
  userId: string,
): Promise<UserSettings | null> {
  if (!(await canStartRemoteRequest())) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, decimal_precision, updated_at")
      .eq("id", userId)
      .single();

    if (error) {
      await logSupabaseError("Error fetching profile", error);
      return null;
    }

    return {
      displayName: data.display_name || "Engineer",
      decimalPrecision: data.decimal_precision || 2,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    await logSupabaseError("Error fetching user profile", error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  settings: Partial<UserSettings>,
): Promise<boolean> {
  if (!(await canStartRemoteRequest())) return false;

  try {
    const updates: Record<string, unknown> = {};
    if (settings.displayName !== undefined) {
      updates.display_name = settings.displayName;
    }
    if (settings.decimalPrecision !== undefined) {
      updates.decimal_precision = settings.decimalPrecision;
    }
    updates.updated_at = settings.updatedAt ?? new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      await logSupabaseError("Error updating profile", error);
      return false;
    }

    return true;
  } catch (error) {
    await logSupabaseError("Error updating user profile", error);
    return false;
  }
}

export async function syncLocalDataToSupabase(
  userId: string,
  localDays: DayData[],
): Promise<number> {
  if (!(await canStartRemoteRequest())) return 0;

  let synced = 0;
  for (const day of localDays) {
    const success = await syncDayToSupabase(userId, day);
    if (success) synced++;
  }
  return synced;
}

export interface DaySummary {
  id: string;
  dateKey: string;
  production: number;
  exportVal: number;
  consumption: number;
}

export async function fetchMonthDaysFromSupabase(
  userId: string,
  monthKey: string,
): Promise<DaySummary[]> {
  if (!(await canStartRemoteRequest())) return [];

  try {
    const [year, month] = monthKey.split("-").map(Number);
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const { data: dailyData, error } = await supabase
      .from("daily_data")
      .select("id, date_key")
      .eq("user_id", userId)
      .gte("date_key", monthStart)
      .lt("date_key", nextMonthStart)
      .order("date_key", { ascending: false });

    if (error || !dailyData) {
      await logSupabaseError("Error fetching month days", error);
      return [];
    }

    const summaries: DaySummary[] = [];

    for (const day of dailyData) {
      const { data: feedersData } = await supabase
        .from("feeders")
        .select("start_reading, end_reading")
        .eq("daily_data_id", day.id);

      const { data: turbinesData } = await supabase
        .from("turbines")
        .select("previous_reading, present_reading")
        .eq("daily_data_id", day.id);

      let production = 0;
      let exportVal = 0;

      if (turbinesData) {
        for (const t of turbinesData) {
          const prev = parseReading(t.previous_reading) ?? 0;
          const pres = parseReading(t.present_reading);
          if (pres === null) continue;
          const diff = pres - prev;
          production += diff < 0 ? 0 : diff;
        }
      }

      if (feedersData) {
        for (const f of feedersData) {
          const start = parseReading(f.start_reading);
          const end = parseReading(f.end_reading);
          if (start === null || end === null) continue;
          exportVal += start - end;
        }
      }

      summaries.push({
        id: day.id,
        dateKey: day.date_key,
        production,
        exportVal,
        consumption: production - exportVal,
      });
    }

    return summaries;
  } catch (error) {
    await logSupabaseError("Error fetching month days", error);
    return [];
  }
}

export interface DayChartData {
  dateKey: string;
  production: number;
  exportVal: number;
  consumption: number;
}

export async function fetchRecentDaysFullFromSupabase(
  userId: string,
  limit: number = 7,
): Promise<DayData[]> {
  if (!(await canStartRemoteRequest())) return [];

  try {
    const { data: dailyData, error } = await supabase
      .from("daily_data")
      .select("id, date_key")
      .eq("user_id", userId)
      .order("date_key", { ascending: false })
      .limit(limit);

    if (error || !dailyData || dailyData.length === 0) {
      return [];
    }

    const dailyDataIds = dailyData.map((d) => d.id);

    const [feedersResult, turbinesResult] = await Promise.all([
      supabase
        .from("feeders")
        .select("daily_data_id, feeder_name, start_reading, end_reading")
        .in("daily_data_id", dailyDataIds),
      supabase
        .from("turbines")
        .select(
          "daily_data_id, turbine_name, previous_reading, present_reading, hours",
        )
        .in("daily_data_id", dailyDataIds),
    ]);

    const feedersMap = new Map<string, Record<string, FeederData>>();
    if (feedersResult.data) {
      for (const f of feedersResult.data) {
        if (!feedersMap.has(f.daily_data_id)) {
          feedersMap.set(f.daily_data_id, {});
        }
        const feeders = feedersMap.get(f.daily_data_id)!;
        feeders[f.feeder_name] = {
          start: f.start_reading || "",
          end: f.end_reading || "",
        };
      }
    }

    const turbinesMap = new Map<string, Record<string, TurbineData>>();
    if (turbinesResult.data) {
      for (const t of turbinesResult.data) {
        if (!turbinesMap.has(t.daily_data_id)) {
          turbinesMap.set(t.daily_data_id, {});
        }
        const turbines = turbinesMap.get(t.daily_data_id)!;
        turbines[t.turbine_name] = {
          previous: t.previous_reading || "",
          present: t.present_reading || "",
          hours: t.hours || "24",
        };
      }
    }

    const results: DayData[] = [];

    for (const day of dailyData) {
      const feeders: Record<string, FeederData> = {};
      const turbines: Record<string, TurbineData> = {};

      for (const f of FEEDERS) {
        const found = feedersMap.get(day.id)?.[f];
        feeders[f] = found || { start: "", end: "" };
      }

      for (const t of TURBINES) {
        const found = turbinesMap.get(day.id)?.[t];
        turbines[t] = found || { previous: "", present: "", hours: "24" };
      }

      results.push({
        dateKey: day.date_key,
        feeders,
        turbines,
      });
    }

    return results.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  } catch (error) {
    await logSupabaseError("Error fetching recent days full", error);
    return [];
  }
}

export async function fetchRecentDaysFromSupabase(
  userId: string,
  limit: number = 7,
): Promise<DayChartData[]> {
  if (!(await canStartRemoteRequest())) return [];

  try {
    const { data: dailyData, error } = await supabase
      .from("daily_data")
      .select("id, date_key")
      .eq("user_id", userId)
      .order("date_key", { ascending: false })
      .limit(limit);

    if (error || !dailyData || dailyData.length === 0) {
      return [];
    }

    const dailyDataIds = dailyData.map((d) => d.id);

    const { data: allFeeders } = await supabase
      .from("feeders")
      .select("daily_data_id, start_reading, end_reading")
      .in("daily_data_id", dailyDataIds);

    const { data: allTurbines } = await supabase
      .from("turbines")
      .select("daily_data_id, previous_reading, present_reading")
      .in("daily_data_id", dailyDataIds);

    const feedersMap = new Map<
      string,
      { start: number | null; end: number | null }[]
    >();
    if (allFeeders) {
      for (const f of allFeeders) {
        const existing = feedersMap.get(f.daily_data_id) || [];
        existing.push({
          start: parseReading(f.start_reading),
          end: parseReading(f.end_reading),
        });
        feedersMap.set(f.daily_data_id, existing);
      }
    }

    const turbinesMap = new Map<
      string,
      { prev: number | null; pres: number | null }[]
    >();
    if (allTurbines) {
      for (const t of allTurbines) {
        const existing = turbinesMap.get(t.daily_data_id) || [];
        existing.push({
          prev: parseReading(t.previous_reading),
          pres: parseReading(t.present_reading),
        });
        turbinesMap.set(t.daily_data_id, existing);
      }
    }

    const results: DayChartData[] = [];

    for (const day of dailyData) {
      let production = 0;
      let exportVal = 0;

      const turbines = turbinesMap.get(day.id) || [];
      for (const t of turbines) {
        if (t.pres === null) continue;
        const prev = t.prev ?? 0;
        const diff = t.pres - prev;
        production += diff < 0 ? 0 : diff;
      }

      const feeders = feedersMap.get(day.id) || [];
      for (const f of feeders) {
        if (f.start === null || f.end === null) continue;
        exportVal += f.start - f.end;
      }

      results.push({
        dateKey: day.date_key,
        production,
        exportVal,
        consumption: production - exportVal,
      });
    }

    return results.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  } catch (error) {
    await logSupabaseError("Error fetching recent days", error);
    return [];
  }
}

export interface MonthSummary {
  month: string;
  days: number;
  totalProduction: number;
  totalExport: number;
  totalConsumption: number;
}

export interface MonthListItem {
  month: string;
  days: number;
}

export async function fetchMonthsListFromSupabase(
  userId: string,
): Promise<MonthListItem[]> {
  if (!(await canStartRemoteRequest())) return [];

  try {
    const { data: dailyData, error } = await supabase
      .from("daily_data")
      .select("date_key")
      .eq("user_id", userId);

    if (error || !dailyData || dailyData.length === 0) {
      return [];
    }

    const monthCounts = new Map<string, number>();
    for (const day of dailyData) {
      const month = day.date_key.substring(0, 7);
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    }

    return Array.from(monthCounts.entries())
      .map(([month, days]) => ({ month, days }))
      .sort((a, b) => b.month.localeCompare(a.month));
  } catch (error) {
    await logSupabaseError("Error fetching months list", error);
    return [];
  }
}

export async function fetchSingleMonthFromSupabase(
  userId: string,
  monthKey: string,
): Promise<MonthSummary | null> {
  if (!(await canStartRemoteRequest())) return null;

  try {
    const monthStart = `${monthKey}-01`;
    const [year, month] = monthKey.split("-").map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const { data: dailyData, error } = await supabase
      .from("daily_data")
      .select("id, date_key")
      .eq("user_id", userId)
      .gte("date_key", monthStart)
      .lt("date_key", nextMonthStart);

    if (error || !dailyData || dailyData.length === 0) {
      return null;
    }

    const dailyDataIds = dailyData.map((d) => d.id);

    const [feedersResult, turbinesResult] = await Promise.all([
      supabase
        .from("feeders")
        .select("daily_data_id, start_reading, end_reading")
        .in("daily_data_id", dailyDataIds),
      supabase
        .from("turbines")
        .select("daily_data_id, previous_reading, present_reading")
        .in("daily_data_id", dailyDataIds),
    ]);

    let totalProduction = 0;
    let totalExport = 0;

    if (turbinesResult.data) {
      for (const t of turbinesResult.data) {
        const prev = parseReading(t.previous_reading) ?? 0;
        const pres = parseReading(t.present_reading);
        if (pres === null) continue;
        const diff = pres - prev;
        totalProduction += diff < 0 ? 0 : diff;
      }
    }

    if (feedersResult.data) {
      for (const f of feedersResult.data) {
        const start = parseReading(f.start_reading);
        const end = parseReading(f.end_reading);
        if (start === null || end === null) continue;
        totalExport += start - end;
      }
    }

    return {
      month: monthKey,
      days: dailyData.length,
      totalProduction,
      totalExport,
      totalConsumption: totalProduction - totalExport,
    };
  } catch (error) {
    await logSupabaseError("Error fetching single month", error);
    return null;
  }
}

export async function fetchAllMonthsFromSupabase(
  userId: string,
): Promise<MonthSummary[]> {
  if (!(await canStartRemoteRequest())) return [];

  try {
    const { data: dailyData, error } = await supabase
      .from("daily_data")
      .select("id, date_key")
      .eq("user_id", userId)
      .order("date_key", { ascending: false });

    if (error || !dailyData || dailyData.length === 0) {
      return [];
    }

    const dailyDataIds = dailyData.map((d) => d.id);

    const { data: allFeeders } = await supabase
      .from("feeders")
      .select("daily_data_id, start_reading, end_reading")
      .in("daily_data_id", dailyDataIds);

    const { data: allTurbines } = await supabase
      .from("turbines")
      .select("daily_data_id, previous_reading, present_reading")
      .in("daily_data_id", dailyDataIds);

    const feedersMap = new Map<
      string,
      { start: number | null; end: number | null }[]
    >();
    if (allFeeders) {
      for (const f of allFeeders) {
        const existing = feedersMap.get(f.daily_data_id) || [];
        existing.push({
          start: parseReading(f.start_reading),
          end: parseReading(f.end_reading),
        });
        feedersMap.set(f.daily_data_id, existing);
      }
    }

    const turbinesMap = new Map<
      string,
      { prev: number | null; pres: number | null }[]
    >();
    if (allTurbines) {
      for (const t of allTurbines) {
        const existing = turbinesMap.get(t.daily_data_id) || [];
        existing.push({
          prev: parseReading(t.previous_reading),
          pres: parseReading(t.present_reading),
        });
        turbinesMap.set(t.daily_data_id, existing);
      }
    }

    const monthMap = new Map<string, MonthSummary>();

    for (const day of dailyData) {
      const monthKey = day.date_key.substring(0, 7);

      let production = 0;
      let exportVal = 0;

      const turbines = turbinesMap.get(day.id) || [];
      for (const t of turbines) {
        if (t.pres === null) continue;
        const prev = t.prev ?? 0;
        const diff = t.pres - prev;
        production += diff < 0 ? 0 : diff;
      }

      const feeders = feedersMap.get(day.id) || [];
      for (const f of feeders) {
        if (f.start === null || f.end === null) continue;
        exportVal += f.start - f.end;
      }

      const consumption = production - exportVal;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          days: 0,
          totalProduction: 0,
          totalExport: 0,
          totalConsumption: 0,
        });
      }

      const stats = monthMap.get(monthKey)!;
      stats.days += 1;
      stats.totalProduction += production;
      stats.totalExport += exportVal;
      stats.totalConsumption += consumption;
    }

    return Array.from(monthMap.values()).sort((a, b) =>
      b.month.localeCompare(a.month),
    );
  } catch (error) {
    await logSupabaseError("Error fetching all months", error);
    return [];
  }
}

export async function deleteDayFromSupabase(dayId: string): Promise<boolean> {
  if (!(await canStartRemoteRequest())) return false;

  try {
    const { error: feedersError } = await supabase
      .from("feeders")
      .delete()
      .eq("daily_data_id", dayId);

    if (feedersError) {
      await logSupabaseError("Error deleting feeders", feedersError);
      return false;
    }

    const { error: turbinesError } = await supabase
      .from("turbines")
      .delete()
      .eq("daily_data_id", dayId);

    if (turbinesError) {
      await logSupabaseError("Error deleting turbines", turbinesError);
      return false;
    }

    const { error: dayError } = await supabase
      .from("daily_data")
      .delete()
      .eq("id", dayId);

    if (dayError) {
      await logSupabaseError("Error deleting daily_data", dayError);
      return false;
    }

    return true;
  } catch (error) {
    await logSupabaseError("Error deleting day", error);
    return false;
  }
}

export interface CarryOverResult {
  day: DayData;
  wasUpdated: boolean;
}

export async function initializeDayCarryOver(
  userId: string,
  targetDateKey: string,
): Promise<CarryOverResult> {
  if (!(await canStartRemoteRequest())) {
    const localDay = await getDayData(targetDateKey).catch(() =>
      defaultDay(targetDateKey),
    );
    return { day: localDay, wasUpdated: false };
  }

  const prevDateKey = getPreviousDateKey(targetDateKey);

  const [targetDay, prevDay] = await Promise.all([
    fetchDayFromSupabase(userId, targetDateKey),
    prevDateKey
      ? fetchDayFromSupabase(userId, prevDateKey)
      : Promise.resolve(null),
  ]);

  let day = targetDay || defaultDay(targetDateKey);
  let wasUpdated = false;

  if (prevDay) {
    for (const f of FEEDERS) {
      const prevEnd = prevDay.feeders?.[f]?.end;
      const currentStart = day.feeders[f]?.start;

      if (
        prevEnd &&
        prevEnd.trim() !== "" &&
        (!currentStart || currentStart.trim() === "")
      ) {
        day.feeders[f] = {
          ...day.feeders[f],
          start: prevEnd,
        };
        wasUpdated = true;
      }
    }

    for (const t of TURBINES) {
      const prevPresent = prevDay.turbines?.[t]?.present;
      const currentPrevious = day.turbines[t]?.previous;

      if (
        prevPresent &&
        prevPresent.trim() !== "" &&
        (!currentPrevious || currentPrevious.trim() === "")
      ) {
        day.turbines[t] = {
          ...day.turbines[t],
          previous: prevPresent,
        };
        wasUpdated = true;
      }
    }
  }

  if (wasUpdated) {
    await Promise.all([syncDayToSupabase(userId, day), saveDayData(day)]);
  } else {
    await saveDayData(day);
  }

  return { day, wasUpdated };
}

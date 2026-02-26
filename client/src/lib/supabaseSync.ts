import { supabase } from "./supabase";
import {
  DayData,
  FeederData,
  TurbineData,
  UserSettings,
  FEEDERS,
  TURBINES,
  defaultDay,
  getPreviousDateKey,
  saveDayData,
  parseReading,
} from "./storage";

export async function syncDayToSupabase(
  userId: string,
  day: DayData
): Promise<boolean> {
  try {
    const { data: existingDay, error: fetchError } = await supabase
      .from("daily_data")
      .select("id")
      .eq("user_id", userId)
      .eq("date_key", day.dateKey)
      .single();

    let dailyDataId: string;

    if (fetchError && fetchError.code === "PGRST116") {
      const { data: newDay, error: insertError } = await supabase
        .from("daily_data")
        .insert({ user_id: userId, date_key: day.dateKey })
        .select("id")
        .single();

      if (insertError || !newDay) {
        console.error("Error creating daily_data:", insertError);
        return false;
      }
      dailyDataId = newDay.id;
    } else if (fetchError) {
      console.error("Error fetching daily_data:", fetchError);
      return false;
    } else {
      dailyDataId = existingDay.id;
    }

    for (const feederName of FEEDERS) {
      const feeder = day.feeders[feederName] || { start: "", end: "" };
      const startReading = feeder.start && feeder.start.trim() !== "" ? feeder.start : null;
      const endReading = feeder.end && feeder.end.trim() !== "" ? feeder.end : null;
      const { error } = await supabase
        .from("feeders")
        .upsert(
          {
            daily_data_id: dailyDataId,
            feeder_name: feederName,
            start_reading: startReading,
            end_reading: endReading,
          },
          { onConflict: "daily_data_id,feeder_name" }
        );

      if (error) {
        console.error(`Error upserting feeder ${feederName}:`, error);
      }
    }

    for (const turbineName of TURBINES) {
      const turbine = day.turbines[turbineName] || {
        previous: "",
        present: "",
        hours: "24",
      };
      const previousReading = turbine.previous && turbine.previous.trim() !== "" ? turbine.previous : null;
      const presentReading = turbine.present && turbine.present.trim() !== "" ? turbine.present : null;
      const { error } = await supabase
        .from("turbines")
        .upsert(
          {
            daily_data_id: dailyDataId,
            turbine_name: turbineName,
            previous_reading: previousReading,
            present_reading: presentReading,
            hours: turbine.hours,
          },
          { onConflict: "daily_data_id,turbine_name" }
        );

      if (error) {
        console.error(`Error upserting turbine ${turbineName}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error("Error syncing day to Supabase:", error);
    return false;
  }
}

export async function fetchDayFromSupabase(
  userId: string,
  dateKey: string
): Promise<DayData | null> {
  try {
    const { data: dailyData, error: dayError } = await supabase
      .from("daily_data")
      .select("id")
      .eq("user_id", userId)
      .eq("date_key", dateKey)
      .single();

    if (dayError) {
      if (dayError.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching daily_data:", dayError);
      return null;
    }

    const { data: feedersData, error: feedersError } = await supabase
      .from("feeders")
      .select("feeder_name, start_reading, end_reading")
      .eq("daily_data_id", dailyData.id);

    if (feedersError) {
      console.error("Error fetching feeders:", feedersError);
    }

    const { data: turbinesData, error: turbinesError } = await supabase
      .from("turbines")
      .select("turbine_name, previous_reading, present_reading, hours")
      .eq("daily_data_id", dailyData.id);

    if (turbinesError) {
      console.error("Error fetching turbines:", turbinesError);
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
    };
  } catch (error) {
    console.error("Error fetching day from Supabase:", error);
    return null;
  }
}

export async function fetchAllDaysFromSupabase(
  userId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("daily_data")
      .select("date_key")
      .eq("user_id", userId)
      .order("date_key", { ascending: true });

    if (error) {
      console.error("Error fetching all days:", error);
      return [];
    }

    return data.map((d) => d.date_key);
  } catch (error) {
    console.error("Error fetching all days from Supabase:", error);
    return [];
  }
}

export async function fetchUserProfile(
  userId: string
): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, decimal_precision")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return {
      displayName: data.display_name || "Engineer",
      decimalPrecision: data.decimal_precision || 2,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  settings: Partial<UserSettings>
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = {};
    if (settings.displayName !== undefined) {
      updates.display_name = settings.displayName;
    }
    if (settings.decimalPrecision !== undefined) {
      updates.decimal_precision = settings.decimalPrecision;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
}

export async function syncLocalDataToSupabase(
  userId: string,
  localDays: DayData[]
): Promise<number> {
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
  monthKey: string
): Promise<DaySummary[]> {
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
      console.error("Error fetching month days:", error);
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
    console.error("Error fetching month days:", error);
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
  limit: number = 7
): Promise<DayData[]> {
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
        .select("daily_data_id, turbine_name, previous_reading, present_reading, hours")
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
    console.error("Error fetching recent days full:", error);
    return [];
  }
}

export async function fetchRecentDaysFromSupabase(
  userId: string,
  limit: number = 7
): Promise<DayChartData[]> {
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

    const feedersMap = new Map<string, Array<{ start: number | null; end: number | null }>>();
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

    const turbinesMap = new Map<string, Array<{ prev: number | null; pres: number | null }>>();
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
    console.error("Error fetching recent days:", error);
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
  userId: string
): Promise<MonthListItem[]> {
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
    console.error("Error fetching months list:", error);
    return [];
  }
}

export async function fetchSingleMonthFromSupabase(
  userId: string,
  monthKey: string
): Promise<MonthSummary | null> {
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
    console.error("Error fetching single month:", error);
    return null;
  }
}

export async function fetchAllMonthsFromSupabase(
  userId: string
): Promise<MonthSummary[]> {
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

    const feedersMap = new Map<string, Array<{ start: number | null; end: number | null }>>();
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

    const turbinesMap = new Map<string, Array<{ prev: number | null; pres: number | null }>>();
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

    return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));
  } catch (error) {
    console.error("Error fetching all months:", error);
    return [];
  }
}

export async function deleteDayFromSupabase(dayId: string): Promise<boolean> {
  try {
    const { error: feedersError } = await supabase
      .from("feeders")
      .delete()
      .eq("daily_data_id", dayId);

    if (feedersError) {
      console.error("Error deleting feeders:", feedersError);
      return false;
    }

    const { error: turbinesError } = await supabase
      .from("turbines")
      .delete()
      .eq("daily_data_id", dayId);

    if (turbinesError) {
      console.error("Error deleting turbines:", turbinesError);
      return false;
    }

    const { error: dayError } = await supabase
      .from("daily_data")
      .delete()
      .eq("id", dayId);

    if (dayError) {
      console.error("Error deleting daily_data:", dayError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting day:", error);
    return false;
  }
}

export interface CarryOverResult {
  day: DayData;
  wasUpdated: boolean;
}

export async function initializeDayCarryOver(
  userId: string,
  targetDateKey: string
): Promise<CarryOverResult> {
  const prevDateKey = getPreviousDateKey(targetDateKey);
  
  const [targetDay, prevDay] = await Promise.all([
    fetchDayFromSupabase(userId, targetDateKey),
    prevDateKey ? fetchDayFromSupabase(userId, prevDateKey) : Promise.resolve(null),
  ]);

  let day = targetDay || defaultDay(targetDateKey);
  let wasUpdated = false;

  if (prevDay) {
    for (const f of FEEDERS) {
      const prevEnd = prevDay.feeders?.[f]?.end;
      const currentStart = day.feeders[f]?.start;
      
      if (prevEnd && prevEnd.trim() !== "" && (!currentStart || currentStart.trim() === "")) {
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
      
      if (prevPresent && prevPresent.trim() !== "" && (!currentPrevious || currentPrevious.trim() === "")) {
        day.turbines[t] = {
          ...day.turbines[t],
          previous: prevPresent,
        };
        wasUpdated = true;
      }
    }
  }

  if (wasUpdated) {
    await Promise.all([
      syncDayToSupabase(userId, day),
      saveDayData(day),
    ]);
  } else {
    await saveDayData(day);
  }

  return { day, wasUpdated };
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { NumberText } from "@/components/NumberText";
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import { useRTL } from "@/hooks/useRTL";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useTheme } from "@/hooks/useTheme";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { getAllDaysData } from "@/lib/storage";
import { getFlowLabelAndStyle } from "@/lib/flowLabel";
import { computeDayStats } from "@/shared/lib/dayCalculations";
import { fetchAllMonthsFromSupabase } from "@/lib/supabaseSync";
import { groupReadingsByMonth, type MonthGroupedReadings, type ReadingSummary } from "@/lib/reportsReadings";
import { formatEnergy } from "@/utils/units";

type Navigation = NativeStackNavigationProp<ReportsStackParamList, "MonthsScreen">;

function monthLabel(monthKey: string, isRTL: boolean): string {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(isRTL ? "ar" : "en", { month: "long" });
}

export default function MonthsScreen() {
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { unitsConfig } = useUnits();
  const { rtlRow } = useRTL();
  const layout = useResponsiveLayout();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<MonthGroupedReadings[]>([]);
  const loadMonths = useCallback(async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const remoteMonths = await fetchAllMonthsFromSupabase(user.id);
        const mapped: MonthGroupedReadings[] = remoteMonths.map((m) => {
          const [yearRaw, monthRaw] = m.month.split("-");
          return {
            key: m.month,
            year: Number(yearRaw),
            month: Number(monthRaw),
            countDays: m.days,
            totalProduction: m.totalProduction,
            totalExport: m.totalExport,
            totalConsumption: m.totalConsumption,
          };
        });
        setMonths(mapped);
        return;
      }

      const localDays = await getAllDaysData();
      const readingSummaries: ReadingSummary[] = localDays.map((day) => {
        const stats = computeDayStats(day);
        return {
          dateKey: day.dateKey,
          production: stats.production,
          exportVal: stats.exportVal,
          consumption: stats.consumption,
        };
      });
      setMonths(groupReadingsByMonth(readingSummaries));
    } catch (error) {
      console.error("Failed to load months list", error);
      setMonths([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  const contentStyle = useMemo(
    () => ({
      paddingTop: headerHeight + Spacing.lg,
      paddingBottom: tabBarHeight + Spacing.xl,
      paddingHorizontal: layout.horizontalPadding,
      maxWidth: layout.isTablet ? layout.contentMaxWidth : undefined,
      alignSelf: layout.isTablet ? ("center" as const) : undefined,
      width: layout.isTablet ? ("100%" as const) : undefined,
    }),
    [headerHeight, tabBarHeight, layout.horizontalPadding, layout.isTablet, layout.contentMaxWidth]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={months}
          keyExtractor={(item) => item.key}
          contentContainerStyle={contentStyle}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          renderItem={({ item }) => (
            (() => {
              const production = Number(item.totalProduction) || 0;
              const consumption = Number(item.totalConsumption) || 0;
              const exportWithdrawal = production - consumption;
              const flowStyle = getFlowLabelAndStyle(exportWithdrawal >= 0, t, theme);
              const productionText = formatEnergy(production, unitsConfig, { prefer: "auto" });
              const flowText = formatEnergy(Math.abs(exportWithdrawal), unitsConfig, { prefer: "auto" });
              const consumptionText = formatEnergy(consumption, unitsConfig, { prefer: "auto" });
              return (
                <Pressable
                  style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                  onPress={() => navigation.navigate("MonthDaysScreen", { monthKey: item.key })}
                >
                  <View style={[styles.rowTop, rtlRow]}>
                    <View style={[styles.rowTitle, rtlRow]}>
                      <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
                        <Feather name="calendar" size={14} color={theme.primary} />
                      </View>
                      <ThemedText semanticVariant="labelPrimary">
                        {monthLabel(item.key, isRTL)}
                      </ThemedText>
                      <NumberText size="small" style={{ color: theme.textSecondary }}>
                        {item.year}
                      </NumberText>
                    </View>
                    <View style={[styles.daysBadge, { backgroundColor: theme.backgroundSecondary }]}>
                      <View style={[styles.inlineCount, rtlRow]}>
                        <NumberText size="small" style={{ color: theme.textSecondary }}>
                          {item.countDays}
                        </NumberText>
                        <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                          {item.countDays !== 1 ? t("days_plural") : t("day_singular")}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
                    <View style={styles.statItem}>
                      <View style={[styles.statDot, { backgroundColor: theme.success }]} />
                      <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
                        {t("production")}
                      </ThemedText>
                      <ValueWithUnit
                        value={productionText.valueText}
                        unit={productionText.unitText}
                      />
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statDot, { backgroundColor: flowStyle.color }]} />
                      <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
                        {flowStyle.text}
                      </ThemedText>
                      <ValueWithUnit
                        value={flowText.valueText}
                        unit={flowText.unitText}
                        valueStyle={{ color: flowStyle.color }}
                      />
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statDot, { backgroundColor: theme.warning }]} />
                      <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
                        {t("consumption")}
                      </ThemedText>
                      <ValueWithUnit
                        value={consumptionText.valueText}
                        unit={consumptionText.unitText}
                        valueStyle={{ color: theme.warning }}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })()
          )}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                {t("no_historical_data")}
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  rowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  daysBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  inlineCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});

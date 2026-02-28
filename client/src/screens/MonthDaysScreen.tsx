import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
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
import { fetchMonthDaysFromSupabase, type DaySummary } from "@/lib/supabaseSync";
import { getReadingsForMonth, type ReadingSummary } from "@/lib/reportsReadings";
import { formatEnergy } from "@/utils/units";

type MonthDaysRoute = RouteProp<ReportsStackParamList, "MonthDaysScreen">;
type Navigation = NativeStackNavigationProp<ReportsStackParamList, "MonthDaysScreen">;

interface DayRow {
  id: string;
  dateKey: string;
  production: number;
  exportVal: number;
  consumption: number;
}

export default function MonthDaysScreen() {
  const route = useRoute<MonthDaysRoute>();
  const navigation = useNavigation<Navigation>();
  const { monthKey } = route.params;
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
  const [days, setDays] = useState<DayRow[]>([]);

  const loadDays = useCallback(async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const remoteDays: DaySummary[] = await fetchMonthDaysFromSupabase(user.id, monthKey);
        setDays(
          remoteDays.map((d) => ({
            id: d.id,
            dateKey: d.dateKey,
            production: d.production,
            exportVal: d.exportVal,
            consumption: d.consumption,
          }))
        );
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
      const filtered = getReadingsForMonth(readingSummaries, monthKey);
      setDays(
        filtered.map((d) => ({
          id: d.dateKey,
          dateKey: d.dateKey,
          production: d.production,
          exportVal: d.exportVal,
          consumption: d.consumption,
        }))
      );
    } catch (error) {
      console.error("Failed to load month days", error);
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey, user?.id]);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

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
          data={days}
          keyExtractor={(item) => item.id}
          contentContainerStyle={contentStyle}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          renderItem={({ item }) => {
            const production = Number(item.production) || 0;
            const consumption = Number(item.consumption) || 0;
            const netExport = production - consumption;
            const flowStyle = getFlowLabelAndStyle(netExport >= 0, t, theme);
            const productionText = formatEnergy(production, unitsConfig, { prefer: "fixed" });
            const flowText = formatEnergy(Math.abs(netExport), unitsConfig, { prefer: "fixed" });
            const consumptionText = formatEnergy(consumption, unitsConfig, { prefer: "fixed" });

            return (
              <Pressable
                style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                onPress={() => navigation.navigate("DayDetailsScreen", { dateKey: item.dateKey, monthKey })}
              >
                <View style={[styles.rowHeader, rtlRow]}>
                  <View style={[styles.rowTitle, rtlRow]}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
                      <Feather name="calendar" size={14} color={theme.primary} />
                    </View>
                    <NumberText size="summary" weight="semibold">
                      {item.dateKey}
                    </NumberText>
                  </View>
                  <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.textSecondary} />
                </View>
                <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: theme.success }]} />
                    <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
                      {t("production")}
                    </ThemedText>
                    <ValueWithUnit value={productionText.valueText} unit={productionText.unitText} />
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
          }}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                {t("no_data")}
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
  rowHeader: {
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

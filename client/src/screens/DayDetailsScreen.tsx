import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { NumberText } from "@/components/NumberText";
import { FeederCode } from "@/components/FeederCode";
import { ReportTable, type ReportTableColumn } from "@/components/reports/ReportTable";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import { useRTL } from "@/hooks/useRTL";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useTheme } from "@/hooks/useTheme";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { fetchDayFromSupabase } from "@/lib/supabaseSync";
import { DayData, getDayData, gasForTurbine, parseReading } from "@/lib/storage";
import { getFlowLabelAndStyle } from "@/lib/flowLabel";
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { computeDayStats } from "@/shared/lib/dayCalculations";
import { formatEnergy, formatGas, formatNumber, formatPower } from "@/utils/units";

type DayDetailsRoute = RouteProp<ReportsStackParamList, "DayDetailsScreen">;

interface FeederRowView {
  name: string;
  start: number;
  end: number;
  diff: number;
}

interface TurbineRowView {
  name: string;
  previous: number;
  present: number;
  diff: number;
  hours: number | null;
  mwPerHr: number | null;
}

export default function DayDetailsScreen() {
  const route = useRoute<DayDetailsRoute>();
  const { dateKey } = route.params;
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
  const [dayData, setDayData] = useState<DayData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = user?.id ? await fetchDayFromSupabase(user.id, dateKey) : await getDayData(dateKey);
      setDayData(loaded);
    } catch (error) {
      console.error("Failed to load day details", error);
      setDayData(null);
    } finally {
      setLoading(false);
    }
  }, [dateKey, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

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

  const shiftLabel = useMemo(() => {
    const letters = ["B", "D", "A", "C"];
    const current = new Date(dateKey);
    if (isNaN(current.getTime())) return "-";
    const epoch = new Date("2026-01-18");
    const diffDays = Math.floor((current.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
    const index = ((diffDays % 4) + 4) % 4;
    return letters[index];
  }, [dateKey]);

  const feederRows = useMemo<FeederRowView[]>(() => {
    if (!dayData?.feeders) return [];
    return Object.entries(dayData.feeders)
      .map(([name, value]) => {
        const start = parseReading(value?.start);
        const end = parseReading(value?.end);
        if (start === null || end === null) return null;
        return {
          name,
          start,
          end,
          diff: end - start,
        };
      })
      .filter((row): row is FeederRowView => row !== null);
  }, [dayData]);

  const turbineRows = useMemo<TurbineRowView[]>(() => {
    if (!dayData?.turbines) return [];
    return Object.entries(dayData.turbines)
      .map(([name, value]) => {
        const previous = parseReading(value?.previous);
        const present = parseReading(value?.present);
        if (previous === null || present === null) return null;
        const hours = parseReading(value?.hours);
        const diff = present - previous;
        const mwPerHr = hours && hours > 0 ? diff / hours : null;
        return {
          name,
          previous,
          present,
          diff,
          hours: hours ?? null,
          mwPerHr,
        };
      })
      .filter((row): row is TurbineRowView => row !== null);
  }, [dayData]);

  const hasMeaningfulFeeders = useMemo(
    () => feederRows.some((row) => row.start !== 0 || row.end !== 0 || row.diff !== 0),
    [feederRows]
  );
  const hasMeaningfulTurbines = useMemo(
    () =>
      turbineRows.some(
        (row) =>
          row.previous !== 0 ||
          row.present !== 0 ||
          row.diff !== 0 ||
          (row.hours !== null && row.hours !== 0) ||
          (row.mwPerHr !== null && row.mwPerHr !== 0)
      ),
    [turbineRows]
  );

  const totals = useMemo(() => {
    if (!dayData) return null;
    const stats = computeDayStats(dayData);
    const gasM3 = turbineRows.reduce((acc, row) => {
      if (!row.hours || row.hours <= 0) return acc;
      const safeDiff = Math.max(row.diff, 0);
      const mw = safeDiff / row.hours;
      return acc + gasForTurbine(safeDiff, mw);
    }, 0);
    return {
      production: stats.production,
      exportVal: stats.exportVal,
      consumption: stats.consumption,
      gasM3,
    };
  }, [dayData, turbineRows]);

  const flowStats = useMemo(() => {
    if (!totals) return null;
    const production = Number(totals.production) || 0;
    const consumption = Number(totals.consumption) || 0;
    const exportWithdrawal = production - consumption;
    return {
      value: exportWithdrawal,
      style: getFlowLabelAndStyle(exportWithdrawal >= 0, t, theme),
    };
  }, [t, theme, totals]);

  const statusText = hasMeaningfulFeeders && hasMeaningfulTurbines ? "Complete" : "Partial";
  const statusColor = hasMeaningfulFeeders && hasMeaningfulTurbines ? theme.success : theme.warning;

  const formatValue = (value: number): string => formatNumber(value, unitsConfig);
  const formatInt = (value: number): string => formatNumber(value, { ...unitsConfig, decimals: 0 });
  const sectionTitleAlignStyle = isRTL ? styles.sectionTitleRTL : styles.sectionTitleLTR;

  const FEEDER_COLS = useMemo<ReportTableColumn<FeederRowView>[]>(
    () => [
      {
        key: "name",
        title: t("feeder"),
        flex: 1.0,
        align: "center",
        renderCell: (value) => <FeederCode code={String(value)} style={styles.feederCodeCellText} />,
      },
      {
        key: "start",
        title: t("start"),
        flex: 1.2,
        align: "center",
        isNumeric: true,
        formatValue: (value) => formatValue(Number(value)),
      },
      {
        key: "end",
        title: t("end"),
        flex: 1.2,
        align: "center",
        isNumeric: true,
        formatValue: (value) => formatValue(Number(value)),
      },
      {
        key: "diff",
        title: t("diff"),
        flex: 0.8,
        align: "center",
        isNumeric: true,
        formatValue: (value) => formatValue(Number(value)),
      },
    ],
    [t]
  );

  const TURBINE_COLS = useMemo<ReportTableColumn<TurbineRowView>[]>(
    () => [
      {
        key: "name",
        title: t("turbine"),
        flex: 0.8,
        align: "center",
        renderCell: (value) => <FeederCode code={String(value)} style={styles.turbineCodeCellText} />,
      },
      {
        key: "previous",
        title: t("previous"),
        flex: 1.2,
        align: "center",
        isNumeric: true,
        formatValue: (value) => formatValue(Number(value)),
      },
      {
        key: "present",
        title: t("present"),
        flex: 1.2,
        align: "center",
        isNumeric: true,
        formatValue: (value) => formatValue(Number(value)),
      },
      {
        key: "diff",
        title: t("diff"),
        flex: 0.8,
        align: "center",
        isNumeric: true,
        formatValue: (value) => formatValue(Number(value)),
      },
      {
        key: "hours",
        title: t("hours"),
        flex: 0.8,
        align: "center",
        isNumeric: true,
        formatValue: (value) => (value !== null ? formatInt(Number(value)) : "-"),
      },
      {
        key: "mwPerHr",
        title: `${unitsConfig.powerUnit}/h`,
        flex: 0.8,
        align: "center",
        isNumeric: true,
        formatValue: (value) => (value !== null ? formatPower(Number(value), unitsConfig).valueText : "-"),
      },
    ],
    [t, unitsConfig]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={contentStyle}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.headerRow, rtlRow, { justifyContent: "space-between" }]}>
            <View style={[styles.headerMeta, rtlRow]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="calendar" size={16} color={theme.primary} />
              </View>
              <View>
                <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                  {isRTL ? "التاريخ" : "Date"}
                </ThemedText>
                <NumberText size="summary" weight="semibold">
                  {dateKey}
                </NumberText>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
              <ThemedText semanticVariant="helper" style={{ color: statusColor }}>
                {statusText}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.shiftRow, rtlRow]}>
            <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
              {isRTL ? t("meal_prefix") : t("shift_prefix")}
            </ThemedText>
            <NumberText size="small" style={{ color: theme.text }}>
              {shiftLabel}
            </NumberText>
          </View>
        </View>

        {loading ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          </View>
        ) : (
          <>
            {hasMeaningfulFeeders ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText semanticVariant="labelPrimary" style={sectionTitleAlignStyle}>
                  {t("feeders_title")}
                </ThemedText>
                <ReportTable
                  columns={FEEDER_COLS}
                  rows={feederRows}
                  isRTL={isRTL}
                  borderColor={theme.border}
                  headerTextColor={theme.textSecondary}
                  rowKey={(row) => row.name}
                />
              </View>
            ) : null}

            {hasMeaningfulTurbines ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText semanticVariant="labelPrimary" style={sectionTitleAlignStyle}>
                  {t("turbines_title")}
                </ThemedText>
                <ReportTable
                  columns={TURBINE_COLS}
                  rows={turbineRows}
                  isRTL={isRTL}
                  borderColor={theme.border}
                  headerTextColor={theme.textSecondary}
                  rowKey={(row) => row.name}
                  numericFontSize={12}
                />
              </View>
            ) : null}

            {totals ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText semanticVariant="labelPrimary">{t("daily_summary")}</ThemedText>
                <View style={styles.energyStatsRow}>
                  {(() => {
                    const productionText = formatEnergy(totals.production, unitsConfig, { prefer: "fixed" });
                    const consumptionText = formatEnergy(totals.consumption, unitsConfig, { prefer: "fixed" });
                    const flowValueText = flowStats
                      ? formatEnergy(Math.abs(flowStats.value), unitsConfig, { prefer: "fixed" })
                      : null;
                    return (
                      <>
                  <View style={styles.energyStatItem}>
                    <View style={[styles.statDot, { backgroundColor: theme.success }]} />
                    <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
                      {t("production")}
                    </ThemedText>
                    <ValueWithUnit value={productionText.valueText} unit={productionText.unitText} />
                  </View>

                  {flowStats ? (
                    <View style={styles.energyStatItem}>
                      <View style={[styles.statDot, { backgroundColor: flowStats.style.color }]} />
                      <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
                        {flowStats.style.text}
                      </ThemedText>
                      <ValueWithUnit
                        value={flowValueText?.valueText ?? "0"}
                        unit={flowValueText?.unitText ?? unitsConfig.energyUnit}
                        valueStyle={{ color: flowStats.style.color }}
                      />
                    </View>
                  ) : null}

                  <View style={styles.energyStatItem}>
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
                      </>
                    );
                  })()}
                </View>

                {totals.gasM3 !== 0 ? (
                  <View style={styles.totalsWrap}>
                    <View style={[styles.totalItem, { backgroundColor: theme.backgroundSecondary }]}>
                      <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                        {t("total_gas")}
                      </ThemedText>
                      <NumberText size="summary" weight="semibold">
                        {formatGas(totals.gasM3, unitsConfig).valueText}
                      </NumberText>
                      <ThemedText semanticVariant="unit" style={{ color: theme.textSecondary }}>
                        {formatGas(totals.gasM3, unitsConfig).unitText}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  headerCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shiftRow: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  loaderWrap: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitleLTR: {
    textAlign: "left",
  },
  sectionTitleRTL: {
    textAlign: "right",
  },
  energyStatsRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  energyStatItem: {
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
  totalsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  totalItem: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    gap: 2,
  },
  feederCodeCellText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  turbineCodeCellText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});

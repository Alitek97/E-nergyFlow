import React, { memo, useMemo, useRef } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import Svg, { Line, Rect, Circle, Text as SvgText, G } from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import {
  DayData,
} from "@/lib/storage";
import { computeDayStats as getDayStats } from "@/shared/lib/dayCalculations";

interface ChartDataPoint {
  dateKey: string;
  label: string;
  production: number;
  consumption: number;
  exportVal: number;
  isExport: boolean;
  gasConsumed: number;
}

interface SevenDayChartProps {
  days: DayData[];
}

const GRID_RATIOS = [0, 0.25, 0.5, 0.75, 1] as const;
const Y_AXIS_RATIOS = [0, 0.5, 1] as const;
function computeChartDayStats(day: DayData): Omit<ChartDataPoint, "label"> {
  const stats = getDayStats(day);

  return {
    dateKey: day.dateKey,
    production: stats.production,
    consumption: stats.consumption,
    exportVal: stats.exportVal,
    isExport: stats.isExport,
    gasConsumed: stats.gasConsumed,
  };
}

function formatDateLabel(dateKey: string, language: string): string {
  const date = new Date(dateKey);
  if (isNaN(date.getTime())) return dateKey;

  const day = date.getDate();
  const month = date.getMonth() + 1;

  if (language === "ar") {
    return `${day}/${month}`;
  }
  return `${month}/${day}`;
}

export const SevenDayChart = memo(function SevenDayChart({ days }: SevenDayChartProps) {
  const renderCountRef = useRef(0);
  if (__DEV__) {
    renderCountRef.current += 1;
    console.log(`[render] SevenDayChart #${renderCountRef.current}`);
  }

  const { theme, typography } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { rtlRow } = useRTL();

  const chartData = useMemo(() => {
    const sorted = [...days]
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
      .slice(0, 7)
      .reverse();

    return sorted.map((day) => ({
      ...computeChartDayStats(day),
      label: formatDateLabel(day.dateKey, language),
    }));
  }, [days, language]);

  const hasWithdrawal = useMemo(() => {
    return chartData.some((d) => !d.isExport);
  }, [chartData]);

  const flowLabel = useMemo(
    () => (hasWithdrawal ? t("export") + "/" + t("withdrawal") : t("export")),
    [hasWithdrawal, t]
  );

  const chartMetrics = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = Math.min(screenWidth - Spacing.lg * 4, 500);
    const chartHeight = 200;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 40;
    const plotWidth = chartWidth - paddingLeft - paddingRight;
    const plotHeight = chartHeight - paddingTop - paddingBottom;
    const maxProduction = Math.max(...chartData.map((d) => d.production), 1);
    const maxConsumption = Math.max(...chartData.map((d) => d.consumption), 1);
    const maxExport = Math.max(...chartData.map((d) => Math.abs(d.exportVal)), 1);
    const maxEnergy = Math.max(maxProduction, maxConsumption, maxExport) * 1.1;
    const maxGas = Math.max(...chartData.map((d) => d.gasConsumed), 1) * 1.1;
    const barWidth = plotWidth / chartData.length / 3;
    const barGap = barWidth * 0.3;

    return {
      chartWidth,
      chartHeight,
      paddingLeft,
      paddingRight,
      paddingTop,
      plotWidth,
      plotHeight,
      maxEnergy,
      maxGas,
      barWidth,
      barGap,
    };
  }, [chartData]);

  const colors = useMemo(
    () => ({
      production: theme.success,
      consumption: theme.warning,
      export: "#12b76a",
      withdrawal: "#f04438",
      gas: "#6366f1",
    }),
    [theme.success, theme.warning]
  );

  if (chartData.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: theme.primary + "15" }]}>
          <Feather name="bar-chart-2" size={32} color={theme.primary} />
        </View>
        <ThemedText type="body" style={{ color: theme.text, marginTop: Spacing.lg, fontWeight: "600" }}>
          {t("no_chart_data")}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
          {t("save_data_for_chart")}
        </ThemedText>
      </View>
    );
  }

  const getX = (index: number) => {
    const step = chartMetrics.plotWidth / chartData.length;
    return chartMetrics.paddingLeft + step * index + step / 2;
  };

  const getY = (value: number, max: number) => {
    return chartMetrics.paddingTop + chartMetrics.plotHeight - (value / max) * chartMetrics.plotHeight;
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="trending-up" size={18} color={theme.primary} />
        </View>
        <ThemedText type="h4">
          {t("last_7_days")}
        </ThemedText>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={chartMetrics.chartWidth} height={chartMetrics.chartHeight}>
          {GRID_RATIOS.map((ratio) => (
            <Line
              key={ratio}
              x1={chartMetrics.paddingLeft}
              y1={chartMetrics.paddingTop + chartMetrics.plotHeight * (1 - ratio)}
              x2={chartMetrics.chartWidth - chartMetrics.paddingRight}
              y2={chartMetrics.paddingTop + chartMetrics.plotHeight * (1 - ratio)}
              stroke={theme.border}
              strokeWidth={1}
              strokeDasharray={ratio === 0 ? "0" : "4,4"}
            />
          ))}

          {chartData.map((d, i) => {
            const x = getX(i);
            const exportColor = d.isExport ? colors.export : colors.withdrawal;
            const exportBarHeight = (Math.abs(d.exportVal) / chartMetrics.maxEnergy) * chartMetrics.plotHeight;
            const gasBarHeight = (d.gasConsumed / chartMetrics.maxGas) * chartMetrics.plotHeight;

            return (
              <G key={d.dateKey}>
                <Rect
                  x={x - chartMetrics.barWidth - chartMetrics.barGap / 2}
                  y={getY(Math.abs(d.exportVal), chartMetrics.maxEnergy)}
                  width={chartMetrics.barWidth}
                  height={exportBarHeight}
                  fill={exportColor}
                  rx={2}
                />
                <Rect
                  x={x + chartMetrics.barGap / 2}
                  y={getY(d.gasConsumed, chartMetrics.maxGas)}
                  width={chartMetrics.barWidth}
                  height={gasBarHeight}
                  fill={colors.gas}
                  rx={2}
                  opacity={0.7}
                />
              </G>
            );
          })}

          {chartData.length > 1 ? (
            <>
              {chartData.map((d, i) => {
                if (i === 0) return null;
                const prev = chartData[i - 1];
                return (
                  <Line
                    key={`prod-line-${i}`}
                    x1={getX(i - 1)}
                    y1={getY(prev.production, chartMetrics.maxEnergy)}
                    x2={getX(i)}
                    y2={getY(d.production, chartMetrics.maxEnergy)}
                    stroke={colors.production}
                    strokeWidth={2}
                  />
                );
              })}
              {chartData.map((d, i) => {
                if (i === 0) return null;
                const prev = chartData[i - 1];
                return (
                  <Line
                    key={`cons-line-${i}`}
                    x1={getX(i - 1)}
                    y1={getY(prev.consumption, chartMetrics.maxEnergy)}
                    x2={getX(i)}
                    y2={getY(d.consumption, chartMetrics.maxEnergy)}
                    stroke={colors.consumption}
                    strokeWidth={2}
                  />
                );
              })}
            </>
          ) : null}

          {chartData.map((d, i) => (
            <G key={`dots-${d.dateKey}`}>
              <Circle cx={getX(i)} cy={getY(d.production, chartMetrics.maxEnergy)} r={4} fill={colors.production} />
              <Circle cx={getX(i)} cy={getY(d.consumption, chartMetrics.maxEnergy)} r={4} fill={colors.consumption} />
            </G>
          ))}

          {chartData.map((d, i) => (
            <SvgText
              key={`label-${d.dateKey}`}
              x={getX(i)}
              y={chartMetrics.chartHeight - 8}
              fontSize={10}
              fontFamily={typography.getNumberFamily("regular")}
              fill={theme.textSecondary}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          ))}

          {Y_AXIS_RATIOS.map((ratio) => (
            <SvgText
              key={`y-${ratio}`}
              x={chartMetrics.paddingLeft - 5}
              y={chartMetrics.paddingTop + chartMetrics.plotHeight * (1 - ratio) + 4}
              fontSize={9}
              fontFamily={typography.getNumberFamily("regular")}
              fill={theme.textSecondary}
              textAnchor="end"
            >
              {Math.round(chartMetrics.maxEnergy * ratio)}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={[styles.legendContainer, rtlRow]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.production }]} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {t("production")}
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.consumption }]} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {t("consumption")}
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendRect, { backgroundColor: colors.export }]} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {flowLabel}
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendRect, { backgroundColor: colors.gas }]} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {t("gas_consumed")}
          </ThemedText>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chartContainer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  legendContainerRTL: {
    flexDirection: "row-reverse",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendRect: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  emptyState: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});

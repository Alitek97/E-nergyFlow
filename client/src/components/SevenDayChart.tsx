import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Line, Rect, Circle, Text as SvgText, G } from "react-native-svg";
import { ChartEmptyState } from "@/components/ChartEmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DayData } from "@/lib/storage";
import { computeDayStats as getDayStats } from "@/shared/lib/dayCalculations";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

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
  availableWidth?: number;
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

export const SevenDayChart = memo(function SevenDayChart({
  days,
  availableWidth,
}: SevenDayChartProps) {
  const { theme, typography } = useTheme();
  const { t, language } = useLanguage();
  const layout = useResponsiveLayout();
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

  const hasChartData = chartData.length > 0;

  const hasWithdrawal = useMemo(() => {
    return chartData.some((d) => !d.isExport);
  }, [chartData]);

  const flowLabel = useMemo(
    () => (hasWithdrawal ? t("export") + "/" + t("withdrawal") : t("export")),
    [hasWithdrawal, t],
  );

  const chartMetrics = useMemo(() => {
    const maxChartWidth = layout.isLargeTablet
      ? 820
      : layout.isTablet
        ? 700
        : 500;
    const usableWidth = Math.max(availableWidth ?? layout.contentMaxWidth, 280);
    const chartWidth = Math.max(
      280,
      Math.min(usableWidth - Spacing.lg * 2, maxChartWidth),
    );
    const chartHeight =
      layout.isLandscape && layout.isTablet ? 260 : layout.isTablet ? 244 : 226;
    const paddingLeft = 48;
    const paddingRight = 18;
    const paddingTop = 16;
    const paddingBottom = 44;
    const plotWidth = chartWidth - paddingLeft - paddingRight;
    const plotHeight = chartHeight - paddingTop - paddingBottom;
    const maxProduction = Math.max(...chartData.map((d) => d.production), 1);
    const maxConsumption = Math.max(...chartData.map((d) => d.consumption), 1);
    const maxExport = Math.max(
      ...chartData.map((d) => Math.abs(d.exportVal)),
      1,
    );
    const maxEnergy = Math.max(maxProduction, maxConsumption, maxExport) * 1.1;
    const maxGas = Math.max(...chartData.map((d) => d.gasConsumed), 1) * 1.1;
    const barWidth = Math.max(
      10,
      Math.min(22, plotWidth / Math.max(chartData.length, 1) / 3),
    );
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
  }, [
    availableWidth,
    chartData,
    layout.contentMaxWidth,
    layout.isLargeTablet,
    layout.isLandscape,
    layout.isTablet,
  ]);

  const colors = useMemo(
    () => ({
      production: theme.success,
      consumption: theme.warning,
      export: theme.success,
      withdrawal: theme.error,
      gas: theme.accent2,
    }),
    [theme.accent2, theme.error, theme.success, theme.warning],
  );

  const getX = (index: number) => {
    const step = chartMetrics.plotWidth / chartData.length;
    return chartMetrics.paddingLeft + step * index + step / 2;
  };

  const getY = (value: number, max: number) => {
    return (
      chartMetrics.paddingTop +
      chartMetrics.plotHeight -
      (value / max) * chartMetrics.plotHeight
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          shadowColor: theme.cardShadow,
        },
      ]}
    >
      {hasChartData ? (
        <>
          <View style={styles.chartContainer}>
            <Svg
              width={chartMetrics.chartWidth}
              height={chartMetrics.chartHeight}
            >
              {GRID_RATIOS.map((ratio) => (
                <Line
                  key={ratio}
                  x1={chartMetrics.paddingLeft}
                  y1={
                    chartMetrics.paddingTop +
                    chartMetrics.plotHeight * (1 - ratio)
                  }
                  x2={chartMetrics.chartWidth - chartMetrics.paddingRight}
                  y2={
                    chartMetrics.paddingTop +
                    chartMetrics.plotHeight * (1 - ratio)
                  }
                  stroke={theme.borderStrong}
                  strokeWidth={1}
                  strokeDasharray={ratio === 0 ? "0" : "4,4"}
                />
              ))}

              {chartData.map((d, i) => {
                const x = getX(i);
                const barSlots = [
                  {
                    key: "export",
                    value: Math.abs(d.exportVal),
                    max: chartMetrics.maxEnergy,
                    fill: d.isExport ? colors.export : colors.withdrawal,
                    opacity: 1,
                  },
                  {
                    key: "gas",
                    value: d.gasConsumed,
                    max: chartMetrics.maxGas,
                    fill: colors.gas,
                    opacity: 0.7,
                  },
                ] as const;
                const slotCount = barSlots.length;
                const totalBarsWidth =
                  slotCount * chartMetrics.barWidth +
                  (slotCount - 1) * chartMetrics.barGap;

                return (
                  <G key={d.dateKey}>
                    {barSlots.map((slot, slotIndex) => {
                      const barHeight =
                        (slot.value / slot.max) * chartMetrics.plotHeight;
                      const barY = getY(slot.value, slot.max);
                      const barX =
                        x -
                        totalBarsWidth / 2 +
                        slotIndex *
                          (chartMetrics.barWidth + chartMetrics.barGap);
                      const topRadius = Math.min(
                        10,
                        chartMetrics.barWidth / 2,
                        barHeight,
                      );

                      return (
                        <G key={`${d.dateKey}-${slot.key}`}>
                          <Rect
                            x={barX}
                            y={barY}
                            width={chartMetrics.barWidth}
                            height={barHeight}
                            fill={slot.fill}
                            rx={topRadius}
                            ry={topRadius}
                            opacity={slot.opacity}
                          />
                          {barHeight > topRadius ? (
                            <Rect
                              x={barX}
                              y={barY + barHeight - topRadius}
                              width={chartMetrics.barWidth}
                              height={topRadius}
                              fill={slot.fill}
                              opacity={slot.opacity}
                            />
                          ) : null}
                        </G>
                      );
                    })}
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
                  <Circle
                    cx={getX(i)}
                    cy={getY(d.production, chartMetrics.maxEnergy)}
                    r={4}
                    fill={colors.production}
                  />
                  <Circle
                    cx={getX(i)}
                    cy={getY(d.consumption, chartMetrics.maxEnergy)}
                    r={4}
                    fill={colors.consumption}
                  />
                </G>
              ))}

              {chartData.map((d, i) => (
                <SvgText
                  key={`label-${d.dateKey}`}
                  x={getX(i)}
                  y={chartMetrics.chartHeight - 8}
                  fontSize={10}
                  fontFamily={typography.getNumberFamily("regular")}
                  fill={theme.textTertiary}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              ))}

              {Y_AXIS_RATIOS.map((ratio) => (
                <SvgText
                  key={`y-${ratio}`}
                  x={chartMetrics.paddingLeft - 5}
                  y={
                    chartMetrics.paddingTop +
                    chartMetrics.plotHeight * (1 - ratio) +
                    4
                  }
                  fontSize={9}
                  fontFamily={typography.getNumberFamily("regular")}
                  fill={theme.textTertiary}
                  textAnchor="end"
                >
                  {Math.round(chartMetrics.maxEnergy * ratio)}
                </SvgText>
              ))}
            </Svg>
          </View>

          <View style={[styles.legendContainer, rtlRow]}>
            <View
              style={[
                styles.legendItem,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderStrong,
                },
              ]}
            >
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.production },
                ]}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {t("production")}
              </ThemedText>
            </View>
            <View
              style={[
                styles.legendItem,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderStrong,
                },
              ]}
            >
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.consumption },
                ]}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {t("consumption")}
              </ThemedText>
            </View>
            <View
              style={[
                styles.legendItem,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderStrong,
                },
              ]}
            >
              <View
                style={[styles.legendRect, { backgroundColor: colors.export }]}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {flowLabel}
              </ThemedText>
            </View>
            <View
              style={[
                styles.legendItem,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderStrong,
                },
              ]}
            >
              <View
                style={[styles.legendRect, { backgroundColor: colors.gas }]}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {t("gas_consumed")}
              </ThemedText>
            </View>
          </View>
        </>
      ) : (
        <ChartEmptyState />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  chartContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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
});

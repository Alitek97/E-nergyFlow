import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { ChartEmptyState } from "@/components/ChartEmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  DayData,
  addDays,
  defaultDay,
  formatNumber,
  todayKey,
} from "@/lib/storage";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

interface SeriesDefinition {
  key: string;
  label: string;
  color: string;
  getValue: (day: DayData) => number | null;
}

interface SeriesComparisonChartProps {
  days: DayData[];
  title: string;
  series: readonly SeriesDefinition[];
  domainMode?: "auto" | "positive" | "symmetric";
  availableWidth?: number;
}

interface ComparisonPoint {
  dateKey: string;
  label: string;
  values: Record<string, number | null>;
}

const GRID_RATIOS = [0, 0.25, 0.5, 0.75, 1] as const;
const Y_AXIS_RATIOS = [0, 0.5, 1] as const;

function formatDateLabel(dateKey: string, language: string): string {
  const date = new Date(dateKey);
  if (isNaN(date.getTime())) return dateKey;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return language === "ar" ? `${day}/${month}` : `${month}/${day}`;
}

function safeNumberOrNull(value: number | null): number | null {
  if (value === null) return null;
  return Number.isFinite(value) ? value : null;
}

export const SeriesComparisonChart = memo(function SeriesComparisonChart({
  days,
  title,
  series,
  domainMode = "auto",
  availableWidth,
}: SeriesComparisonChartProps) {
  const { theme, typography } = useTheme();
  const { language } = useLanguage();
  const layout = useResponsiveLayout();
  const { rtlRow } = useRTL();

  const chartData = useMemo<ComparisonPoint[]>(() => {
    const byDate = new Map<string, DayData>(
      days.map((day) => [day.dateKey, day]),
    );
    const latestDateKey = days.length
      ? days.reduce(
          (max, day) => (day.dateKey > max ? day.dateKey : max),
          days[0].dateKey,
        )
      : todayKey();
    const dateKeys = Array.from({ length: 7 }, (_, index) =>
      addDays(latestDateKey, index - 6),
    );

    return dateKeys.map((dateKey) => {
      const day = byDate.get(dateKey) ?? defaultDay(dateKey);
      const values: Record<string, number | null> = {};
      for (const s of series) {
        values[s.key] = safeNumberOrNull(s.getValue(day));
      }
      return {
        dateKey: dateKey,
        label: formatDateLabel(dateKey, language),
        values,
      };
    });
  }, [days, language, series]);

  const metrics = useMemo(() => {
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
    const paddingLeft = 50;
    const paddingRight = 18;
    const paddingTop = 16;
    const paddingBottom = 44;
    const plotWidth = chartWidth - paddingLeft - paddingRight;
    const plotHeight = chartHeight - paddingTop - paddingBottom;
    const allValues = chartData
      .flatMap((point) => series.map((s) => point.values[s.key]))
      .filter((value): value is number => value !== null);
    const rawMin = allValues.length ? Math.min(...allValues) : 0;
    const rawMax = allValues.length ? Math.max(...allValues) : 0;

    let minValue = 0;
    let maxValue = 1;

    if (domainMode === "positive") {
      minValue = 0;
      maxValue = Math.max(1, rawMax) * 1.1;
    } else if (domainMode === "symmetric") {
      const maxAbs = Math.max(1, Math.abs(rawMin), Math.abs(rawMax)) * 1.1;
      minValue = -maxAbs;
      maxValue = maxAbs;
    } else if (rawMin < 0 && rawMax > 0) {
      const range = Math.max(1, rawMax - rawMin);
      const pad = range * 0.1;
      minValue = rawMin - pad;
      maxValue = rawMax + pad;
    } else if (rawMax <= 0) {
      minValue = Math.min(-1, rawMin * 1.1);
      maxValue = 0;
    } else {
      minValue = 0;
      maxValue = Math.max(1, rawMax) * 1.1;
    }
    // Domain behavior was verified with a temporary debug print of { rawMin, rawMax, minValue, maxValue }.

    const valueRange = Math.max(1, maxValue - minValue);
    const groupStep = plotWidth / Math.max(chartData.length, 1);
    const groupWidth = groupStep * 0.72;
    const barGap = 4;
    const barWidth = Math.max(
      4,
      Math.min(
        22,
        (groupWidth - barGap * (series.length - 1)) /
          Math.max(series.length, 1),
      ),
    );

    return {
      chartWidth,
      chartHeight,
      paddingLeft,
      paddingRight,
      paddingTop,
      plotWidth,
      plotHeight,
      minValue,
      maxValue,
      valueRange,
      groupStep,
      groupWidth,
      barGap,
      barWidth,
    };
  }, [
    chartData,
    domainMode,
    series,
    layout.contentMaxWidth,
    layout.isLargeTablet,
    layout.isLandscape,
    layout.isTablet,
    availableWidth,
  ]);

  const hasChartData = useMemo(
    () =>
      chartData.some((point) =>
        series.some((s) => point.values[s.key] !== null),
      ),
    [chartData, series],
  );

  const getGroupCenterX = (index: number) => {
    return (
      metrics.paddingLeft + metrics.groupStep * index + metrics.groupStep / 2
    );
  };

  const getY = (value: number) => {
    return (
      metrics.paddingTop +
      metrics.plotHeight -
      ((value - metrics.minValue) / metrics.valueRange) * metrics.plotHeight
    );
  };

  const hasZeroInside = metrics.minValue <= 0 && metrics.maxValue >= 0;
  const zeroY = hasZeroInside ? getY(0) : null;

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
            <Svg width={metrics.chartWidth} height={metrics.chartHeight}>
              {GRID_RATIOS.map((ratio) => (
                <Line
                  key={ratio}
                  x1={metrics.paddingLeft}
                  y1={metrics.paddingTop + metrics.plotHeight * (1 - ratio)}
                  x2={metrics.chartWidth - metrics.paddingRight}
                  y2={metrics.paddingTop + metrics.plotHeight * (1 - ratio)}
                  stroke={theme.borderStrong}
                  strokeWidth={1}
                  strokeDasharray={ratio === 0 ? "0" : "4,4"}
                />
              ))}

              {zeroY !== null ? (
                <Line
                  x1={metrics.paddingLeft}
                  y1={zeroY}
                  x2={metrics.chartWidth - metrics.paddingRight}
                  y2={zeroY}
                  stroke={theme.textTertiary}
                  strokeWidth={1}
                />
              ) : null}

              {series.map((s, seriesIndex) => (
                <G key={s.key}>
                  {chartData.map((point, i) => {
                    const value = point.values[s.key];
                    if (value === null) return null;
                    const groupCenter = getGroupCenterX(i);
                    const totalBarsWidth =
                      series.length * metrics.barWidth +
                      (series.length - 1) * metrics.barGap;
                    const barX =
                      groupCenter -
                      totalBarsWidth / 2 +
                      seriesIndex * (metrics.barWidth + metrics.barGap);
                    const valueY = getY(value);
                    const baselineY = zeroY ?? getY(0);
                    const height = Math.max(1, Math.abs(baselineY - valueY));
                    const barY = value >= 0 ? valueY : baselineY;
                    return (
                      <Rect
                        key={`${s.key}-bar-${point.dateKey}`}
                        x={barX}
                        y={barY}
                        width={metrics.barWidth}
                        height={height}
                        fill={s.color}
                        rx={2}
                      />
                    );
                  })}
                </G>
              ))}

              {chartData.map((point, i) => (
                <SvgText
                  key={`label-${point.dateKey}`}
                  x={getGroupCenterX(i)}
                  y={metrics.chartHeight - 8}
                  fontSize={10}
                  fontFamily={typography.getNumberFamily("regular")}
                  fill={theme.textTertiary}
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              ))}

              {Y_AXIS_RATIOS.map((ratio) => {
                const rawValue = metrics.minValue + metrics.valueRange * ratio;
                const formatted = formatNumber(rawValue, {
                  decimals: 0,
                  thousandsSeparator: true,
                });
                return (
                  <SvgText
                    key={`y-${ratio}`}
                    x={metrics.paddingLeft - 6}
                    y={
                      metrics.paddingTop + metrics.plotHeight * (1 - ratio) + 4
                    }
                    fontSize={9}
                    fontFamily={typography.getNumberFamily("regular")}
                    fill={theme.textTertiary}
                    textAnchor="end"
                  >
                    {formatted}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          <View style={[styles.legendContainer, rtlRow]}>
            {series.map((s) => (
              <View
                key={s.key}
                style={[
                  styles.legendItem,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.borderStrong,
                  },
                ]}
              >
                <View
                  style={[styles.legendRect, { backgroundColor: s.color }]}
                />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {s.label}
                </ThemedText>
              </View>
            ))}
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  legendRect: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

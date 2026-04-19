import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { SevenDayChart } from "@/components/SevenDayChart";
import { SeriesComparisonChart } from "@/components/SeriesComparisonChart";
import { ThemedText } from "@/components/ThemedText";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { DayData, feederRowComputed, turbineRowComputed } from "@/lib/storage";

interface ReportsChartsCarouselProps {
  days: DayData[];
}

type ChartPageId = "overview" | "feeders" | "turbines";

interface ChartPage {
  key: ChartPageId;
}

interface LogicalTab {
  key: ChartPageId;
  label: string;
  logical: number;
}

const LOGICAL_PAGE_KEYS: ChartPageId[] = ["overview", "feeders", "turbines"];

export function ReportsChartsCarousel({ days }: ReportsChartsCarouselProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const flatListRef = useRef<FlatList<ChartPage>>(null);
  const ignoreNextMomentumRef = useRef(false);
  const hasInitialScrollSyncedRef = useRef(false);
  const logicalIndexRef = useRef(0);
  const widthRef = useRef(0);
  const [logicalIndex, setLogicalIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  logicalIndexRef.current = logicalIndex;
  widthRef.current = containerWidth;

  const logicalPages = useMemo<ChartPage[]>(
    () => LOGICAL_PAGE_KEYS.map((key) => ({ key })),
    [],
  );
  const pageCount = logicalPages.length;

  const toPhysicalIndex = useCallback(
    (logicalIndex: number) =>
      isRTL ? pageCount - 1 - logicalIndex : logicalIndex,
    [isRTL, pageCount],
  );

  const toLogicalIndex = useCallback(
    (physicalIndex: number) =>
      isRTL ? pageCount - 1 - physicalIndex : physicalIndex,
    [isRTL, pageCount],
  );

  const physicalPages = useMemo(
    () => (isRTL ? [...logicalPages].reverse() : logicalPages),
    [isRTL, logicalPages],
  );

  const logicalTabs = useMemo<LogicalTab[]>(
    () =>
      LOGICAL_PAGE_KEYS.map((key, index) => ({
        key,
        label:
          key === "overview"
            ? t("chart_overview")
            : key === "feeders"
              ? t("tab_feeders")
              : t("tab_turbines"),
        logical: index,
      })),
    [t],
  );

  const feederSeries = useMemo(
    () => [
      {
        key: "F2",
        label: "F2",
        color: theme.success,
        getValue: (day: DayData) => feederRowComputed(day, "F2").diff,
      },
      {
        key: "F3",
        label: "F3",
        color: theme.warning,
        getValue: (day: DayData) => feederRowComputed(day, "F3").diff,
      },
      {
        key: "F4",
        label: "F4",
        color: theme.primary,
        getValue: (day: DayData) => feederRowComputed(day, "F4").diff,
      },
      {
        key: "F5",
        label: "F5",
        color: theme.error,
        getValue: (day: DayData) => feederRowComputed(day, "F5").diff,
      },
    ],
    [theme.error, theme.primary, theme.success, theme.warning],
  );

  const turbineSeries = useMemo(
    () => [
      {
        key: "A",
        label: "A",
        color: theme.success,
        getValue: (day: DayData) => turbineRowComputed(day, "A").diff,
      },
      {
        key: "B",
        label: "B",
        color: theme.warning,
        getValue: (day: DayData) => turbineRowComputed(day, "B").diff,
      },
      {
        key: "C",
        label: "C",
        color: theme.primary,
        getValue: (day: DayData) => turbineRowComputed(day, "C").diff,
      },
      {
        key: "S",
        label: "S",
        color: theme.error,
        getValue: (day: DayData) => turbineRowComputed(day, "S").diff,
      },
    ],
    [theme.error, theme.primary, theme.success, theme.warning],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!containerWidth) return;
      const rawPhysicalIndex = Math.round(
        event.nativeEvent.contentOffset.x / containerWidth,
      );
      const physicalIndex = Math.max(
        0,
        Math.min(pageCount - 1, rawPhysicalIndex),
      );
      if (ignoreNextMomentumRef.current) {
        return;
      }
      setLogicalIndex(toLogicalIndex(physicalIndex));
    },
    [containerWidth, pageCount, toLogicalIndex],
  );

  const handleSelectTab = useCallback(
    (nextLogical: number) => {
      ignoreNextMomentumRef.current = true;
      setLogicalIndex(nextLogical);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          ignoreNextMomentumRef.current = false;
        }),
      );
      if (!containerWidth) return;
      flatListRef.current?.scrollToIndex({
        index: toPhysicalIndex(nextLogical),
        animated: true,
      });
    },
    [containerWidth, toPhysicalIndex],
  );

  React.useEffect(() => {
    if (!containerWidth || hasInitialScrollSyncedRef.current) return;
    hasInitialScrollSyncedRef.current = true;
    flatListRef.current?.scrollToIndex({
      index: toPhysicalIndex(logicalIndexRef.current),
      animated: false,
    });
  }, [containerWidth, toPhysicalIndex]);

  React.useEffect(() => {
    if (!containerWidth) return;
    flatListRef.current?.scrollToIndex({
      index: toPhysicalIndex(logicalIndexRef.current),
      animated: false,
    });
  }, [containerWidth, isRTL, toPhysicalIndex]);

  const tabsControl = (
    <View style={styles.selectorWrap}>
      <View
        style={[
          styles.selectorBar,
          {
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.borderStrong,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        {logicalTabs.map((tab) => {
          const active = logicalIndex === tab.logical;
          return (
            <View key={tab.key} style={styles.segmentSlot}>
              <PressableScale
                style={[
                  styles.segmentButton,
                  active
                    ? {
                        backgroundColor: theme.accentSoft,
                        borderColor: theme.primary + "26",
                        shadowColor: theme.primary,
                      }
                    : styles.segmentButtonInactive,
                ]}
                onPress={() => handleSelectTab(tab.logical)}
                scaleValue={0.98}
              >
                <ThemedText
                  semanticVariant="labelPrimary"
                  numberOfLines={1}
                  style={{
                    color: active ? theme.primary : theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {tab.label}
                </ThemedText>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          shadowColor: theme.cardShadow,
        },
      ]}
    >
      <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
        <View
          style={[
            styles.sectionHeaderMain,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: theme.primary + "18" },
            ]}
          >
            <Feather name="activity" size={18} color={theme.primary} />
          </View>
          <View style={styles.sectionTextBlock}>
            <ThemedText semanticVariant="sectionTitle">
              {t("reports_charts_title")}
            </ThemedText>
            <ThemedText
              semanticVariant="helper"
              style={{ color: theme.textSecondary }}
            >
              {t("reports_charts_subtitle")}
            </ThemedText>
          </View>
        </View>
      </View>

      {tabsControl}
      <View
        onLayout={(event) => {
          const nextWidth = Math.floor(event.nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== containerWidth) {
            setContainerWidth(nextWidth);
          }
        }}
      >
        <FlatList
          ref={flatListRef}
          data={physicalPages}
          horizontal
          initialScrollIndex={0}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onMomentumScrollEnd={handleMomentumEnd}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              const width = widthRef.current || 1;
              flatListRef.current?.scrollToOffset({
                offset: info.index * width,
                animated: false,
              });
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                });
              });
            }, 50);
          }}
          getItemLayout={(_, index) => ({
            length: containerWidth || 1,
            offset: (containerWidth || 1) * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={{ width: containerWidth || 1 }}>
              {item.key === "overview" ? (
                <SevenDayChart days={days} availableWidth={containerWidth} />
              ) : null}
              {item.key === "feeders" ? (
                <SeriesComparisonChart
                  days={days}
                  title={t("chart_feeders_7_days")}
                  series={feederSeries}
                  domainMode="symmetric"
                  availableWidth={containerWidth}
                />
              ) : null}
              {item.key === "turbines" ? (
                <SeriesComparisonChart
                  days={days}
                  title={t("chart_turbines_7_days")}
                  series={turbineSeries}
                  domainMode="positive"
                  availableWidth={containerWidth}
                />
              ) : null}
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  sectionHeaderMain: {
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  sectionTextBlock: {
    flex: 1,
    gap: 4,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  selectorBar: {
    width: "100%",
    borderRadius: 999,
    borderWidth: 1,
    padding: 5,
    alignSelf: "stretch",
  },
  segmentButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 1,
  },
  segmentSlot: {
    flex: 1,
  },
  segmentButtonInactive: {
    borderColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
});

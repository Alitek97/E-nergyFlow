import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import PressableScale from "@/components/ui/PressableScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess } from "@/utils/notify";

import { ThemedText } from "@/components/ThemedText";
import { NumberText } from "@/components/NumberText";
import { ReportsChartsCarousel } from "@/components/ReportsChartsCarousel";
import { MonthDaysModal } from "@/components/MonthDaysModal";
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { ScreenBackground } from "@/components/visual/ScreenBackground";
import { EnergyFlowOverlay } from "@/components/visual/EnergyFlowOverlay";
import { ScadaGridOverlay } from "@/components/visual/ScadaGridOverlay";
import { useTheme } from "@/hooks/useTheme";
import {
  getResponsiveScrollContentStyle,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";
import { useScadaEffects } from "@/hooks/useScadaEffects";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import { useRTL } from "@/hooks/useRTL";
import { getFlowLabelAndStyle } from "@/lib/flowLabel";
import { DayData, getAllDaysData, exportAllData } from "@/lib/storage";
import { generateExcelReport, generateTextReport } from "@/lib/excelExport";
import { computeDayStats } from "@/shared/lib/dayCalculations";
import {
  MonthSummary,
  MonthListItem,
  fetchMonthsListFromSupabase,
  fetchSingleMonthFromSupabase,
  fetchRecentDaysFullFromSupabase,
} from "@/lib/supabaseSync";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { formatEnergy } from "@/utils/units";

type ReportsNavigation = NativeStackNavigationProp<
  ReportsStackParamList,
  "Reports"
>;
type ReportsScreenCache = {
  allDays: DayData[];
  currentMonth: string;
  currentMonthStats: MonthSummary | null;
  previousMonthsList: MonthListItem[];
  userId: string | null;
};

let reportsScreenCache: ReportsScreenCache | null = null;

function getCachedReportsScreenData(
  userId: string | null,
  currentMonth: string,
) {
  if (
    !reportsScreenCache ||
    reportsScreenCache.userId !== userId ||
    reportsScreenCache.currentMonth !== currentMonth
  ) {
    return null;
  }

  return reportsScreenCache;
}

const ENABLE_POWER_GRID_BG = true;
const ENABLE_ENERGY_FLOW = true;
const ENABLE_SCADA_GRID = true;
const SCADA_VISUAL_VERIFY = false;

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const showWideLayout = layout.isWideLayout;
  const isCompactPhone = layout.isCompactPhone;
  const { dateKey, day } = useDay();
  const { language, t, isRTL } = useLanguage();
  const { unitsConfig } = useUnits();
  const { rtlRow } = useRTL();
  const { scadaEffectsEnabled } = useScadaEffects();
  const backgroundOpacity =
    SCADA_VISUAL_VERIFY && scadaEffectsEnabled ? 0.12 : 0.06;
  const flowOpacity = SCADA_VISUAL_VERIFY && scadaEffectsEnabled ? 0.18 : 0.08;
  const gridOpacity = SCADA_VISUAL_VERIFY && scadaEffectsEnabled ? 0.1 : 0.04;
  const { user } = useAuth();
  const navigation = useNavigation<ReportsNavigation>();

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const cachedReportsData = useMemo(
    () => getCachedReportsScreenData(user?.id ?? null, currentMonth),
    [currentMonth, user?.id],
  );

  const [allDays, setAllDays] = useState<DayData[]>(
    () => cachedReportsData?.allDays ?? [],
  );
  const [currentMonthStats, setCurrentMonthStats] =
    useState<MonthSummary | null>(
      () => cachedReportsData?.currentMonthStats ?? null,
    );
  const [previousMonthsList, setPreviousMonthsList] = useState<MonthListItem[]>(
    () => cachedReportsData?.previousMonthsList ?? [],
  );
  const [loading, setLoading] = useState(() => !cachedReportsData);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthModalVisible, setMonthModalVisible] = useState(false);

  const scrollContentContainerStyle = useMemo<ViewStyle>(
    () =>
      getResponsiveScrollContentStyle(layout, {
        headerHeight,
        tabBarHeight,
        topSpacing: Spacing.lg,
        bottomSpacing: Spacing.xl,
      }),
    [headerHeight, layout, tabBarHeight],
  );

  const loadAllData = useCallback(
    async (showRefreshFeedback = false) => {
      if (showRefreshFeedback) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        let resolvedAllDays: DayData[] = [];
        let resolvedCurrentMonthStats: MonthSummary | null = null;
        let resolvedPreviousMonthsList: MonthListItem[] = [];

        if (user?.id) {
          const [recentDays, monthsList] = await Promise.all([
            fetchRecentDaysFullFromSupabase(user.id, 7),
            fetchMonthsListFromSupabase(user.id),
          ]);
          resolvedAllDays = recentDays;

          const currentMonthItem = monthsList.find(
            (m) => m.month === currentMonth,
          );
          resolvedPreviousMonthsList = monthsList.filter(
            (m) => m.month !== currentMonth,
          );

          if (currentMonthItem) {
            resolvedCurrentMonthStats = await fetchSingleMonthFromSupabase(
              user.id,
              currentMonth,
            );
          }
        } else {
          const localDays = await getAllDaysData();
          resolvedAllDays = localDays;

          const monthMap = new Map<
            string,
            { days: number; production: number; exportVal: number }
          >();
          for (const d of localDays) {
            const month = d.dateKey.substring(0, 7);
            const stats = computeDayStats(d);
            const existing = monthMap.get(month) || {
              days: 0,
              production: 0,
              exportVal: 0,
            };
            existing.days++;
            existing.production += stats.production;
            existing.exportVal += stats.exportVal;
            monthMap.set(month, existing);
          }

          const allLocalMonths: MonthSummary[] = Array.from(monthMap.entries())
            .map(([month, data]) => ({
              month,
              days: data.days,
              totalProduction: data.production,
              totalExport: data.exportVal,
              totalConsumption: data.production - data.exportVal,
            }))
            .sort((a, b) => b.month.localeCompare(a.month));

          const currentMonthLocal = allLocalMonths.find(
            (m) => m.month === currentMonth,
          );
          const previousMonthsLocal = allLocalMonths.filter(
            (m) => m.month !== currentMonth,
          );

          resolvedCurrentMonthStats = currentMonthLocal || null;
          resolvedPreviousMonthsList = previousMonthsLocal.map((m) => ({
            month: m.month,
            days: m.days,
          }));
        }

        setAllDays(resolvedAllDays);
        setCurrentMonthStats(resolvedCurrentMonthStats);
        setPreviousMonthsList(resolvedPreviousMonthsList);
        reportsScreenCache = {
          allDays: resolvedAllDays,
          currentMonth,
          currentMonthStats: resolvedCurrentMonthStats,
          previousMonthsList: resolvedPreviousMonthsList,
          userId: user?.id ?? null,
        };

        if (showRefreshFeedback) {
          showSuccess(t("data_updated"));
        }
      } catch (error) {
        console.error("Failed to load reports data:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, user?.id, currentMonth],
  );

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData]),
  );

  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user?.id, loadAllData]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadAllData(true);
  }, [loadAllData]);

  const currentDayStats = useMemo(() => {
    return computeDayStats(day);
  }, [day]);

  const handleTextExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await generateTextReport(day, t, language);
    } catch {
      Alert.alert(t("error"), t("failed_export"));
    }
  };

  const handleOpenMonthModal = useCallback((month: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(month);
    setMonthModalVisible(true);
  }, []);

  const handleMonthDayDeleted = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  const closeMonthModal = useCallback(() => {
    setMonthModalVisible(false);
  }, []);

  const handleCopyToClipboard = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const jsonData = await exportAllData();
      await Clipboard.setStringAsync(jsonData);
      Alert.alert(t("copied"), t("data_copied"));
    } catch {
      Alert.alert(t("error"), t("failed_copy"));
    }
  };

  const handleExcelExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await generateExcelReport(day, allDays, t, language);
    } catch {
      Alert.alert(t("error"), t("failed_export"));
    }
  };

  const currentFlowStyle = useMemo(
    () => getFlowLabelAndStyle(currentDayStats.isExport, t, theme),
    [currentDayStats.isExport, t, theme],
  );
  const currentDayProductionText = useMemo(
    () =>
      formatEnergy(currentDayStats.production, unitsConfig, {
        prefer: "fixed",
        precision: "adaptive",
      }),
    [currentDayStats.production, unitsConfig],
  );
  const currentDayFlowText = useMemo(
    () =>
      formatEnergy(Math.abs(currentDayStats.exportVal), unitsConfig, {
        prefer: "fixed",
        precision: "adaptive",
      }),
    [currentDayStats.exportVal, unitsConfig],
  );
  const currentDayConsumptionText = useMemo(
    () =>
      formatEnergy(currentDayStats.consumption, unitsConfig, {
        prefer: "fixed",
        precision: "adaptive",
      }),
    [currentDayStats.consumption, unitsConfig],
  );

  const renderMonthCard = (
    stats: MonthSummary,
    isCurrentMonth: boolean = false,
  ) => {
    const flowStyle = getFlowLabelAndStyle(stats.totalExport >= 0, t, theme);
    const productionText = formatEnergy(stats.totalProduction, unitsConfig, {
      prefer: "auto",
      precision: "adaptive",
    });
    const flowText = formatEnergy(Math.abs(stats.totalExport), unitsConfig, {
      prefer: "auto",
      precision: "adaptive",
    });
    const consumptionText = formatEnergy(stats.totalConsumption, unitsConfig, {
      prefer: "auto",
      precision: "adaptive",
    });

    return (
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            marginBottom: Spacing.md,
          },
          isCurrentMonth && { borderWidth: 2, borderColor: theme.primary },
        ]}
        onPress={() => handleOpenMonthModal(stats.month)}
      >
        <View
          style={[
            styles.monthHeader,
            isCompactPhone && styles.monthHeaderCompact,
            rtlRow,
            { borderBottomColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.monthTitleRow,
              isCompactPhone && styles.monthTitleRowCompact,
              rtlRow,
              { gap: Spacing.sm },
            ]}
          >
            <View
              style={[
                styles.monthBadge,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <Feather name="calendar" size={14} color={theme.primary} />
            </View>
            <NumberText size="summary" weight="semibold">
              {stats.month}
            </NumberText>
            {isCurrentMonth && (
              <View
                style={[
                  styles.currentBadge,
                  { backgroundColor: theme.primary },
                ]}
              >
                <ThemedText
                  semanticVariant="button"
                  style={{ color: theme.buttonText }}
                >
                  {t("current")}
                </ThemedText>
              </View>
            )}
          </View>
          <View
            style={[
              styles.daysBadge,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View style={[styles.inlineCountRow, rtlRow]}>
              <NumberText size="small" style={{ color: theme.textSecondary }}>
                {stats.days}
              </NumberText>
              <ThemedText
                semanticVariant="labelSecondary"
                style={{ color: theme.textSecondary }}
              >
                {stats.days !== 1 ? t("days_plural") : t("day_singular")}
              </ThemedText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.monthStats,
            (isCompactPhone || showWideLayout) && styles.monthStatsResponsive,
          ]}
        >
          <View style={styles.monthStatItem}>
            <View
              style={[styles.monthStatDot, { backgroundColor: theme.success }]}
            />
            <ThemedText
              semanticVariant="tableHeader"
              style={{ color: theme.textSecondary }}
            >
              {t("production")}
            </ThemedText>
            <ValueWithUnit
              value={productionText.valueText}
              unit={productionText.unitText}
              unitStyle={{ color: theme.textSecondary }}
            />
          </View>
          <View style={styles.monthStatItem}>
            <View
              style={[
                styles.monthStatDot,
                { backgroundColor: flowStyle.color },
              ]}
            />
            <ThemedText
              semanticVariant="tableHeader"
              style={{ color: theme.textSecondary }}
            >
              {flowStyle.text}
            </ThemedText>
            <ValueWithUnit
              value={flowText.valueText}
              unit={flowText.unitText}
              valueStyle={{ color: flowStyle.color }}
              unitStyle={{ color: theme.textSecondary }}
            />
          </View>
          <View style={styles.monthStatItem}>
            <View
              style={[styles.monthStatDot, { backgroundColor: theme.warning }]}
            />
            <ThemedText
              semanticVariant="tableHeader"
              style={{ color: theme.textSecondary }}
            >
              {t("consumption")}
            </ThemedText>
            <ValueWithUnit
              value={consumptionText.valueText}
              unit={consumptionText.unitText}
              valueStyle={{ color: theme.warning }}
              unitStyle={{ color: theme.textSecondary }}
            />
          </View>
        </View>

        <View
          style={[
            styles.tapHint,
            rtlRow,
            { borderTopColor: theme.border, gap: Spacing.xs },
          ]}
        >
          <Feather name="chevron-up" size={14} color={theme.textSecondary} />
          <ThemedText
            semanticVariant="helper"
            style={{ color: theme.textSecondary }}
          >
            {t("tap_to_view")}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.overlayRoot}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <ScreenBackground
            enabled={ENABLE_POWER_GRID_BG}
            opacity={backgroundOpacity}
          />
        </View>
        {scadaEffectsEnabled ? (
          <View pointerEvents="none" style={styles.flowLayer}>
            <EnergyFlowOverlay
              enabled={ENABLE_ENERGY_FLOW && isDark}
              opacity={flowOpacity}
            />
          </View>
        ) : null}
        {scadaEffectsEnabled ? (
          <View pointerEvents="none" style={styles.gridLayer}>
            <ScadaGridOverlay
              enabled={ENABLE_SCADA_GRID && isDark}
              opacity={gridOpacity}
            />
          </View>
        ) : null}
        <View style={styles.contentLayer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={scrollContentContainerStyle}
            scrollIndicatorInsets={{ bottom: insets.bottom }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(300)}>
              <ReportsChartsCarousel days={allDays} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <ThemedText
                semanticVariant="sectionTitle"
                style={styles.sectionTitle}
              >
                {t("current_day_report")}
              </ThemedText>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.cardHeader,
                    rtlRow,
                    { borderBottomColor: theme.border, gap: Spacing.md },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                  >
                    <Feather name="calendar" size={18} color={theme.primary} />
                  </View>
                  <NumberText size="summary" weight="semibold">
                    {dateKey}
                  </NumberText>
                </View>

                <View
                  style={[
                    styles.statsGrid,
                    showWideLayout && styles.tabletStatsGrid,
                    isCompactPhone && styles.statsGridCompact,
                  ]}
                >
                  <View
                    style={[
                      styles.statItem,
                      { backgroundColor: theme.success + "15" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statIconCircle,
                        { backgroundColor: theme.success + "20" },
                      ]}
                    >
                      <Feather name="zap" size={18} color={theme.success} />
                    </View>
                    <ThemedText
                      semanticVariant="tableHeader"
                      style={{ color: theme.success, marginTop: Spacing.sm }}
                    >
                      {t("production")}
                    </ThemedText>
                    <ValueWithUnit
                      value={currentDayProductionText.valueText}
                      unit={currentDayProductionText.unitText}
                      type="h3"
                      valueStyle={{ color: theme.success }}
                      unitStyle={{ color: theme.textSecondary }}
                    />
                  </View>

                  <View
                    style={[
                      styles.statItem,
                      { backgroundColor: currentFlowStyle.color + "15" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statIconCircle,
                        { backgroundColor: currentFlowStyle.color + "20" },
                      ]}
                    >
                      <Feather
                        name={
                          currentDayStats.isExport
                            ? "arrow-up-right"
                            : "arrow-down-left"
                        }
                        size={18}
                        color={currentFlowStyle.color}
                      />
                    </View>
                    <ThemedText
                      semanticVariant="tableHeader"
                      style={{
                        color: currentFlowStyle.color,
                        marginTop: Spacing.sm,
                      }}
                    >
                      {currentFlowStyle.text}
                    </ThemedText>
                    <ValueWithUnit
                      value={currentDayFlowText.valueText}
                      unit={currentDayFlowText.unitText}
                      type="h3"
                      valueStyle={{ color: currentFlowStyle.color }}
                      unitStyle={{ color: theme.textSecondary }}
                    />
                  </View>

                  <View
                    style={[
                      styles.statItem,
                      { backgroundColor: theme.warning + "15" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statIconCircle,
                        { backgroundColor: theme.warning + "20" },
                      ]}
                    >
                      <Feather name="home" size={18} color={theme.warning} />
                    </View>
                    <ThemedText
                      semanticVariant="tableHeader"
                      style={{ color: theme.warning, marginTop: Spacing.sm }}
                    >
                      {t("consumption")}
                    </ThemedText>
                    <ValueWithUnit
                      value={currentDayConsumptionText.valueText}
                      unit={currentDayConsumptionText.unitText}
                      type="h3"
                      valueStyle={{ color: theme.warning }}
                      unitStyle={{ color: theme.textSecondary }}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <ThemedText
                semanticVariant="sectionTitle"
                style={styles.sectionTitle}
              >
                {t("current_month")}
              </ThemedText>

              {loading ? (
                <View
                  style={[
                    styles.loadingContainer,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : currentMonthStats ? (
                renderMonthCard(currentMonthStats, true)
              ) : (
                <View
                  style={[
                    styles.emptyState,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <View
                    style={[
                      styles.emptyIconCircle,
                      { backgroundColor: theme.primary + "15" },
                    ]}
                  >
                    <Feather name="calendar" size={32} color={theme.primary} />
                  </View>
                  <ThemedText
                    semanticVariant="sectionTitle"
                    style={{ color: theme.text, marginTop: Spacing.lg }}
                  >
                    {t("no_data_this_month")}
                  </ThemedText>
                  <ThemedText
                    semanticVariant="helper"
                    style={{
                      color: theme.textSecondary,
                      textAlign: "center",
                      marginTop: Spacing.xs,
                    }}
                  >
                    {t("save_first_day_hint")}
                  </ThemedText>
                </View>
              )}
            </Animated.View>

            {previousMonthsList.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).duration(300)}>
                <Pressable
                  style={[
                    styles.accordionHeader,
                    rtlRow,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                  onPress={() => navigation.navigate("MonthsScreen")}
                >
                  <View
                    style={[
                      styles.accordionTitleRow,
                      rtlRow,
                      { gap: Spacing.md },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: theme.textSecondary + "20" },
                      ]}
                    >
                      <Feather
                        name="archive"
                        size={18}
                        color={theme.textSecondary}
                      />
                    </View>
                    <View>
                      <ThemedText semanticVariant="labelPrimary">
                        {t("previous_months")}
                      </ThemedText>
                      <View style={[styles.inlineCountRow, rtlRow]}>
                        <NumberText
                          size="small"
                          style={{ color: theme.textSecondary }}
                        >
                          {previousMonthsList.length}
                        </NumberText>
                        <ThemedText
                          semanticVariant="helper"
                          style={{ color: theme.textSecondary }}
                        >
                          {previousMonthsList.length !== 1
                            ? t("months_plural")
                            : t("month_singular")}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  <Feather
                    name={isRTL ? "chevron-left" : "chevron-right"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </Animated.View>
            )}

            {!loading &&
              !currentMonthStats &&
              previousMonthsList.length === 0 && (
                <Animated.View entering={FadeInDown.delay(300).duration(300)}>
                  <View
                    style={[
                      styles.emptyState,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <View
                      style={[
                        styles.emptyIconCircle,
                        { backgroundColor: theme.primary + "15" },
                      ]}
                    >
                      <Feather name="inbox" size={32} color={theme.primary} />
                    </View>
                    <ThemedText
                      semanticVariant="sectionTitle"
                      style={{ color: theme.text, marginTop: Spacing.lg }}
                    >
                      {t("no_historical_data")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="helper"
                      style={{
                        color: theme.textSecondary,
                        textAlign: "center",
                        marginTop: Spacing.xs,
                      }}
                    >
                      {t("save_first_day_hint")}
                    </ThemedText>
                  </View>
                </Animated.View>
              )}

            <Animated.View entering={FadeInDown.delay(400).duration(300)}>
              <ThemedText
                semanticVariant="sectionTitle"
                style={styles.sectionTitle}
              >
                {t("data_management")}
              </ThemedText>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <PressableScale
                  style={[
                    styles.actionRow,
                    rtlRow,
                    { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                  onPress={handleExcelExport}
                  testID="button-export-excel"
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: theme.success + "20" },
                    ]}
                  >
                    <Feather name="file-text" size={20} color={theme.success} />
                  </View>
                  <View style={styles.actionText}>
                    <ThemedText semanticVariant="button">
                      {t("export_excel")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="helper"
                      style={{ color: theme.textSecondary }}
                    >
                      {t("share_as_excel")}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.actionArrow,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather
                      name={isRTL ? "chevron-left" : "chevron-right"}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </View>
                </PressableScale>

                <PressableScale
                  style={[
                    styles.actionRow,
                    rtlRow,
                    { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                  onPress={handleTextExport}
                  testID="button-export"
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                  >
                    <Feather name="file-text" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.actionText}>
                    <ThemedText semanticVariant="button">
                      {t("export_txt")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="helper"
                      style={{ color: theme.textSecondary }}
                    >
                      {t("share_as_txt")}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.actionArrow,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather
                      name={isRTL ? "chevron-left" : "chevron-right"}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </View>
                </PressableScale>

                <PressableScale
                  style={[styles.actionRow, rtlRow]}
                  onPress={handleCopyToClipboard}
                  testID="button-copy"
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: theme.success + "20" },
                    ]}
                  >
                    <Feather name="copy" size={20} color={theme.success} />
                  </View>
                  <View style={styles.actionText}>
                    <ThemedText semanticVariant="button">
                      {t("copy_to_clipboard")}
                    </ThemedText>
                    <ThemedText
                      semanticVariant="helper"
                      style={{ color: theme.textSecondary }}
                    >
                      {t("copy_all_data")}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.actionArrow,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather
                      name={isRTL ? "chevron-left" : "chevron-right"}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </View>
                </PressableScale>
              </View>

              <View style={styles.footer}>
                <PressableScale
                  style={[
                    styles.refreshButton,
                    rtlRow,
                    {
                      backgroundColor: theme.primary,
                      opacity: refreshing ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={theme.buttonText} />
                  ) : (
                    <Feather
                      name="refresh-cw"
                      size={18}
                      color={theme.buttonText}
                    />
                  )}
                  <ThemedText
                    semanticVariant="button"
                    style={{ color: theme.buttonText }}
                  >
                    {t("refresh")}
                  </ThemedText>
                </PressableScale>

                <View
                  style={[
                    styles.footerBadge,
                    rtlRow,
                    {
                      backgroundColor: theme.backgroundDefault,
                      marginTop: Spacing.md,
                    },
                  ]}
                >
                  <Feather
                    name="database"
                    size={14}
                    color={theme.textSecondary}
                  />
                  <View style={[styles.inlineCountRow, rtlRow]}>
                    <NumberText
                      size="small"
                      style={{ color: theme.textSecondary }}
                    >
                      {allDays.length}
                    </NumberText>
                    <ThemedText
                      semanticVariant="helper"
                      style={{ color: theme.textSecondary }}
                    >
                      {allDays.length !== 1
                        ? t("days_plural")
                        : t("day_singular")}{" "}
                      {t("days_stored")}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </View>

      {selectedMonth && (
        <MonthDaysModal
          visible={monthModalVisible}
          monthKey={selectedMonth}
          onClose={closeMonthModal}
          onDayDeleted={handleMonthDayDeleted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  overlayRoot: {
    flex: 1,
    position: "relative",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  flowLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  contentLayer: {
    flex: 1,
    zIndex: 3,
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  inlineCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsGridCompact: {
    flexWrap: "wrap",
  },
  tabletStatsGrid: {
    flexWrap: "wrap",
  },
  statItem: {
    flex: 1,
    minWidth: 100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 148,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  monthHeaderCompact: {
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  monthTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthTitleRowCompact: {
    flex: 1,
    flexWrap: "wrap",
  },
  monthBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  daysBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  monthStats: {
    flexDirection: "row",
    padding: Spacing.lg,
    justifyContent: "space-around",
  },
  monthStatsResponsive: {
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: Spacing.md,
  },
  monthStatItem: {
    alignItems: "center",
    flex: 1,
    minWidth: 128,
    gap: Spacing.xs,
    minHeight: 92,
  },
  monthStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  monthStatsPlaceholder: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  loadDataButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  accordionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previousMonthsContainer: {
    marginTop: Spacing.sm,
  },
  loadingContainer: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: "center",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  flexRow: {
    flexDirection: "row",
  },
  flexRowRTL: {
    flexDirection: "row-reverse",
  },
});

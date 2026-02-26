import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess } from "@/utils/notify";

import { ThemedText } from "@/components/ThemedText";
import { NumberText } from "@/components/NumberText";
import { SevenDayChart } from "@/components/SevenDayChart";
import { MonthDaysModal } from "@/components/MonthDaysModal";
import { ValueWithUnit, UNITS } from "@/components/ValueWithUnit";
import { useTheme } from "@/hooks/useTheme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";
import { getFlowLabelAndStyle } from "@/lib/flowLabel";
import {
  DayData,
  getAllDaysData,
  exportAllData,
  format2,
} from "@/lib/storage";
import { generateExcelReport, generateTextReport } from "@/lib/excelExport";
import { computeDayStats } from "@/shared/lib/dayCalculations";
import {
  MonthSummary,
  MonthListItem,
  fetchMonthsListFromSupabase,
  fetchSingleMonthFromSupabase,
  fetchRecentDaysFullFromSupabase,
} from "@/lib/supabaseSync";

export default function ReportsScreen() {
  const renderCountRef = useRef(0);
  if (__DEV__) {
    renderCountRef.current += 1;
    console.log(`[render] ReportsScreen #${renderCountRef.current}`);
  }

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const { dateKey, day } = useDay();
  const { language, t, isRTL } = useLanguage();
  const { rtlRow, rtlText } = useRTL();
  const { user } = useAuth();

  const [allDays, setAllDays] = useState<DayData[]>([]);
  const [currentMonthStats, setCurrentMonthStats] = useState<MonthSummary | null>(null);
  const [previousMonthsList, setPreviousMonthsList] = useState<MonthListItem[]>([]);
  const [previousMonthsExpanded, setPreviousMonthsExpanded] = useState(false);
  const [previousMonthsData, setPreviousMonthsData] = useState<Map<string, MonthSummary>>(new Map());
  const [loadingMonths, setLoadingMonths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthModalVisible, setMonthModalVisible] = useState(false);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const chevronRotation = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const scrollContentContainerStyle = useMemo<ViewStyle>(
    () => ({
      paddingTop: headerHeight + Spacing.lg,
      paddingBottom: tabBarHeight + Spacing.xl,
      paddingHorizontal: layout.horizontalPadding,
      maxWidth: layout.isTablet ? layout.contentMaxWidth : undefined,
      alignSelf: layout.isTablet ? "center" : undefined,
      width: layout.isTablet ? "100%" : undefined,
    }),
    [headerHeight, tabBarHeight, layout.horizontalPadding, layout.isTablet, layout.contentMaxWidth]
  );

  const loadAllData = useCallback(async (showRefreshFeedback = false) => {
    if (showRefreshFeedback) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      if (user?.id) {
        const [recentDays, monthsList] = await Promise.all([
          fetchRecentDaysFullFromSupabase(user.id, 7),
          fetchMonthsListFromSupabase(user.id),
        ]);
        setAllDays(recentDays);

        const currentMonthItem = monthsList.find(m => m.month === currentMonth);
        const previousMonths = monthsList.filter(m => m.month !== currentMonth);
        setPreviousMonthsList(previousMonths);

        if (currentMonthItem) {
          const currentStats = await fetchSingleMonthFromSupabase(user.id, currentMonth);
          setCurrentMonthStats(currentStats);
        } else {
          setCurrentMonthStats(null);
        }
      } else {
        const localDays = await getAllDaysData();
        setAllDays(localDays);
        
        const monthMap = new Map<string, { days: number; production: number; exportVal: number }>();
        for (const d of localDays) {
          const month = d.dateKey.substring(0, 7);
          const stats = computeDayStats(d);
          const existing = monthMap.get(month) || { days: 0, production: 0, exportVal: 0 };
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
        
        const currentMonthLocal = allLocalMonths.find(m => m.month === currentMonth);
        const previousMonthsLocal = allLocalMonths.filter(m => m.month !== currentMonth);
        
        setCurrentMonthStats(currentMonthLocal || null);
        setPreviousMonthsList(previousMonthsLocal.map(m => ({ month: m.month, days: m.days })));
        
        const prevDataMap = new Map<string, MonthSummary>();
        for (const m of previousMonthsLocal) {
          prevDataMap.set(m.month, m);
        }
        setPreviousMonthsData(prevDataMap);
      }
      if (showRefreshFeedback) {
        showSuccess(t("data_updated"));
      }
    } catch (error) {
      console.error("Failed to load reports data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, user?.id, currentMonth]);

  const loadPreviousMonthData = useCallback(async (monthKey: string) => {
    if (previousMonthsData.has(monthKey) || loadingMonths.has(monthKey)) {
      return;
    }
    
    if (!user?.id) {
      return;
    }

    setLoadingMonths(prev => new Set(prev).add(monthKey));
    try {
      const data = await fetchSingleMonthFromSupabase(user.id, monthKey);
      if (data) {
        setPreviousMonthsData(prev => new Map(prev).set(monthKey, data));
      }
    } catch (error) {
      console.error(`Failed to load month ${monthKey}:`, error);
    } finally {
      setLoadingMonths(prev => {
        const next = new Set(prev);
        next.delete(monthKey);
        return next;
      });
    }
  }, [user?.id, previousMonthsData, loadingMonths]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user?.id, loadAllData]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviousMonthsData(new Map());
    loadAllData(true);
  }, [loadAllData]);

  const handleTogglePreviousMonths = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExpanded = !previousMonthsExpanded;
    setPreviousMonthsExpanded(newExpanded);
    chevronRotation.value = withTiming(newExpanded ? 180 : 0, { duration: 200 });
  }, [chevronRotation, previousMonthsExpanded]);

  const currentDayStats = useMemo(() => {
    return computeDayStats(day);
  }, [day]);

  const handleTextExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await generateTextReport(day, t, language);
    } catch (error) {
      Alert.alert(t("error"), t("failed_export"));
    }
  };

  const handleOpenMonthModal = useCallback((month: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(month);
    setMonthModalVisible(true);
  }, []);

  const handleMonthDayDeleted = useCallback(() => {
    setPreviousMonthsData(new Map());
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
    } catch (error) {
      Alert.alert(t("error"), t("failed_copy"));
    }
  };

  const handleExcelExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await generateExcelReport(day, allDays, t, language);
    } catch (error) {
      Alert.alert(t("error"), t("failed_export"));
    }
  };

  const currentFlowStyle = useMemo(
    () => getFlowLabelAndStyle(currentDayStats.isExport, t, theme),
    [currentDayStats.isExport, t, theme]
  );

  const renderMonthCard = (stats: MonthSummary, isCurrentMonth: boolean = false) => {
    const flowStyle = getFlowLabelAndStyle(stats.totalExport >= 0, t, theme);
    
    return (
      <Pressable
        style={[
          styles.card, 
          { backgroundColor: theme.backgroundDefault, marginBottom: Spacing.md },
          isCurrentMonth && { borderWidth: 2, borderColor: theme.primary },
        ]}
        onPress={() => handleOpenMonthModal(stats.month)}
      >
        <View style={[styles.monthHeader, rtlRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.monthTitleRow, rtlRow, { gap: Spacing.sm }]}>
            <View style={[styles.monthBadge, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="calendar" size={14} color={theme.primary} />
            </View>
            <NumberText size="summary" weight="semibold">{stats.month}</NumberText>
            {isCurrentMonth && (
              <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
                <ThemedText semanticVariant="button" style={{ color: theme.buttonText }}>
                  {t("current")}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={[styles.daysBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.inlineCountRow, rtlRow]}>
              <NumberText size="small" style={{ color: theme.textSecondary }}>
                {stats.days}
              </NumberText>
              <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary }}>
                {stats.days !== 1 ? t("days_plural") : t("day_singular")}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.monthStats}>
          <View style={styles.monthStatItem}>
            <View style={[styles.monthStatDot, { backgroundColor: theme.success }]} />
            <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
              {t("production")}
            </ThemedText>
            <ValueWithUnit 
              value={format2(stats.totalProduction / 1000)} 
              unit={UNITS.energyLarge}
              unitStyle={{ color: theme.textSecondary }}
            />
          </View>
          <View style={styles.monthStatItem}>
            <View style={[styles.monthStatDot, { backgroundColor: flowStyle.color }]} />
            <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
              {flowStyle.text}
            </ThemedText>
            <ValueWithUnit 
              value={format2(Math.abs(stats.totalExport) / 1000)} 
              unit={UNITS.energyLarge}
              valueStyle={{ color: flowStyle.color }}
              unitStyle={{ color: theme.textSecondary }}
            />
          </View>
          <View style={styles.monthStatItem}>
            <View style={[styles.monthStatDot, { backgroundColor: theme.warning }]} />
            <ThemedText semanticVariant="tableHeader" style={{ color: theme.textSecondary }}>
              {t("consumption")}
            </ThemedText>
            <ValueWithUnit 
              value={format2(stats.totalConsumption / 1000)} 
              unit={UNITS.energyLarge}
              unitStyle={{ color: theme.textSecondary }}
            />
          </View>
        </View>

        <View style={[styles.tapHint, rtlRow, { borderTopColor: theme.border, gap: Spacing.xs }]}>
          <Feather name="chevron-up" size={14} color={theme.textSecondary} />
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
            {t("tap_to_view")}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  const renderPreviousMonthItem = (item: MonthListItem) => {
    const cachedData = previousMonthsData.get(item.month);
    const isLoading = loadingMonths.has(item.month);

    if (cachedData) {
      return renderMonthCard(cachedData, false);
    }

    return (
      <Pressable
        style={[
          styles.card, 
          { backgroundColor: theme.backgroundDefault, marginBottom: Spacing.md },
        ]}
        onPress={() => {
          loadPreviousMonthData(item.month);
          handleOpenMonthModal(item.month);
        }}
      >
        <View style={[styles.monthHeader, rtlRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.monthTitleRow, rtlRow, { gap: Spacing.sm }]}>
            <View style={[styles.monthBadge, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="calendar" size={14} color={theme.primary} />
            </View>
            <NumberText size="summary" weight="semibold">{item.month}</NumberText>
          </View>
          <View style={[styles.daysBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.inlineCountRow, rtlRow]}>
              <NumberText size="small" style={{ color: theme.textSecondary }}>
                {item.days}
              </NumberText>
              <ThemedText semanticVariant="labelSecondary" style={{ color: theme.textSecondary }}>
                {item.days !== 1 ? t("days_plural") : t("day_singular")}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.monthStatsPlaceholder}>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Pressable 
              style={[styles.loadDataButton, rtlRow, { backgroundColor: theme.primary + "15", gap: Spacing.xs }]}
              onPress={() => loadPreviousMonthData(item.month)}
            >
              <Feather name="download" size={14} color={theme.primary} />
              <ThemedText semanticVariant="button" style={{ color: theme.primary }}>
                {t("load_details")}
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={[styles.tapHint, rtlRow, { borderTopColor: theme.border, gap: Spacing.xs }]}>
          <Feather name="chevron-up" size={14} color={theme.textSecondary} />
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
            {t("tap_to_view")}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={scrollContentContainerStyle}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          <SevenDayChart days={allDays} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={styles.sectionTitle}>
            {t("current_day_report")}
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cardHeader, rtlRow, { borderBottomColor: theme.border, gap: Spacing.md }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="calendar" size={18} color={theme.primary} />
              </View>
              <NumberText size="summary" weight="semibold">{dateKey}</NumberText>
            </View>

            <View style={[styles.statsGrid, layout.isTablet && styles.tabletStatsGrid]}>
              <View style={[styles.statItem, { backgroundColor: theme.success + "15" }]}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.success + "20" }]}>
                  <Feather name="zap" size={18} color={theme.success} />
                </View>
                <ThemedText semanticVariant="tableHeader" style={{ color: theme.success, marginTop: Spacing.sm }}>
                  {t("production")}
                </ThemedText>
                <ValueWithUnit 
                  value={format2(currentDayStats.production)} 
                  unit={UNITS.energy}
                  type="h3"
                  valueStyle={{ color: theme.success }}
                  unitStyle={{ color: theme.textSecondary }}
                />
              </View>

              <View style={[styles.statItem, { backgroundColor: currentFlowStyle.color + "15" }]}>
                <View style={[styles.statIconCircle, { backgroundColor: currentFlowStyle.color + "20" }]}>
                  <Feather name={currentDayStats.isExport ? "arrow-up-right" : "arrow-down-left"} size={18} color={currentFlowStyle.color} />
                </View>
                <ThemedText semanticVariant="tableHeader" style={{ color: currentFlowStyle.color, marginTop: Spacing.sm }}>
                  {currentFlowStyle.text}
                </ThemedText>
                <ValueWithUnit 
                  value={format2(Math.abs(currentDayStats.exportVal))} 
                  unit={UNITS.energy}
                  type="h3"
                  valueStyle={{ color: currentFlowStyle.color }}
                  unitStyle={{ color: theme.textSecondary }}
                />
              </View>

              <View style={[styles.statItem, { backgroundColor: theme.warning + "15" }]}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.warning + "20" }]}>
                  <Feather name="home" size={18} color={theme.warning} />
                </View>
                <ThemedText semanticVariant="tableHeader" style={{ color: theme.warning, marginTop: Spacing.sm }}>
                  {t("consumption")}
                </ThemedText>
                <ValueWithUnit 
                  value={format2(currentDayStats.consumption)} 
                  unit={UNITS.energy}
                  type="h3"
                  valueStyle={{ color: theme.warning }}
                  unitStyle={{ color: theme.textSecondary }}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={styles.sectionTitle}>
            {t("current_month")}
          </ThemedText>

          {loading ? (
            <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : currentMonthStats ? (
            renderMonthCard(currentMonthStats, true)
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.primary + "15" }]}>
                <Feather name="calendar" size={32} color={theme.primary} />
              </View>
              <ThemedText semanticVariant="sectionTitle" style={{ color: theme.text, marginTop: Spacing.lg }}>
                {t("no_data_this_month")}
              </ThemedText>
              <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
                {t("save_first_day_hint")}
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {previousMonthsList.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Pressable
              style={[styles.accordionHeader, rtlRow, { backgroundColor: theme.backgroundDefault }]}
              onPress={handleTogglePreviousMonths}
            >
              <View style={[styles.accordionTitleRow, rtlRow, { gap: Spacing.md }]}>
                <View style={[styles.iconCircle, { backgroundColor: theme.textSecondary + "20" }]}>
                  <Feather name="archive" size={18} color={theme.textSecondary} />
                </View>
                <View>
                  <ThemedText semanticVariant="labelPrimary">
                    {t("previous_months")}
                  </ThemedText>
                  <View style={[styles.inlineCountRow, rtlRow]}>
                    <NumberText size="small" style={{ color: theme.textSecondary }}>
                      {previousMonthsList.length}
                    </NumberText>
                    <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                      {previousMonthsList.length !== 1 ? t("months_plural") : t("month_singular")}
                    </ThemedText>
                  </View>
                </View>
              </View>
              <Animated.View style={chevronStyle}>
                <Feather name="chevron-down" size={20} color={theme.textSecondary} />
              </Animated.View>
            </Pressable>

            {previousMonthsExpanded && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.previousMonthsContainer}>
                {previousMonthsList.map((item) => (
                  <View key={item.month}>
                    {renderPreviousMonthItem(item)}
                  </View>
                ))}
              </Animated.View>
            )}
          </Animated.View>
        )}

        {!loading && !currentMonthStats && previousMonthsList.length === 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.primary + "15" }]}>
                <Feather name="inbox" size={32} color={theme.primary} />
              </View>
              <ThemedText semanticVariant="sectionTitle" style={{ color: theme.text, marginTop: Spacing.lg }}>
                {t("no_historical_data")}
              </ThemedText>
              <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
                {t("save_first_day_hint")}
              </ThemedText>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(400).duration(300)}>
          <ThemedText semanticVariant="sectionTitle" style={styles.sectionTitle}>
            {t("data_management")}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <PressableScale
              style={[styles.actionRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={handleExcelExport}
              testID="button-export-excel"
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.success + "20" }]}>
                <Feather name="file-text" size={20} color={theme.success} />
              </View>
              <View style={styles.actionText}>
                <ThemedText semanticVariant="button">
                  {t("export_excel")}
                </ThemedText>
                <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                  {t("share_as_excel")}
                </ThemedText>
              </View>
              <View style={[styles.actionArrow, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.textSecondary} />
              </View>
            </PressableScale>

            <PressableScale
              style={[styles.actionRow, rtlRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={handleTextExport}
              testID="button-export"
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="file-text" size={20} color={theme.primary} />
              </View>
              <View style={styles.actionText}>
                <ThemedText semanticVariant="button">
                  {t("export_txt")}
                </ThemedText>
                <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                  {t("share_as_txt")}
                </ThemedText>
              </View>
              <View style={[styles.actionArrow, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.textSecondary} />
              </View>
            </PressableScale>

            <PressableScale
              style={[styles.actionRow, rtlRow]}
              onPress={handleCopyToClipboard}
              testID="button-copy"
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.success + "20" }]}>
                <Feather name="copy" size={20} color={theme.success} />
              </View>
              <View style={styles.actionText}>
                <ThemedText semanticVariant="button">
                  {t("copy_to_clipboard")}
                </ThemedText>
                <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                  {t("copy_all_data")}
                </ThemedText>
              </View>
              <View style={[styles.actionArrow, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.textSecondary} />
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
                <Feather name="refresh-cw" size={18} color={theme.buttonText} />
              )}
              <ThemedText
                semanticVariant="button"
                style={{ color: theme.buttonText }}
              >
                {t("refresh")}
              </ThemedText>
            </PressableScale>

            <View style={[styles.footerBadge, rtlRow, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.md }]}>
              <Feather name="database" size={14} color={theme.textSecondary} />
              <View style={[styles.inlineCountRow, rtlRow]}>
                <NumberText size="small" style={{ color: theme.textSecondary }}>
                  {allDays.length}
                </NumberText>
                <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary }}>
                  {(allDays.length !== 1 ? t("days_plural") : t("day_singular"))} {t("days_stored")}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

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
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
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
  monthTitleRow: {
    flexDirection: "row",
    alignItems: "center",
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
  monthStatItem: {
    alignItems: "center",
    flex: 1,
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
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
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
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyState: {
    padding: Spacing.xl,
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
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  flexRow: {
    flexDirection: "row",
  },
  flexRowRTL: {
    flexDirection: "row-reverse",
  },
});

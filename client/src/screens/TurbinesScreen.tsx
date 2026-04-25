import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import PressableScale from "@/components/ui/PressableScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { OverviewStatCardContent } from "@/components/OverviewStatCardContent";
import { ThemedText } from "@/components/ThemedText";
import { FeederCode } from "@/components/FeederCode";
import { NumberText } from "@/components/NumberText";
import { CalendarPicker } from "@/components/CalendarPicker";
import { NumericInputField } from "@/components/NumericInputField";
import { HoursChip } from "@/components/HoursChip";
import { HoursPickerSheet } from "@/components/HoursPickerSheet";
import { DashboardBackdrop } from "@/components/visual/DashboardBackdrop";
import { useTheme } from "@/hooks/useTheme";
import {
  getResponsiveScrollContentStyle,
  getResponsiveValue,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";
import { BorderRadius, Shadows, Spacing, withAlpha } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnits } from "@/contexts/UnitsContext";
import { useRTL } from "@/hooks/useRTL";
import {
  TURBINES,
  format2,
  turbineRowComputed,
  formatDateKey,
  todayKey,
  parseReading,
  formatNumber,
} from "@/lib/storage";
import { getShiftForDate } from "@/lib/shift";
import { showSuccess, showError, showInfo } from "@/utils/notify";
import { formatShiftBadgeLabel } from "@/utils/shiftBadgeLabel";
import { formatPower } from "@/utils/units";

export default function TurbinesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const { dateKey, setDateKey, day, setDay, saveDay, resetDay, loading } =
    useDay();
  const { t: translate, isRTL, language } = useLanguage();
  const { unitsConfig } = useUnits();
  const pairedInputTextStyle = useMemo(
    () => ({
      writingDirection: isRTL ? ("rtl" as const) : ("ltr" as const),
      textAlign: isRTL ? ("right" as const) : ("left" as const),
    }),
    [isRTL],
  );
  const { rtlRow } = useRTL();
  const showWideGrid = layout.isWideLayout;
  const showTabletLayout = layout.isWide;
  const availableTabletWidth = Math.max(
    layout.screenWidth - layout.horizontalPadding * 2,
    0,
  );
  const operationGridGap = showTabletLayout
    ? getResponsiveValue(layout, {
        tablet: 20,
        tabletLandscape: 24,
        largeTablet: 24,
        largeTabletLandscape: 28,
        default: layout.gridGap,
      })
    : 0;
  const operationGridMaxWidth = showTabletLayout
    ? Math.min(
        availableTabletWidth,
        getResponsiveValue(layout, {
          tablet: 960,
          tabletLandscape: 1040,
          largeTablet: 1000,
          largeTabletLandscape: 1100,
          default: 960,
        }),
      )
    : undefined;
  const operationSectionMaxWidth =
    showTabletLayout && operationGridMaxWidth !== undefined
      ? Math.min(availableTabletWidth, operationGridMaxWidth + Spacing.lg * 2)
      : undefined;
  const operationGridTabletStyle =
    showTabletLayout && operationGridMaxWidth !== undefined
      ? ({
          alignSelf: "center",
          width: "100%",
          maxWidth: operationGridMaxWidth,
        } as const)
      : undefined;
  const operationGridItemTabletStyle = showTabletLayout
    ? ({
        marginBottom: operationGridGap,
      } as const)
    : undefined;
  const operationSectionTabletStyle =
    showTabletLayout && operationSectionMaxWidth !== undefined
      ? ({
          alignSelf: "center",
          width: "100%",
          maxWidth: operationSectionMaxWidth,
          borderColor: withAlpha(theme.border, isDark ? 0.9 : 0.56),
          shadowColor: theme.cardShadow,
          shadowOffset: { width: 0, height: isDark ? 4 : 0 },
          shadowOpacity: isDark ? 0.05 : 0,
          shadowRadius: isDark ? 8 : 0,
          elevation: isDark ? 1 : 0,
        } as const)
      : undefined;
  const operationCardTabletStyle = showTabletLayout
    ? ({
        alignSelf: "stretch",
        margin: 0,
        padding: Spacing.lg,
        width: "100%",
        maxWidth: "100%",
        shadowColor: theme.cardShadow,
        shadowOffset: { width: 0, height: isDark ? 6 : 1 },
        shadowOpacity: isDark ? 0.05 : 0.018,
        shadowRadius: isDark ? 10 : 5,
        elevation: isDark ? 2 : 0,
      } as const)
    : undefined;
  const tabletLargeSurfaceShadowStyle = showTabletLayout
    ? ({
        borderColor: withAlpha(theme.border, isDark ? 0.72 : 0.54),
        shadowColor: theme.cardShadow,
        shadowOffset: { width: 0, height: isDark ? 4 : 0 },
        shadowOpacity: isDark ? 0.05 : 0,
        shadowRadius: isDark ? 8 : 0,
        elevation: isDark ? 1 : 0,
      } as const)
    : undefined;
  const tabletSummaryCardShadowStyle = showTabletLayout
    ? ({
        borderColor: withAlpha(theme.success, isDark ? 0.5 : 0.28),
        shadowColor: theme.success,
        shadowOffset: { width: 0, height: isDark ? 4 : 1 },
        shadowOpacity: isDark ? 0.05 : 0.015,
        shadowRadius: isDark ? 8 : 5,
        elevation: isDark ? 1 : 0,
      } as const)
    : undefined;
  const scrollContentStyle = useMemo(() => {
    const baseStyle = getResponsiveScrollContentStyle(layout, {
      headerHeight,
      tabBarHeight,
      topSpacing: Spacing.lg,
      bottomSpacing: Spacing.xl,
    });

    return showTabletLayout && operationSectionMaxWidth !== undefined
      ? { ...baseStyle, maxWidth: operationSectionMaxWidth }
      : baseStyle;
  }, [
    headerHeight,
    layout,
    operationSectionMaxWidth,
    showTabletLayout,
    tabBarHeight,
  ]);
  const datePickerModalWidth = Math.min(
    layout.contentWidth,
    getResponsiveValue(layout, {
      compactPhone: 320,
      largePhone: 360,
      widePhone: 440,
      tablet: layout.isLandscape ? 760 : 620,
      largeTablet: layout.isLandscape ? 800 : 680,
      default: 360,
    }),
  );
  const summaryTableMinWidth = getResponsiveValue(layout, {
    compactPhone: 460,
    largePhone: 500,
    widePhone: layout.contentWidth,
    tablet: layout.contentWidth,
    default: layout.contentWidth,
  });

  const rows = useMemo(() => {
    return TURBINES.map((t) => ({
      t,
      ...turbineRowComputed(day, t),
    }));
  }, [day]);

  const totalProduction = rows.reduce((a, r) => a + (r.diff ?? 0), 0);
  const runningCount = rows.filter((r) => !r.isStopped && !r.hasError).length;
  const errorCount = rows.filter((r) => r.hasError).length;
  const activeRows = rows.filter((r) => !r.isStopped && r.mwPerHr !== null);
  const averageMwPerHr =
    activeRows.length > 0
      ? activeRows.reduce((sum, row) => sum + (row.mwPerHr ?? 0), 0) /
        activeRows.length
      : 0;
  const averageOutputText = useMemo(
    () => formatPower(averageMwPerHr, unitsConfig, { display: "smart" }),
    [averageMwPerHr, unitsConfig],
  );
  const turbinesSnapshot = useMemo(
    () =>
      JSON.stringify(
        TURBINES.map((turbine) => ({
          turbine,
          previous: day.turbines[turbine]?.previous ?? "",
          present: day.turbines[turbine]?.present ?? "",
          hours: day.turbines[turbine]?.hours ?? "24",
        })),
      ),
    [day.turbines],
  );
  const [originalTurbinesSnapshot, setOriginalTurbinesSnapshot] =
    useState(turbinesSnapshot);
  const snapshotDateKeyRef = useRef(dateKey);
  const wasLoadingRef = useRef(loading);

  useEffect(() => {
    const finishedLoading = wasLoadingRef.current && !loading;
    const dateChanged = snapshotDateKeyRef.current !== dateKey;

    if (!loading && (finishedLoading || dateChanged)) {
      snapshotDateKeyRef.current = dateKey;
      setOriginalTurbinesSnapshot(turbinesSnapshot);
    }

    wasLoadingRef.current = loading;
  }, [dateKey, loading, turbinesSnapshot]);

  const hasChanges =
    snapshotDateKeyRef.current === dateKey &&
    turbinesSnapshot !== originalTurbinesSnapshot;

  const handleCopyPreviousToPresent = useCallback(
    (turbine: string) => {
      const previousValue = day.turbines[turbine]?.previous;
      if (
        previousValue === undefined ||
        previousValue === null ||
        previousValue.trim() === ""
      ) {
        showInfo(translate("no_previous_to_copy"));
        return;
      }
      setDay((prev) => ({
        ...prev,
        turbines: {
          ...prev.turbines,
          [turbine]: { ...prev.turbines[turbine], present: previousValue },
        },
      }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showSuccess(translate("copied_to_present"));
    },
    [day.turbines, setDay, translate],
  );

  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);

  const handleSave = useCallback(async () => {
    if (saveLockRef.current || isSaving || !hasChanges) return;
    saveLockRef.current = true;
    setIsSaving(true);

    try {
      await saveDay();
      setOriginalTurbinesSnapshot(turbinesSnapshot);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess(translate("msg_saved_success"));
    } catch {
      showError(translate("msg_error_generic"));
    } finally {
      setIsSaving(false);
      saveLockRef.current = false;
    }
  }, [hasChanges, isSaving, saveDay, translate, turbinesSnapshot]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetDay();
    showSuccess(translate("msg_reset_done"));
  }, [resetDay, translate]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoursPickerTurbine, setHoursPickerTurbine] = useState<string | null>(
    null,
  );
  const dayLetter = getShiftForDate(dateKey);
  const shiftBadgeLabel = formatShiftBadgeLabel(dayLetter, language, translate);

  const handleSetToday = useCallback(() => {
    setDateKey(todayKey());
    setShowDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setDateKey]);

  const handleDateChange = useCallback(
    (days: number) => {
      const current = new Date(dateKey);
      if (isNaN(current.getTime())) {
        handleSetToday();
        return;
      }
      current.setDate(current.getDate() + days);
      setDateKey(formatDateKey(current));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [dateKey, handleSetToday, setDateKey],
  );

  const previousChangeByTurbine = useMemo(() => {
    const pairs = TURBINES.map(
      (turbine) =>
        [
          turbine,
          (value: string) =>
            setDay((prev) => ({
              ...prev,
              turbines: {
                ...prev.turbines,
                [turbine]: { ...prev.turbines[turbine], previous: value },
              },
            })),
        ] as const,
    );

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const presentChangeByTurbine = useMemo(() => {
    const pairs = TURBINES.map(
      (turbine) =>
        [
          turbine,
          (value: string) =>
            setDay((prev) => ({
              ...prev,
              turbines: {
                ...prev.turbines,
                [turbine]: { ...prev.turbines[turbine], present: value },
              },
            })),
        ] as const,
    );

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const hoursChangeByTurbine = useMemo(() => {
    const pairs = TURBINES.map(
      (turbine) =>
        [
          turbine,
          (value: string) =>
            setDay((prev) => ({
              ...prev,
              turbines: {
                ...prev.turbines,
                [turbine]: { ...prev.turbines[turbine], hours: value },
              },
            })),
        ] as const,
    );

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const turbineSummaryCols = useMemo(
    () =>
      [
        {
          key: "meter",
          label: translate("turbine"),
          flex: 0.9,
          isNumeric: false,
        },
        {
          key: "prev",
          label: translate("previous"),
          flex: 1.1,
          isNumeric: true,
        },
        {
          key: "pres",
          label: translate("present"),
          flex: 1.1,
          isNumeric: true,
        },
        { key: "diff", label: translate("diff"), flex: 1.1, isNumeric: true },
      ] as const,
    [translate],
  );
  const displayTurbineSummaryCols = useMemo(
    () => (isRTL ? [...turbineSummaryCols].reverse() : turbineSummaryCols),
    [turbineSummaryCols, isRTL],
  );

  const isToday = dateKey === todayKey();
  const selectedHoursValue = hoursPickerTurbine
    ? day.turbines[hoursPickerTurbine]?.hours || "24"
    : "24";
  const overviewItems = [
    {
      key: "running",
      label: translate("overview_active"),
      value: runningCount,
      tone: theme.success,
    },
    {
      key: "errors",
      label: translate("overview_errors"),
      value: errorCount,
      tone: theme.error,
    },
    {
      key: "average",
      label: translate("overview_average"),
      value: averageOutputText.valueText,
      unit: `${averageOutputText.unitText}/h`,
      tone: theme.primary,
    },
  ] as const;

  const handleOpenHoursPicker = useCallback((turbine: string) => {
    setHoursPickerTurbine(turbine);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCloseHoursPicker = useCallback(() => {
    setHoursPickerTurbine(null);
  }, []);

  const handleDoneHoursPicker = useCallback(
    (value: string) => {
      if (hoursPickerTurbine) {
        hoursChangeByTurbine[hoursPickerTurbine]?.(value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setHoursPickerTurbine(null);
    },
    [hoursChangeByTurbine, hoursPickerTurbine],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <DashboardBackdrop intensity="subtle" />
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={scrollContentStyle}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.headerRow}>
          <View
            style={[
              styles.topControlCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
              tabletLargeSurfaceShadowStyle,
            ]}
          >
            <View style={[styles.dateNavigationRow, rtlRow]}>
              <PressableScale
                style={[
                  styles.dateNavButton,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleDateChange(isRTL ? 1 : -1)}
                testID="button-date-prev"
              >
                <Feather
                  name={isRTL ? "chevron-right" : "chevron-left"}
                  size={18}
                  color={theme.text}
                />
              </PressableScale>
              <Pressable
                style={[
                  styles.dateDisplayButton,
                  rtlRow,
                  {
                    borderColor: theme.primary + "35",
                    backgroundColor: theme.primary + "10",
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
                testID="button-date"
              >
                <Feather name="calendar" size={18} color={theme.primary} />
                <ThemedText
                  semanticVariant="button"
                  style={{ color: theme.primary }}
                >
                  {isToday ? translate("today") : dateKey}
                </ThemedText>
              </Pressable>
              <PressableScale
                style={[
                  styles.dateNavButton,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleDateChange(isRTL ? -1 : 1)}
                testID="button-date-next"
              >
                <Feather
                  name={isRTL ? "chevron-left" : "chevron-right"}
                  size={18}
                  color={theme.text}
                />
              </PressableScale>
            </View>

            <View
              style={[styles.headerDivider, { backgroundColor: theme.border }]}
            />

            <View
              style={[
                styles.controlBar,
                layout.isCompactPhone && styles.controlBarCompact,
                rtlRow,
                {
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
            >
              <View
                style={[
                  styles.controlBarShiftPane,
                  layout.isCompactPhone && styles.controlBarShiftPaneCompact,
                ]}
              >
                <View
                  style={[
                    styles.controlSegment,
                    styles.controlSegmentStatic,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText
                    semanticVariant="tableCellLabel"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.8}
                    style={{ color: theme.textSecondary }}
                  >
                    {shiftBadgeLabel}
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.controlBarActionsPane,
                  layout.isCompactPhone && styles.controlBarActionsPaneCompact,
                  rtlRow,
                ]}
              >
                <View style={styles.controlBarActionSlot}>
                  <PressableScale
                    style={[
                      styles.controlSegment,
                      styles.controlBarActionButton,
                      {
                        backgroundColor: theme.error + "16",
                        borderColor: theme.error + "32",
                      },
                    ]}
                    onPress={handleReset}
                    testID="button-reset"
                  >
                    <View style={[styles.segmentContent, rtlRow]}>
                      <Feather
                        name="rotate-ccw"
                        size={14}
                        color={theme.error}
                      />
                      <ThemedText
                        semanticVariant="labelPrimary"
                        style={{ color: theme.error }}
                      >
                        {translate("reset")}
                      </ThemedText>
                    </View>
                  </PressableScale>
                </View>
                <View style={styles.controlBarActionSlot}>
                  <PressableScale
                    style={[
                      styles.controlSegment,
                      styles.controlBarActionButton,
                      hasChanges
                        ? {
                            ...Shadows.fab,
                            shadowColor: theme.primary,
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          }
                        : {
                            backgroundColor: theme.backgroundSecondary,
                            borderColor: theme.border,
                            shadowOpacity: 0,
                            elevation: 0,
                          },
                      (isSaving || !hasChanges || loading) &&
                        styles.controlSegmentDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={isSaving || !hasChanges || loading}
                    testID="button-save"
                  >
                    {isSaving ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.buttonText}
                      />
                    ) : (
                      <View style={[styles.segmentContent, rtlRow]}>
                        <Feather
                          name="save"
                          size={14}
                          color={
                            hasChanges ? theme.buttonText : theme.textSecondary
                          }
                        />
                        <ThemedText
                          semanticVariant="labelPrimary"
                          style={{
                            color: hasChanges
                              ? theme.buttonText
                              : theme.textSecondary,
                          }}
                        >
                          {translate("save")}
                        </ThemedText>
                        {hasChanges ? (
                          <View
                            style={[
                              styles.unsavedDot,
                              { backgroundColor: theme.buttonText },
                            ]}
                          />
                        ) : null}
                      </View>
                    )}
                  </PressableScale>
                </View>
              </View>
            </View>
          </View>
        </View>

        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[
            styles.overviewCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
            tabletLargeSurfaceShadowStyle,
          ]}
        >
          <View style={[styles.overviewHeader, rtlRow]}>
            <View style={[styles.overviewTitleWrap, rtlRow]}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.primary + "14" },
                ]}
              >
                <Feather name="activity" size={18} color={theme.primary} />
              </View>
              <View style={styles.overviewTextBlock}>
                <ThemedText semanticVariant="sectionTitle">
                  {translate("overview_title")}
                </ThemedText>
                <ThemedText
                  semanticVariant="helper"
                  style={{ color: theme.textSecondary }}
                >
                  {translate("quick_entry_hint")}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.overviewGrid}>
            {overviewItems.map((item) => (
              <View
                key={item.key}
                style={[
                  styles.overviewItem,
                  showTabletLayout && styles.overviewItemTablet,
                  { backgroundColor: item.tone + "10" },
                ]}
              >
                <OverviewStatCardContent
                  label={item.label}
                  value={item.value}
                  unit={"unit" in item ? item.unit : undefined}
                  toneColor={item.tone}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={[
              styles.modalOverlay,
              { backgroundColor: withAlpha(theme.backgroundRoot, 0.6) },
            ]}
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.datePickerModal,
                showWideGrid && styles.datePickerModalTablet,
                {
                  width: datePickerModalWidth,
                },
              ]}
            >
              <CalendarPicker
                selectedDate={dateKey}
                onSelectDate={setDateKey}
                onClose={() => setShowDatePicker(false)}
              />
            </Pressable>
          </Pressable>
        </Modal>

        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
            operationSectionTabletStyle,
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
              <Feather name="wind" size={18} color={theme.primary} />
            </View>
            <ThemedText semanticVariant="sectionTitle">
              {translate("turbines_title")}
            </ThemedText>
          </View>

          <View
            style={
              showTabletLayout
                ? [styles.tabletGrid, operationGridTabletStyle]
                : undefined
            }
          >
            {TURBINES.map((t, index) => {
              const row = rows[index];
              const statusColor = row.isStopped
                ? theme.warning
                : row.hasError
                  ? theme.error
                  : theme.success;
              const statusLabel = row.isStopped
                ? translate("status_needs_input")
                : row.hasError
                  ? translate("status_check_values")
                  : translate("status_running");
              return (
                <View
                  key={t}
                  style={
                    showTabletLayout
                      ? [styles.tabletGridItem, operationGridItemTabletStyle]
                      : undefined
                  }
                >
                  <Animated.View
                    entering={FadeInDown.delay(index * 50).duration(300)}
                    style={[
                      styles.turbineRow,
                      showTabletLayout && operationCardTabletStyle,
                      {
                        borderColor:
                          showTabletLayout && !isDark
                            ? withAlpha(statusColor, 0.22)
                            : statusColor + "40",
                        backgroundColor: theme.backgroundDefault,
                      },
                    ]}
                  >
                    <View style={[styles.turbineLabelRow, rtlRow]}>
                      <View
                        style={[
                          styles.turbineTitleGroup,
                          isRTL && styles.turbineTitleGroupRTL,
                        ]}
                      >
                        <View
                          style={[
                            styles.turbineBadge,
                            { backgroundColor: statusColor + "20" },
                          ]}
                        >
                          <FeederCode
                            code={t}
                            style={[
                              styles.turbineBadgeCode,
                              { color: statusColor },
                            ]}
                          />
                        </View>
                        <View
                          style={[
                            styles.turbineLabel,
                            styles.turbineLabelTextRow,
                            isRTL && styles.turbineLabelTextRowRTL,
                          ]}
                        >
                          <ThemedText
                            semanticVariant="labelSecondary"
                            numberOfLines={1}
                            style={styles.turbineLabelText}
                          >
                            {translate("turbine")}
                          </ThemedText>
                          <FeederCode
                            code={t}
                            style={[
                              styles.turbineInlineCode,
                              isRTL && styles.turbineInlineCodeRTL,
                            ]}
                          />
                        </View>
                      </View>
                      <View
                        style={[styles.rowMeta, isRTL && styles.rowMetaRTL]}
                      >
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: statusColor + "14",
                              borderColor: statusColor + "30",
                            },
                          ]}
                        >
                          <ThemedText
                            semanticVariant="tableCellLabel"
                            style={{ color: statusColor }}
                          >
                            {statusLabel}
                          </ThemedText>
                        </View>
                        <HoursChip
                          label={translate("hours")}
                          value={day.turbines[t]?.hours || "24"}
                          onPress={() => handleOpenHoursPicker(t)}
                          testID={`input-${t}-hours`}
                        />
                      </View>
                    </View>

                    <View
                      style={[styles.inputsRow, isRTL && styles.inputsRowRTL]}
                    >
                      <View style={styles.readingInputWrap}>
                        <NumericInputField
                          label={translate("previous")}
                          value={day.turbines[t]?.previous || ""}
                          onChangeValue={previousChangeByTurbine[t]}
                          testID={`input-${t}-previous`}
                          isInvalid={
                            row.isStopped &&
                            parseReading(day.turbines[t]?.previous) === null
                          }
                          labelStyle={pairedInputTextStyle}
                          textStyle={pairedInputTextStyle}
                        />
                      </View>
                      <Pressable
                        style={[
                          styles.copyArrowButton,
                          { backgroundColor: theme.primary + "20" },
                        ]}
                        onPress={() => handleCopyPreviousToPresent(t)}
                        testID={`copy-${t}`}
                      >
                        <View
                          style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                        >
                          <Feather
                            name="arrow-right"
                            size={16}
                            color={theme.primary}
                          />
                        </View>
                      </Pressable>
                      <View style={styles.readingInputWrap}>
                        <NumericInputField
                          label={translate("present")}
                          value={day.turbines[t]?.present || ""}
                          onChangeValue={presentChangeByTurbine[t]}
                          testID={`input-${t}-present`}
                          isInvalid={
                            row.isStopped &&
                            parseReading(day.turbines[t]?.present) === null
                          }
                          labelStyle={pairedInputTextStyle}
                          textStyle={pairedInputTextStyle}
                        />
                      </View>
                    </View>

                    <View style={styles.resultsRow}>
                      <View
                        style={[
                          styles.resultBox,
                          {
                            backgroundColor: theme.primary + "15",
                            borderColor: theme.primary + "40",
                          },
                        ]}
                      >
                        <ThemedText
                          semanticVariant="tableHeader"
                          style={{ color: theme.primary }}
                        >
                          {translate("difference")}
                        </ThemedText>
                        <View style={styles.valueWithUnitRow}>
                          <NumberText
                            tier="output"
                            style={[
                              styles.inlineNumericValue,
                              { color: theme.text },
                            ]}
                          >
                            {row.diff === null ? "-" : format2(row.diff)}
                          </NumberText>
                          <ThemedText
                            semanticVariant="unit"
                            style={{
                              color: theme.textSecondary,
                              opacity: 0.88,
                            }}
                          >
                            {translate("mwh")}
                          </ThemedText>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.resultBox,
                          {
                            backgroundColor: theme.success + "15",
                            borderColor: theme.success + "40",
                          },
                        ]}
                      >
                        <ThemedText
                          semanticVariant="tableHeader"
                          style={{ color: theme.success }}
                        >
                          {translate("mw_per_hr")}
                        </ThemedText>
                        <NumberText
                          tier="output"
                          style={[
                            styles.inlineNumericValue,
                            { color: theme.text },
                          ]}
                        >
                          {row.mwPerHr === null ? "-" : format2(row.mwPerHr)}
                        </NumberText>
                      </View>
                    </View>

                    <View style={[styles.rowFootnote, rtlRow]}>
                      <Feather
                        name={
                          row.isStopped
                            ? "alert-circle"
                            : row.hasError
                              ? "alert-triangle"
                              : "check-circle"
                        }
                        size={14}
                        color={statusColor}
                      />
                      <ThemedText
                        semanticVariant="helper"
                        style={{ color: theme.textSecondary }}
                      >
                        {row.isStopped
                          ? translate("no_reading_stopped")
                          : row.hasError
                            ? translate("turbine_error")
                            : translate("status_ready")}
                      </ThemedText>
                    </View>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250).duration(300)}
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.success + "15",
              borderColor: theme.success,
            },
            tabletSummaryCardShadowStyle,
          ]}
        >
          <View
            style={[
              styles.summaryIconCircle,
              { backgroundColor: theme.success + "20" },
            ]}
          >
            <Feather name="zap" size={28} color={theme.success} />
          </View>
          <ThemedText
            semanticVariant="labelPrimary"
            style={{ color: theme.success, marginTop: Spacing.md }}
          >
            {translate("total_generation")}
          </ThemedText>
          <NumberText
            tier="final"
            weight="bold"
            style={{
              color: theme.success,
              marginTop: Spacing.xs,
            }}
          >
            {format2(Math.abs(totalProduction))}
          </NumberText>
          <ThemedText
            semanticVariant="helper"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            {translate("mwh")}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
            tabletLargeSurfaceShadowStyle,
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
              <Feather name="list" size={18} color={theme.primary} />
            </View>
            <ThemedText semanticVariant="sectionTitle">
              {translate("turbines_summary")}
            </ThemedText>
          </View>

          <ScrollView
            horizontal={!showWideGrid}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              !showWideGrid ? styles.summaryTableScroll : undefined
            }
          >
            <View
              style={[
                styles.summaryTable,
                !showWideGrid && { minWidth: summaryTableMinWidth },
              ]}
            >
              <View
                style={[
                  styles.summaryHeaderRow,
                  { borderBottomColor: theme.border },
                ]}
              >
                {displayTurbineSummaryCols.map((col) => (
                  <View
                    key={col.key}
                    style={[styles.summaryCell, { flex: col.flex }]}
                  >
                    <ThemedText
                      semanticVariant="tableHeader"
                      numberOfLines={1}
                      style={[
                        styles.summaryHeaderText,
                        { color: theme.textSecondary, textAlign: "center" },
                      ]}
                    >
                      {col.label}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {rows.map((r, index) => {
                const values = {
                  meter: r.t,
                  prev:
                    r.prev === null
                      ? "-"
                      : formatNumber(Math.abs(r.prev), {
                          decimals: 2,
                          thousandsSeparator: true,
                        }),
                  pres:
                    r.pres === null
                      ? "-"
                      : formatNumber(Math.abs(r.pres), {
                          decimals: 2,
                          thousandsSeparator: true,
                        }),
                  diff:
                    r.diff === null
                      ? "-"
                      : formatNumber(Math.abs(r.diff), {
                          decimals: 2,
                          thousandsSeparator: true,
                        }),
                } as const;

                return (
                  <View
                    key={r.t}
                    style={[
                      styles.summaryDataRow,
                      index < rows.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    {displayTurbineSummaryCols.map((col) => (
                      <View
                        key={col.key}
                        style={[styles.summaryCell, { flex: col.flex }]}
                      >
                        {col.key === "meter" ? (
                          <View
                            style={[
                              styles.turbineBadgeSmall,
                              { backgroundColor: theme.success + "20" },
                            ]}
                          >
                            <FeederCode
                              code={values.meter}
                              style={[
                                styles.turbineBadgeCodeSmall,
                                { color: theme.success },
                              ]}
                            />
                          </View>
                        ) : (
                          <NumberText
                            tier="summary"
                            numberOfLines={1}
                            style={[
                              styles.summaryValueText,
                              col.key === "diff"
                                ? { color: theme.primary }
                                : { color: theme.text },
                            ]}
                          >
                            {values[col.key]}
                          </NumberText>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <HoursPickerSheet
        visible={hoursPickerTurbine !== null}
        value={selectedHoursValue}
        turbineLabel={hoursPickerTurbine ?? undefined}
        onCancel={handleCloseHoursPicker}
        onDone={handleDoneHoursPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    marginBottom: Spacing.lg,
  },
  topControlCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  dateNavigationRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    padding: 0,
    gap: Spacing.sm,
  },
  controlBarCompact: {
    alignItems: "stretch",
    flexWrap: "wrap",
  },
  headerDivider: {
    height: 1,
    width: "100%",
    opacity: 0.9,
  },
  controlBarShiftPane: {
    flex: 1,
  },
  controlBarShiftPaneCompact: {
    flexBasis: "100%",
  },
  controlBarActionsPane: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  controlBarActionsPaneCompact: {
    width: "100%",
  },
  controlBarActionSlot: {
    flex: 1,
  },
  controlSegment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlSegmentStatic: {
    justifyContent: "center",
  },
  controlBarActionButton: {
    width: "100%",
  },
  controlSegmentDisabled: {
    opacity: 0.58,
  },
  segmentContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overviewCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  overviewTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  overviewTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  overviewItem: {
    flexGrow: 1,
    flexBasis: 110,
    minHeight: 78,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewItemTablet: {
    flexBasis: 0,
    minWidth: 180,
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
  tabletGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: Spacing.md,
  },
  tabletGridItem: {
    width: "48%",
    flexBasis: "48%",
    minWidth: 320,
  },
  turbineRow: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    margin: Spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  turbineLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  } as const,
  turbineTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  turbineTitleGroupRTL: {
    flexDirection: "row-reverse",
  },
  turbineBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  turbineBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  turbineLabel: {
    flex: 1,
    minWidth: 0,
  },
  turbineLabelTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  turbineLabelTextRowRTL: {
    flexDirection: "row-reverse",
  },
  turbineLabelText: {
    flexShrink: 1,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rowMetaRTL: {
    flexDirection: "row-reverse",
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  turbineInlineCode: {
    marginLeft: Spacing.xs,
    fontSize: 15,
    lineHeight: 22,
  },
  turbineInlineCodeRTL: {
    marginLeft: 0,
    marginRight: Spacing.xs,
  },
  turbineBadgeCode: {
    fontSize: 14,
    lineHeight: 20,
  },
  turbineBadgeCodeSmall: {
    fontSize: 13,
    lineHeight: 18,
  },
  copyArrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 20,
  },
  inputsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  inputsRowRTL: {
    flexDirection: "row-reverse",
  },
  readingInputWrap: {
    flex: 1,
    minWidth: 0,
    flexBasis: 0,
  },
  inputGroup: {
    flex: 1,
  },
  resultsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  resultBox: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 96,
  },
  rowFootnote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  valueWithUnitRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
    writingDirection: "ltr",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
    minHeight: 196,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  summaryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  summaryDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  summaryCell: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
  },
  summaryHeaderText: {
    textAlign: "center",
  },
  summaryValueText: {
    textAlign: "center",
    fontVariant: ["tabular-nums", "lining-nums"],
  },
  summaryTable: {
    width: "100%",
  },
  summaryTableScroll: {
    minWidth: "100%",
  },
  inlineNumericValue: {
    textAlign: "center",
    fontVariant: ["tabular-nums", "lining-nums"],
  },
  dateDisplayButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  dateNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  datePickerModal: {
    width: "100%",
    maxWidth: 420,
  },
  datePickerModalTablet: {
    maxWidth: 760,
  },
});

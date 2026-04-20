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
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { CalendarPicker } from "@/components/CalendarPicker";
import { NumericInputField } from "@/components/NumericInputField";
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
import { useRTL } from "@/hooks/useRTL";
import {
  FEEDERS,
  feederRowComputed,
  format2,
  formatDateKey,
  todayKey,
  parseReading,
  formatNumber,
} from "@/lib/storage";
import { getShiftForDate } from "@/lib/shift";
import { showSuccess, showError, showInfo } from "@/utils/notify";
import { formatShiftBadgeLabel } from "@/utils/shiftBadgeLabel";

export default function FeedersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const { dateKey, setDateKey, day, setDay, saveDay, resetDay, loading } =
    useDay();
  const { t, isRTL, language } = useLanguage();
  const pairedInputTextStyle = useMemo(
    () => ({
      writingDirection: isRTL ? ("rtl" as const) : ("ltr" as const),
      textAlign: isRTL ? ("right" as const) : ("left" as const),
    }),
    [isRTL],
  );
  const { rtlRow } = useRTL();
  const showWideGrid = layout.isWideLayout;
  const scrollContentStyle = useMemo(
    () =>
      getResponsiveScrollContentStyle(layout, {
        headerHeight,
        tabBarHeight,
        topSpacing: Spacing.lg,
        bottomSpacing: Spacing.xl,
      }),
    [headerHeight, layout, tabBarHeight],
  );
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
    return FEEDERS.map((f) => {
      const computed = feederRowComputed(day, f);
      return { f, ...computed };
    });
  }, [day]);

  const total = rows.reduce((a, r) => a + (r.diff ?? 0), 0);
  const isExport = total >= 0;
  const completedCount = rows.filter((r) => !r.isStopped).length;
  const feedersSnapshot = useMemo(
    () =>
      JSON.stringify(
        FEEDERS.map((feeder) => ({
          feeder,
          start: day.feeders[feeder]?.start ?? "",
          end: day.feeders[feeder]?.end ?? "",
        })),
      ),
    [day.feeders],
  );
  const [originalFeedersSnapshot, setOriginalFeedersSnapshot] =
    useState(feedersSnapshot);
  const snapshotDateKeyRef = useRef(dateKey);
  const wasLoadingRef = useRef(loading);

  useEffect(() => {
    const finishedLoading = wasLoadingRef.current && !loading;
    const dateChanged = snapshotDateKeyRef.current !== dateKey;

    if (!loading && (finishedLoading || dateChanged)) {
      snapshotDateKeyRef.current = dateKey;
      setOriginalFeedersSnapshot(feedersSnapshot);
    }

    wasLoadingRef.current = loading;
  }, [dateKey, feedersSnapshot, loading]);

  const hasChanges =
    snapshotDateKeyRef.current === dateKey &&
    feedersSnapshot !== originalFeedersSnapshot;

  const handleCopyStartToEnd = useCallback(
    (f: string) => {
      const startValue = day.feeders[f]?.start;
      if (
        startValue === undefined ||
        startValue === null ||
        startValue.trim() === ""
      ) {
        showInfo(t("no_start_to_copy"));
        return;
      }
      setDay((prev) => ({
        ...prev,
        feeders: {
          ...prev.feeders,
          [f]: { ...prev.feeders[f], end: startValue },
        },
      }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showSuccess(t("copied_to_end"));
    },
    [day.feeders, setDay, t],
  );

  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);

  const handleSave = useCallback(async () => {
    if (saveLockRef.current || isSaving || !hasChanges) return;
    saveLockRef.current = true;
    setIsSaving(true);

    try {
      await saveDay();
      setOriginalFeedersSnapshot(feedersSnapshot);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess(t("msg_saved_success"));
    } catch {
      showError(t("msg_error_generic"));
    } finally {
      setIsSaving(false);
      saveLockRef.current = false;
    }
  }, [feedersSnapshot, hasChanges, isSaving, saveDay, t]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetDay();
    showSuccess(t("msg_reset_done"));
  }, [resetDay, t]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dayLetter = getShiftForDate(dateKey);
  const shiftBadgeLabel = formatShiftBadgeLabel(dayLetter, language, t);

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

  const startChangeByFeeder = useMemo(() => {
    const pairs = FEEDERS.map(
      (feeder) =>
        [
          feeder,
          (value: string) =>
            setDay((prev) => ({
              ...prev,
              feeders: {
                ...prev.feeders,
                [feeder]: { ...prev.feeders[feeder], start: value },
              },
            })),
        ] as const,
    );

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const endChangeByFeeder = useMemo(() => {
    const pairs = FEEDERS.map(
      (feeder) =>
        [
          feeder,
          (value: string) =>
            setDay((prev) => ({
              ...prev,
              feeders: {
                ...prev.feeders,
                [feeder]: { ...prev.feeders[feeder], end: value },
              },
            })),
        ] as const,
    );

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const feederSummaryCols = useMemo(
    () =>
      [
        { key: "meter", label: t("feeder"), flex: 0.9, isNumeric: false },
        { key: "start", label: t("start"), flex: 1.1, isNumeric: true },
        { key: "end", label: t("end"), flex: 1.1, isNumeric: true },
        { key: "diff", label: t("diff"), flex: 1.1, isNumeric: true },
      ] as const,
    [t],
  );
  const displayFeederSummaryCols = useMemo(
    () => (isRTL ? [...feederSummaryCols].reverse() : feederSummaryCols),
    [feederSummaryCols, isRTL],
  );

  const isToday = dateKey === todayKey();
  const overviewItems = [
    {
      key: "active",
      label: t("overview_active"),
      value: completedCount,
      tone: theme.primary,
    },
    {
      key: "stopped",
      label: t("overview_stopped"),
      value: FEEDERS.length - completedCount,
      tone: theme.warning,
    },
    {
      key: "flow",
      label: t("overview_net_flow"),
      value: `${isExport ? "" : "-"}${format2(Math.abs(total))}`,
      unit: t("mw_unit"),
      tone: isExport ? theme.success : theme.error,
    },
  ] as const;

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
                  {isToday ? t("today") : dateKey}
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
                        {t("reset")}
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
                          {t("save")}
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
                <Feather name="sliders" size={18} color={theme.primary} />
              </View>
              <View style={styles.overviewTextBlock}>
                <ThemedText semanticVariant="sectionTitle">
                  {t("overview_title")}
                </ThemedText>
                <ThemedText
                  semanticVariant="helper"
                  style={{ color: theme.textSecondary }}
                >
                  {t("quick_entry_hint")}
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
                  { backgroundColor: item.tone + "10" },
                ]}
              >
                <OverviewStatCardContent
                  label={item.label}
                  value={item.value}
                  unit={item.key === "flow" ? item.unit : undefined}
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
              <Feather name="activity" size={18} color={theme.primary} />
            </View>
            <ThemedText semanticVariant="sectionTitle">
              {t("feeders_title")}
            </ThemedText>
          </View>

          <View style={showWideGrid ? styles.tabletGrid : undefined}>
            {FEEDERS.map((f, index) => {
              const row = rows[index];
              return (
                <Animated.View
                  key={f}
                  entering={FadeInDown.delay(index * 50).duration(300)}
                  style={[
                    styles.feederRow,
                    showWideGrid && styles.tabletFeederRow,
                    {
                      borderColor: row.isStopped
                        ? theme.warning + "40"
                        : theme.border,
                      backgroundColor: theme.backgroundDefault,
                    },
                  ]}
                >
                  <View style={[styles.feederLabelRow, rtlRow]}>
                    <View
                      style={[
                        styles.feederTitleGroup,
                        isRTL && styles.feederTitleGroupRTL,
                      ]}
                    >
                      <View
                        style={[
                          styles.feederBadge,
                          { backgroundColor: theme.primary + "20" },
                        ]}
                      >
                        <FeederCode
                          code={f}
                          style={[
                            styles.feederBadgeCode,
                            { color: theme.primary },
                          ]}
                        />
                      </View>
                      <View
                        style={[
                          styles.feederLabel,
                          styles.feederLabelTextRow,
                          isRTL && styles.feederLabelTextRowRTL,
                        ]}
                      >
                        <ThemedText
                          semanticVariant="labelSecondary"
                          numberOfLines={1}
                          style={styles.feederLabelText}
                        >
                          {t("feeder")}
                        </ThemedText>
                        <FeederCode
                          code={f}
                          style={[
                            styles.feederInlineCode,
                            isRTL && styles.feederInlineCodeRTL,
                          ]}
                        />
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            (row.isStopped ? theme.warning : theme.success) +
                            "14",
                          borderColor:
                            (row.isStopped ? theme.warning : theme.success) +
                            "30",
                        },
                      ]}
                    >
                      <ThemedText
                        semanticVariant="tableCellLabel"
                        style={{
                          color: row.isStopped ? theme.warning : theme.success,
                        }}
                      >
                        {row.isStopped
                          ? t("status_needs_input")
                          : t("status_complete")}
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={[styles.inputsRow, isRTL && styles.inputsRowRTL]}
                  >
                    <View style={styles.readingInputWrap}>
                      <NumericInputField
                        label={t("start_of_day")}
                        value={day.feeders[f]?.start || ""}
                        onChangeValue={startChangeByFeeder[f]}
                        testID={`input-${f}-start`}
                        isInvalid={
                          row.isStopped &&
                          parseReading(day.feeders[f]?.start) === null
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
                      onPress={() => handleCopyStartToEnd(f)}
                      testID={`copy-${f}`}
                    >
                      <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                        <Feather
                          name="arrow-right"
                          size={16}
                          color={theme.primary}
                        />
                      </View>
                    </Pressable>
                    <View style={styles.readingInputWrap}>
                      <NumericInputField
                        label={t("end_of_day")}
                        value={day.feeders[f]?.end || ""}
                        onChangeValue={endChangeByFeeder[f]}
                        testID={`input-${f}-end`}
                        isInvalid={
                          row.isStopped &&
                          parseReading(day.feeders[f]?.end) === null
                        }
                        labelStyle={pairedInputTextStyle}
                        textStyle={pairedInputTextStyle}
                      />
                    </View>
                  </View>

                  <View
                    style={[
                      styles.diffBox,
                      {
                        backgroundColor: theme.primary + "15",
                        borderColor: theme.primary + "40",
                      },
                    ]}
                  >
                    <ThemedText
                      semanticVariant="labelSecondary"
                      style={{ color: theme.primary }}
                    >
                      {t("difference")}
                    </ThemedText>
                    <ValueWithUnit
                      value={row.diff === null ? "-" : format2(row.diff)}
                      unit={t("mw_unit")}
                      type="h3"
                      valueStyle={{
                        ...styles.inlineNumericValue,
                        color: theme.text,
                      }}
                      unitStyle={{ color: theme.textSecondary }}
                    />
                  </View>

                  <View style={[styles.rowFootnote, rtlRow]}>
                    <Feather
                      name={row.isStopped ? "alert-circle" : "check-circle"}
                      size={14}
                      color={row.isStopped ? theme.warning : theme.success}
                    />
                    <ThemedText
                      semanticVariant="helper"
                      style={{ color: theme.textSecondary }}
                    >
                      {row.isStopped
                        ? t("no_reading_stopped")
                        : t("status_ready")}
                    </ThemedText>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250).duration(300)}
          style={[
            styles.summaryCard,
            {
              backgroundColor: isExport
                ? theme.success + "15"
                : theme.error + "15",
              borderColor: isExport ? theme.success : theme.error,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIconCircle,
              {
                backgroundColor: isExport
                  ? theme.success + "20"
                  : theme.error + "20",
              },
            ]}
          >
            <Feather
              name={isExport ? "arrow-up-right" : "arrow-down-left"}
              size={28}
              color={isExport ? theme.success : theme.error}
            />
          </View>
          <ThemedText
            type="h4"
            style={{
              color: isExport ? theme.success : theme.error,
              fontWeight: "900",
              marginTop: Spacing.md,
            }}
          >
            {isExport ? t("export") : t("withdrawal")}
          </ThemedText>
          <NumberText
            tier="final"
            weight="bold"
            style={{
              color: isExport ? theme.success : theme.error,
              marginTop: Spacing.xs,
            }}
          >
            {format2(Math.abs(total))}
          </NumberText>
          <ThemedText
            semanticVariant="helper"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            {isExport ? t("positive_energy_flow") : t("negative_energy_flow")}
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
              {t("feeders_summary")}
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
                {displayFeederSummaryCols.map((col) => (
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
                  meter: r.f,
                  start:
                    r.start === null
                      ? "-"
                      : formatNumber(r.start, {
                          decimals: 2,
                          thousandsSeparator: true,
                        }),
                  end:
                    r.end === null
                      ? "-"
                      : formatNumber(r.end, {
                          decimals: 2,
                          thousandsSeparator: true,
                        }),
                  diff:
                    r.diff === null
                      ? "-"
                      : formatNumber(r.diff, {
                          decimals: 2,
                          thousandsSeparator: true,
                        }),
                } as const;

                return (
                  <View
                    key={r.f}
                    style={[
                      styles.summaryDataRow,
                      index < rows.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    {displayFeederSummaryCols.map((col) => (
                      <View
                        key={col.key}
                        style={[styles.summaryCell, { flex: col.flex }]}
                      >
                        {col.key === "meter" ? (
                          <View
                            style={[
                              styles.feederBadgeSmall,
                              { backgroundColor: theme.primary + "20" },
                            ]}
                          >
                            <FeederCode
                              code={values.meter}
                              style={[
                                styles.feederBadgeCodeSmall,
                                { color: theme.primary },
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
    padding: Spacing.sm,
  },
  tabletFeederRow: {
    width: "50%",
    padding: Spacing.sm,
  },
  feederRow: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    margin: Spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  feederLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  feederTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  feederTitleGroupRTL: {
    flexDirection: "row-reverse",
  },
  feederBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  feederBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  feederLabel: {
    flex: 1,
    minWidth: 0,
  },
  feederLabelTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  feederLabelTextRowRTL: {
    flexDirection: "row-reverse",
  },
  feederLabelText: {
    flexShrink: 1,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  feederInlineCode: {
    marginLeft: Spacing.xs,
    fontSize: 15,
    lineHeight: 22,
  },
  feederInlineCodeRTL: {
    marginLeft: 0,
    marginRight: Spacing.xs,
  },
  feederBadgeCode: {
    fontSize: 14,
    lineHeight: 20,
  },
  feederBadgeCodeSmall: {
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
  diffBox: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
});

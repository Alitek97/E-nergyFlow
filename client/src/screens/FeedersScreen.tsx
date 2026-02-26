import React, { useMemo, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import PressableScale from "@/components/ui/PressableScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { NumberText } from "@/components/NumberText";
import { CalendarPicker } from "@/components/CalendarPicker";
import { NumericInputField } from "@/components/NumericInputField";
import { useTheme } from "@/hooks/useTheme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";
import { FEEDERS, feederRowComputed, FeederComputed, format2, formatDateKey, todayKey, parseReading } from "@/lib/storage";
import { showSuccess, showError, showInfo } from "@/utils/notify";
import { formatShiftBadgeLabel } from "@/utils/shiftBadgeLabel";

function getDayLetter(dateStr: string): string {
  const letters = ["B", "D", "A", "C"];
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "A";
  const epoch = new Date("2026-01-18");
  const diffDays = Math.floor((date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % 3) + 3) % 3;
  return letters[index];
}

export default function FeedersScreen() {
  const renderCountRef = useRef(0);
  if (__DEV__) {
    renderCountRef.current += 1;
    console.log(`[render] FeedersScreen #${renderCountRef.current}`);
  }

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const { dateKey, setDateKey, day, setDay, saveDay, resetDay } = useDay();
  const { t, isRTL, language } = useLanguage();
  const pairedInputTextStyle = useMemo(
    () => ({
      writingDirection: isRTL ? "rtl" as const : "ltr" as const,
      textAlign: isRTL ? "right" as const : "left" as const,
    }),
    [isRTL]
  );
  const { rtlRow } = useRTL();

  const rows = useMemo(() => {
    return FEEDERS.map((f) => {
      const computed = feederRowComputed(day, f);
      return { f, ...computed };
    });
  }, [day]);

  const total = rows.reduce((a, r) => a + r.diff, 0);
  const allStopped = rows.every((r) => r.isStopped);
  const isExport = total >= 0;

  const handleCopyStartToEnd = useCallback((f: string) => {
    const startValue = day.feeders[f]?.start;
    if (startValue === undefined || startValue === null || startValue.trim() === "") {
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
  }, [day.feeders, setDay, t]);

  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);

  const handleSave = useCallback(async () => {
    if (saveLockRef.current || isSaving) return;
    saveLockRef.current = true;
    setIsSaving(true);

    try {
      await saveDay();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess(t("msg_saved_success"));
    } catch (error) {
      showError(t("msg_error_generic"));
    } finally {
      setIsSaving(false);
      saveLockRef.current = false;
    }
  }, [isSaving, saveDay, t]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetDay();
    showSuccess(t("msg_reset_done"));
  }, [resetDay, t]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dayLetter = getDayLetter(dateKey);
  const shiftBadgeLabel = formatShiftBadgeLabel(dayLetter, language, t);

  const handleSetToday = useCallback(() => {
    setDateKey(todayKey());
    setShowDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setDateKey]);

  const handleDateChange = useCallback((days: number) => {
    const current = new Date(dateKey);
    if (isNaN(current.getTime())) {
      handleSetToday();
      return;
    }
    current.setDate(current.getDate() + days);
    setDateKey(formatDateKey(current));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [dateKey, handleSetToday, setDateKey]);

  const startChangeByFeeder = useMemo(() => {
    const pairs = FEEDERS.map((feeder) => [
      feeder,
      (value: string) =>
        setDay((prev) => ({
          ...prev,
          feeders: {
            ...prev.feeders,
            [feeder]: { ...prev.feeders[feeder], start: value },
          },
        })),
    ] as const);

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const endChangeByFeeder = useMemo(() => {
    const pairs = FEEDERS.map((feeder) => [
      feeder,
      (value: string) =>
        setDay((prev) => ({
          ...prev,
          feeders: {
            ...prev.feeders,
            [feeder]: { ...prev.feeders[feeder], end: value },
          },
        })),
    ] as const);

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const isToday = dateKey === todayKey();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: layout.horizontalPadding,
          maxWidth: layout.isTablet ? layout.contentMaxWidth : undefined,
          alignSelf: layout.isTablet ? "center" : undefined,
          width: layout.isTablet ? "100%" : undefined,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={[styles.headerRow, rtlRow]}>
          <Pressable
            style={[styles.todayButton, rtlRow, { borderColor: theme.primary, backgroundColor: theme.primary + "10" }]}
            onPress={() => setShowDatePicker(true)}
            testID="button-date"
          >
            <Feather name="calendar" size={18} color={theme.primary} />
            <ThemedText semanticVariant="button" style={{ color: theme.primary }}>
              {isToday ? t("today") : dateKey}
            </ThemedText>
          </Pressable>

          <View style={[styles.actionButtons, rtlRow]}>
            <View style={[styles.letterCircle, { borderColor: theme.primary, backgroundColor: theme.primary + "10" }]}>
              <ThemedText
                semanticVariant="labelPrimary"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ color: theme.primary }}
              >
                {shiftBadgeLabel}
              </ThemedText>
            </View>
            <PressableScale
              style={[styles.circleButton, { backgroundColor: theme.error }]}
              onPress={handleReset}
              testID="button-reset"
            >
              <Feather name="rotate-ccw" size={20} color={theme.buttonText} />
            </PressableScale>
            <PressableScale
              style={[
                styles.circleButton,
                { ...Shadows.fab, shadowColor: theme.primary, backgroundColor: theme.primary },
                isSaving && { opacity: 0.6 },
              ]}
              onPress={handleSave}
              disabled={isSaving}
              testID="button-save"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <Feather name="save" size={20} color={theme.buttonText} />
              )}
            </PressableScale>
          </View>
        </View>

        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
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
          style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={[styles.cardHeader, rtlRow, { borderBottomColor: theme.border, gap: Spacing.md }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="activity" size={18} color={theme.primary} />
            </View>
            <ThemedText semanticVariant="sectionTitle">
              {t("feeders_title")}
            </ThemedText>
          </View>

          <View style={layout.isTablet ? styles.tabletGrid : undefined}>
            {FEEDERS.map((f, index) => {
              const row = rows[index];
              return (
                <Animated.View
                  key={f}
                  entering={FadeInDown.delay(index * 50).duration(300)}
                  style={[
                    styles.feederRow,
                    layout.isTablet && styles.tabletFeederRow,
                  ]}
                >
                  <View style={[styles.feederLabelRow, rtlRow]}>
                    <View style={[styles.feederTitleGroup, isRTL && styles.feederTitleGroupRTL]}>
                      <View style={[styles.feederBadge, { backgroundColor: theme.primary + "20" }]}>
                        <ThemedText semanticVariant="labelPrimary" style={{ color: theme.primary }}>
                          {f}
                        </ThemedText>
                      </View>
                      <ThemedText
                        semanticVariant="labelSecondary"
                        numberOfLines={1}
                        style={[
                          styles.feederLabel,
                          ["F2", "F3", "F4", "F5"].includes(f) && { fontSize: 16, lineHeight: 22, minHeight: 24 },
                        ]}
                      >
                        {t("feeder")} {f}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.inputsRow, isRTL && styles.inputsRowRTL]}>
                    <View style={styles.readingInputWrap}>
                      <NumericInputField
                        label={t("start_of_day")}
                        value={day.feeders[f]?.start || ""}
                        onChangeValue={startChangeByFeeder[f]}
                        testID={`input-${f}-start`}
                        isInvalid={row.isStopped && parseReading(day.feeders[f]?.start) === null}
                        labelStyle={pairedInputTextStyle}
                        textStyle={pairedInputTextStyle}
                      />
                    </View>
                    <Pressable
                      style={[styles.copyArrowButton, { backgroundColor: theme.primary + "20" }]}
                      onPress={() => handleCopyStartToEnd(f)}
                      testID={`copy-${f}`}
                    >
                      <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                        <Feather name="arrow-right" size={16} color={theme.primary} />
                      </View>
                    </Pressable>
                    <View style={styles.readingInputWrap}>
                      <NumericInputField
                        label={t("end_of_day")}
                        value={day.feeders[f]?.end || ""}
                        onChangeValue={endChangeByFeeder[f]}
                        testID={`input-${f}-end`}
                        isInvalid={row.isStopped && parseReading(day.feeders[f]?.end) === null}
                        labelStyle={pairedInputTextStyle}
                        textStyle={pairedInputTextStyle}
                      />
                    </View>
                  </View>

                  <View style={[styles.diffBox, { 
                    backgroundColor: theme.primary + "15", 
                    borderColor: theme.primary + "40" 
                  }]}>
                    <ThemedText semanticVariant="labelSecondary" style={{ color: theme.primary }}>
                      {t("difference")}
                    </ThemedText>
                    <View style={styles.valueWithUnitRow}>
                      <NumberText tier="output" style={{ color: theme.text }}>
                        {format2(row.diff)}
                      </NumberText>
                      <ThemedText semanticVariant="unit" style={{ color: theme.textSecondary }}>
                        {t("mw_unit")}
                      </ThemedText>
                    </View>
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
              backgroundColor: isExport ? theme.success + "15" : theme.error + "15",
              borderColor: isExport ? theme.success : theme.error,
            },
          ]}
        >
          <View style={[styles.summaryIconCircle, { backgroundColor: isExport ? theme.success + "20" : theme.error + "20" }]}>
            <Feather 
              name={isExport ? "arrow-up-right" : "arrow-down-left"} 
              size={28} 
              color={isExport ? theme.success : theme.error} 
            />
          </View>
          <ThemedText
            type="h4"
            style={{ color: isExport ? theme.success : theme.error, fontWeight: "900", marginTop: Spacing.md }}
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
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {isExport ? t("positive_energy_flow") : t("negative_energy_flow")}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(300)}
          style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={[styles.cardHeader, rtlRow, { borderBottomColor: theme.border, gap: Spacing.md }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="list" size={18} color={theme.primary} />
            </View>
            <ThemedText semanticVariant="sectionTitle">
              {t("feeders_summary")}
            </ThemedText>
          </View>

          {rows.map((r, index) => (
            (() => {
              const summaryCells = [
                {
                  key: "start",
                  label: t("start"),
                  value: format2(r.start),
                  labelColor: theme.textSecondary,
                  valueColor: undefined as string | undefined,
                },
                {
                  key: "end",
                  label: t("end"),
                  value: format2(r.end),
                  labelColor: theme.textSecondary,
                  valueColor: undefined as string | undefined,
                },
                {
                  key: "diff",
                  label: t("diff"),
                  value: format2(r.diff),
                  labelColor: theme.primary,
                  valueColor: theme.primary,
                },
              ];
              return (
                <View
                  key={r.f}
                  style={[
                    styles.summaryRow,
                    rtlRow,
                    index < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={[styles.feederBadgeSmall, { backgroundColor: theme.primary + "20" }]}>
                    <ThemedText semanticVariant="labelPrimary" style={{ color: theme.primary }}>
                      {r.f}
                    </ThemedText>
                  </View>
                  <View style={[styles.summaryValues, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    {summaryCells.map((cell) => (
                      <View key={cell.key} style={styles.summaryValue}>
                        <ThemedText semanticVariant="tableHeader" style={{ color: cell.labelColor, textAlign: isRTL ? "right" : "left" }}>
                          {cell.label}
                        </ThemedText>
                        <NumberText
                          tier="summary"
                          style={[
                            cell.valueColor ? { color: cell.valueColor } : undefined,
                            { textAlign: isRTL ? "right" : "left" },
                          ]}
                        >
                          {cell.value}
                        </NumberText>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()
          ))}
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
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
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 96,
  },
  valueWithUnitRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
    writingDirection: "ltr",
  },
  summaryCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
    minHeight: 196,
  },
  summaryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryValues: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  summaryValuesRTL: {
    flexDirection: "row-reverse",
  },
  summaryValue: {
    alignItems: "center",
    minWidth: 72,
    minHeight: 52,
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  letterCircle: {
    minWidth: 86,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  datePickerModal: {
    width: "100%",
    maxWidth: 380,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  dateNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDisplay: {
    alignItems: "center",
  },
  todayModalButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginBottom: Spacing.lg,
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

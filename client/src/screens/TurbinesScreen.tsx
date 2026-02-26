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
import { HoursChip } from "@/components/HoursChip";
import { HoursPickerSheet } from "@/components/HoursPickerSheet";
import { useTheme } from "@/hooks/useTheme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useDay } from "@/contexts/DayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTL } from "@/hooks/useRTL";
import { TURBINES, format2, turbineRowComputed, formatDateKey, todayKey, parseReading } from "@/lib/storage";
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

export default function TurbinesScreen() {
  const renderCountRef = useRef(0);
  if (__DEV__) {
    renderCountRef.current += 1;
    console.log(`[render] TurbinesScreen #${renderCountRef.current}`);
  }

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const { dateKey, setDateKey, day, setDay, saveDay, resetDay } = useDay();
  const { t: translate, isRTL, language } = useLanguage();
  const pairedInputTextStyle = useMemo(
    () => ({
      writingDirection: isRTL ? "rtl" as const : "ltr" as const,
      textAlign: isRTL ? "right" as const : "left" as const,
    }),
    [isRTL]
  );
  const { rtlRow } = useRTL();

  const rows = useMemo(() => {
    return TURBINES.map((t) => ({
      t,
      ...turbineRowComputed(day, t),
    }));
  }, [day]);

  const totalProduction = rows.reduce((a, r) => a + r.diff, 0);

  const handleCopyPreviousToPresent = useCallback((turbine: string) => {
    const previousValue = day.turbines[turbine]?.previous;
    if (previousValue === undefined || previousValue === null || previousValue.trim() === "") {
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
  }, [day.turbines, setDay, translate]);

  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);

  const handleSave = useCallback(async () => {
    if (saveLockRef.current || isSaving) return;
    saveLockRef.current = true;
    setIsSaving(true);

    try {
      await saveDay();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess(translate("msg_saved_success"));
    } catch (error) {
      showError(translate("msg_error_generic"));
    } finally {
      setIsSaving(false);
      saveLockRef.current = false;
    }
  }, [isSaving, saveDay, translate]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetDay();
    showSuccess(translate("msg_reset_done"));
  }, [resetDay, translate]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoursPickerTurbine, setHoursPickerTurbine] = useState<string | null>(null);
  const dayLetter = getDayLetter(dateKey);
  const shiftBadgeLabel = formatShiftBadgeLabel(dayLetter, language, translate);

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

  const previousChangeByTurbine = useMemo(() => {
    const pairs = TURBINES.map((turbine) => [
      turbine,
      (value: string) =>
        setDay((prev) => ({
          ...prev,
          turbines: {
            ...prev.turbines,
            [turbine]: { ...prev.turbines[turbine], previous: value },
          },
        })),
    ] as const);

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const presentChangeByTurbine = useMemo(() => {
    const pairs = TURBINES.map((turbine) => [
      turbine,
      (value: string) =>
        setDay((prev) => ({
          ...prev,
          turbines: {
            ...prev.turbines,
            [turbine]: { ...prev.turbines[turbine], present: value },
          },
        })),
    ] as const);

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const hoursChangeByTurbine = useMemo(() => {
    const pairs = TURBINES.map((turbine) => [
      turbine,
      (value: string) =>
        setDay((prev) => ({
          ...prev,
          turbines: {
            ...prev.turbines,
            [turbine]: { ...prev.turbines[turbine], hours: value },
          },
        })),
    ] as const);

    return Object.fromEntries(pairs) as Record<string, (value: string) => void>;
  }, [setDay]);

  const isToday = dateKey === todayKey();
  const selectedHoursValue = hoursPickerTurbine ? (day.turbines[hoursPickerTurbine]?.hours || "24") : "24";

  const handleOpenHoursPicker = useCallback((turbine: string) => {
    setHoursPickerTurbine(turbine);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCloseHoursPicker = useCallback(() => {
    setHoursPickerTurbine(null);
  }, []);

  const handleDoneHoursPicker = useCallback((value: string) => {
    if (hoursPickerTurbine) {
      hoursChangeByTurbine[hoursPickerTurbine]?.(value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setHoursPickerTurbine(null);
  }, [hoursChangeByTurbine, hoursPickerTurbine]);

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
              {isToday ? translate("today") : dateKey}
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
              <Feather name="wind" size={18} color={theme.primary} />
            </View>
            <ThemedText semanticVariant="sectionTitle">
              {translate("turbines_title")}
            </ThemedText>
          </View>

          <View style={layout.isTablet ? styles.tabletGrid : undefined}>
            {TURBINES.map((t, index) => {
              const row = rows[index];
              const statusColor = row.isStopped ? theme.warning : (row.hasError ? "#f04438" : theme.success);
              return (
                <Animated.View
                  key={t}
                  entering={FadeInDown.delay(index * 50).duration(300)}
                  style={[
                    styles.turbineRow,
                    layout.isTablet && styles.tabletTurbineRow,
                  ]}
                >
                  <View style={[styles.turbineLabelRow, rtlRow]}>
                    <View style={[styles.turbineTitleGroup, isRTL && styles.turbineTitleGroupRTL]}>
                      <View style={[styles.turbineBadge, { backgroundColor: statusColor + "20" }]}>
                        <ThemedText semanticVariant="labelPrimary" style={{ color: statusColor }}>
                          {t}
                        </ThemedText>
                      </View>
                      <ThemedText
                        semanticVariant="labelSecondary"
                        numberOfLines={1}
                        style={[styles.turbineLabel, ["A", "B", "C", "S"].includes(t) && { fontSize: 16 }]}
                      >
                        {translate("turbine")} {t}
                      </ThemedText>
                    </View>
                    <HoursChip
                      label={translate("hours")}
                      value={day.turbines[t]?.hours || "24"}
                      onPress={() => handleOpenHoursPicker(t)}
                      testID={`input-${t}-hours`}
                    />
                  </View>

                  <View style={[styles.inputsRow, isRTL && styles.inputsRowRTL]}>
                    <View style={styles.readingInputWrap}>
                      <NumericInputField
                        label={translate("previous")}
                        value={day.turbines[t]?.previous || ""}
                        onChangeValue={previousChangeByTurbine[t]}
                        testID={`input-${t}-previous`}
                        isInvalid={row.isStopped && parseReading(day.turbines[t]?.previous) === null}
                        labelStyle={pairedInputTextStyle}
                        textStyle={pairedInputTextStyle}
                      />
                    </View>
                    <Pressable
                      style={[styles.copyArrowButton, { backgroundColor: theme.primary + "20" }]}
                      onPress={() => handleCopyPreviousToPresent(t)}
                      testID={`copy-${t}`}
                    >
                      <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                        <Feather name="arrow-right" size={16} color={theme.primary} />
                      </View>
                    </Pressable>
                    <View style={styles.readingInputWrap}>
                      <NumericInputField
                        label={translate("present")}
                        value={day.turbines[t]?.present || ""}
                        onChangeValue={presentChangeByTurbine[t]}
                        testID={`input-${t}-present`}
                        isInvalid={row.isStopped && parseReading(day.turbines[t]?.present) === null}
                        labelStyle={pairedInputTextStyle}
                        textStyle={pairedInputTextStyle}
                      />
                    </View>
                  </View>

                  <View style={styles.resultsRow}>
                    <View style={[styles.resultBox, { 
                      backgroundColor: theme.primary + "15", 
                      borderColor: theme.primary + "40" 
                    }]}>
                      <ThemedText semanticVariant="tableHeader" style={{ color: theme.primary }}>
                        {translate("difference")}
                      </ThemedText>
                      <View style={styles.valueWithUnitRow}>
                        <NumberText tier="output" style={{ color: theme.text }}>
                          {format2(row.diff)}
                        </NumberText>
                        <ThemedText semanticVariant="unit" style={{ color: theme.textSecondary }}>
                          {translate("mwh")}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={[styles.resultBox, { 
                      backgroundColor: theme.success + "15", 
                      borderColor: theme.success + "40" 
                    }]}>
                      <ThemedText semanticVariant="tableHeader" style={{ color: theme.success }}>
                        {translate("mw_per_hr")}
                      </ThemedText>
                      <NumberText tier="output" style={{ color: theme.text }}>
                        {format2(row.mwPerHr)}
                      </NumberText>
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
              backgroundColor: theme.success + "15",
              borderColor: theme.success,
            },
          ]}
        >
          <View style={[styles.summaryIconCircle, { backgroundColor: theme.success + "20" }]}>
            <Feather name="zap" size={28} color={theme.success} />
          </View>
          <ThemedText semanticVariant="labelPrimary" style={{ color: theme.success, marginTop: Spacing.md }}>
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
          <ThemedText semanticVariant="helper" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {translate("mwh")}
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
              {translate("turbines_summary")}
            </ThemedText>
          </View>

          {rows.map((r, index) => (
            (() => {
              const summaryCells = [
                {
                  key: "prev",
                  label: translate("prev_short"),
                  value: format2(Math.abs(r.prev)),
                  labelColor: theme.textSecondary,
                  valueColor: undefined as string | undefined,
                },
                {
                  key: "pres",
                  label: translate("pres_short"),
                  value: format2(Math.abs(r.pres)),
                  labelColor: theme.textSecondary,
                  valueColor: undefined as string | undefined,
                },
                {
                  key: "diff",
                  label: translate("diff"),
                  value: format2(Math.abs(r.diff)),
                  labelColor: theme.primary,
                  valueColor: theme.primary,
                },
                {
                  key: "mwhr",
                  label: translate("mw_per_hr"),
                  value: format2(Math.abs(r.mwPerHr)),
                  labelColor: theme.success,
                  valueColor: theme.success,
                },
              ];
              return (
                <View
                  key={r.t}
                  style={[
                    styles.summaryRow,
                    rtlRow,
                    index < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={[styles.turbineBadgeSmall, { backgroundColor: theme.success + "20" }]}>
                    <ThemedText semanticVariant="labelPrimary" style={{ color: theme.success }}>
                      {r.t}
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

      <HoursPickerSheet
        visible={hoursPickerTurbine !== null}
        value={selectedHoursValue}
        onCancel={handleCloseHoursPicker}
        onDone={handleDoneHoursPicker}
      />
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
  tabletTurbineRow: {
    width: "50%",
    padding: Spacing.sm,
  },
  turbineRow: {
    padding: Spacing.lg,
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
    borderRadius: BorderRadius.xs,
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginTop: Spacing.md,
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
});

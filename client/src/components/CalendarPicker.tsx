import React, { useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  I18nManager,
  Text,
  Platform,
} from "react-native";
import PressableScale from "@/components/ui/PressableScale";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "./ThemedText";
import { NumberText } from "./NumberText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDateKey } from "@/lib/storage";
import { getShiftForDate } from "@/lib/shift";
import { FONT_FAMILIES } from "@/theme/fonts";
import {
  getResponsiveValue,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";

interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const SWIPE_MONTH_THRESHOLD = 48;
const SWIPE_DIRECTION_LOCK = 1.35;
const MONTH_TRANSITION_OFFSET = 42;
const SWIPE_PREVIEW_LIMIT = MONTH_TRANSITION_OFFSET;
const MONTH_TRANSITION_OUT_MS = 80;
const MONTH_TRANSITION_IN_MS = 140;
const MONTH_TRANSITION_CANCEL_MS = 110;

function getTitleFontFamily(isRTL: boolean): string {
  if (isRTL) {
    return FONT_FAMILIES.arabicSemiBold;
  }
  return Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "sans-serif",
  }) as string;
}

export function CalendarPicker({
  selectedDate,
  onSelectDate,
  onClose,
}: CalendarPickerProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const layout = useResponsiveLayout();
  const isTitleRTL = I18nManager.isRTL || isRTL;
  const swipeX = useSharedValue(0);
  const isSwipeAnimating = useSharedValue(false);
  const containerWidth = Math.min(
    layout.contentWidth,
    getResponsiveValue(layout, {
      compactPhone: 320,
      largePhone: 356,
      widePhone: 440,
      tablet: layout.isLandscape ? 740 : 600,
      largeTablet: layout.isLandscape ? 780 : 640,
      default: 340,
    }),
  );

  const weekdays = useMemo(
    () => [
      t("cal_sun"),
      t("cal_mon"),
      t("cal_tue"),
      t("cal_wed"),
      t("cal_thu"),
      t("cal_fri"),
      t("cal_sat"),
    ],
    [t],
  );

  const currentDate = useMemo(() => {
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);

  const [viewMonth, setViewMonth] = React.useState(currentDate.getMonth());
  const [viewYear, setViewYear] = React.useState(currentDate.getFullYear());

  const today = new Date();
  const todayStr = formatDateKey(today);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dateStr: formatDateKey(d),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({
        date: d,
        dateStr: formatDateKey(d),
        isCurrentMonth: true,
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({
        date: d,
        dateStr: formatDateKey(d),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewMonth, viewYear]);

  const displayWeekdays = useMemo(
    () => (isRTL ? [...weekdays].reverse() : weekdays),
    [isRTL, weekdays],
  );

  const displayCalendarDays = useMemo(() => {
    if (!isRTL) return calendarDays;

    const mirrored: typeof calendarDays = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      mirrored.push(...calendarDays.slice(i, i + 7).reverse());
    }
    return mirrored;
  }, [calendarDays, isRTL]);

  const headerTitleParts = useMemo(() => {
    const locale = isTitleRTL ? "ar" : "en";
    const date = new Date(viewYear, viewMonth, 1);
    const monthText = new Intl.DateTimeFormat(locale, { month: "long" }).format(
      date,
    );
    const yearText = isTitleRTL
      ? new Intl.NumberFormat("ar", { useGrouping: false }).format(viewYear)
      : new Intl.DateTimeFormat("en", { year: "numeric" }).format(date);
    return { monthText, yearText };
  }, [isTitleRTL, viewMonth, viewYear]);

  const commitMonthChange = useCallback((direction: "next" | "previous") => {
    if (direction === "next") {
      setViewMonth((month) => {
        if (month === 11) {
          setViewYear((year) => year + 1);
          return 0;
        }

        return month + 1;
      });
      return;
    }

    setViewMonth((month) => {
      if (month === 0) {
        setViewYear((year) => year - 1);
        return 11;
      }

      return month - 1;
    });
  }, []);

  const runAnimatedMonthChange = useCallback(
    (direction: "next" | "previous") => {
      if (isSwipeAnimating.value) return;
      isSwipeAnimating.value = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const exitOffset =
        direction === "next"
          ? -MONTH_TRANSITION_OFFSET
          : MONTH_TRANSITION_OFFSET;

      swipeX.value = withTiming(
        exitOffset,
        {
          duration: MONTH_TRANSITION_OUT_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (!finished) {
            isSwipeAnimating.value = false;
            return;
          }

          runOnJS(commitMonthChange)(direction);

          swipeX.value = -exitOffset;
          swipeX.value = withTiming(
            0,
            {
              duration: MONTH_TRANSITION_IN_MS,
              easing: Easing.out(Easing.cubic),
            },
            () => {
              isSwipeAnimating.value = false;
            },
          );
        },
      );
    },
    [commitMonthChange, isSwipeAnimating, swipeX],
  );

  const handlePrevMonth = useCallback(() => {
    runAnimatedMonthChange("previous");
  }, [runAnimatedMonthChange]);

  const handleNextMonth = useCallback(() => {
    runAnimatedMonthChange("next");
  }, [runAnimatedMonthChange]);

  const calendarPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .onUpdate((event) => {
          if (isSwipeAnimating.value) return;

          const clampedDx = Math.max(
            -SWIPE_PREVIEW_LIMIT,
            Math.min(SWIPE_PREVIEW_LIMIT, event.translationX),
          );
          swipeX.value = clampedDx;
        })
        .onEnd((event) => {
          if (isSwipeAnimating.value) return;

          const absDx = Math.abs(event.translationX);
          const absDy = Math.abs(event.translationY);
          const isHorizontalSwipe =
            absDx >= SWIPE_MONTH_THRESHOLD &&
            absDx > absDy * SWIPE_DIRECTION_LOCK;

          if (!isHorizontalSwipe) {
            swipeX.value = withTiming(0, {
              duration: MONTH_TRANSITION_CANCEL_MS,
              easing: Easing.out(Easing.cubic),
            });
            return;
          }

          runOnJS(runAnimatedMonthChange)(
            event.translationX < 0 ? "next" : "previous",
          );
        })
        .onFinalize(() => {
          if (!isSwipeAnimating.value && Math.abs(swipeX.value) > 0) {
            swipeX.value = withTiming(0, {
              duration: MONTH_TRANSITION_CANCEL_MS,
              easing: Easing.out(Easing.cubic),
            });
          }
        }),
    [isSwipeAnimating, runAnimatedMonthChange, swipeX],
  );

  const calendarSwipeStyle = useAnimatedStyle(() => {
    const clampedX = Math.max(
      -MONTH_TRANSITION_OFFSET,
      Math.min(MONTH_TRANSITION_OFFSET, swipeX.value),
    );
    const progress = Math.min(Math.abs(clampedX) / MONTH_TRANSITION_OFFSET, 1);

    return {
      opacity: 1 - progress * 0.28,
      transform: [
        {
          translateX: clampedX,
        },
      ],
    };
  });

  const handleSelectDate = (dateStr: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate(dateStr);
    onClose();
  };

  const handleGoToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectDate(todayStr);
    onClose();
  };

  const dayLetter = getShiftForDate(selectedDate);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.borderStrong,
          shadowColor: theme.cardShadow,
          width: containerWidth,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={[
            styles.monthNavButton,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.borderStrong,
            },
          ]}
          onPress={isRTL ? handleNextMonth : handlePrevMonth}
        >
          <Feather name="chevron-left" size={20} color={theme.primary} />
        </Pressable>
        <View style={styles.monthYearDisplay}>
          <View
            style={[
              styles.monthYearRow,
              isTitleRTL ? styles.monthYearRowRTL : styles.monthYearRowLTR,
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.calendarHeaderTitleText,
                {
                  color: theme.text,
                  fontFamily: getTitleFontFamily(isTitleRTL),
                },
                isTitleRTL
                  ? styles.calendarHeaderTitleRTL
                  : styles.calendarHeaderTitleLTR,
              ]}
            >
              {headerTitleParts.monthText}
            </Text>
            <Text
              allowFontScaling={false}
              style={[
                styles.calendarHeaderTitleText,
                styles.calendarHeaderTitleSpace,
                {
                  color: theme.text,
                  fontFamily: getTitleFontFamily(isTitleRTL),
                },
                isTitleRTL
                  ? styles.calendarHeaderTitleRTL
                  : styles.calendarHeaderTitleLTR,
              ]}
            >
              {" "}
            </Text>
            <Text
              allowFontScaling={false}
              style={[
                styles.calendarHeaderTitleText,
                {
                  color: theme.text,
                  fontFamily: getTitleFontFamily(isTitleRTL),
                },
                !isTitleRTL && styles.calendarHeaderTitleYearEN,
                isTitleRTL
                  ? styles.calendarHeaderTitleRTL
                  : styles.calendarHeaderTitleLTR,
              ]}
            >
              {headerTitleParts.yearText}
            </Text>
          </View>
        </View>
        <Pressable
          style={[
            styles.monthNavButton,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.borderStrong,
            },
          ]}
          onPress={isRTL ? handlePrevMonth : handleNextMonth}
        >
          <Feather name="chevron-right" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <GestureDetector gesture={calendarPanGesture}>
        <Animated.View
          collapsable={false}
          style={[styles.calendarSwipeArea, calendarSwipeStyle]}
        >
          <View style={styles.weekdaysRow}>
            {displayWeekdays.map((day) => (
              <View key={day} style={styles.weekdayCell}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, textAlign: "center" }}
                >
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {displayCalendarDays.map((day, index) => {
              const isSelected = day.dateStr === selectedDate;
              const isToday = day.dateStr === todayStr;

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && {
                      backgroundColor: theme.primary,
                      shadowColor: theme.cardShadow,
                    },
                    isToday &&
                      !isSelected && {
                        borderWidth: 1.5,
                        borderColor: theme.primary,
                        backgroundColor: theme.accentSoft,
                      },
                  ]}
                  onPress={() => handleSelectDate(day.dateStr)}
                >
                  <NumberText
                    size="small"
                    style={{
                      color: isSelected
                        ? theme.buttonText
                        : day.isCurrentMonth
                          ? theme.text
                          : theme.textSecondary + "60",
                      fontWeight: isSelected || isToday ? "600" : "400",
                      textAlign: "center",
                    }}
                  >
                    {day.date.getDate()}
                  </NumberText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </GestureDetector>

      <View
        style={[
          styles.selectedInfo,
          { flexDirection: isRTL ? "row-reverse" : "row" },
          {
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.borderStrong,
          },
        ]}
      >
        <View style={styles.selectedGroup}>
          {isRTL ? (
            <>
              <NumberText
                size="md"
                style={[
                  styles.selectedDateText,
                  { color: theme.text, textAlign: "right" },
                ]}
              >
                {selectedDate}
              </NumberText>
              <ThemedText
                type="body"
                style={{ color: theme.textSecondary, textAlign: "right" }}
              >
                {t("cal_selected")}:
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText
                type="body"
                style={{ color: theme.textSecondary, textAlign: "left" }}
              >
                {t("cal_selected")}:
              </ThemedText>
              <NumberText
                size="md"
                style={[
                  styles.selectedDateText,
                  { color: theme.text, textAlign: "left" },
                ]}
              >
                {selectedDate}
              </NumberText>
            </>
          )}
        </View>

        <View style={styles.selectedBadgeContainer}>
          <View
            style={[
              styles.dayLetterBadge,
              {
                backgroundColor: theme.accentSoft,
                borderColor: theme.borderStrong,
              },
            ]}
          >
            <ThemedText
              semanticVariant="labelPrimary"
              style={{ color: theme.primary }}
            >
              {dayLetter}
            </ThemedText>
          </View>
        </View>
      </View>

      <PressableScale
        style={[styles.todayButton, { backgroundColor: theme.primary }]}
        onPress={handleGoToToday}
      >
        <Feather name="calendar" size={18} color={theme.buttonText} />
        <ThemedText
          semanticVariant="button"
          style={{ color: theme.buttonText }}
        >
          {t("cal_go_to_today")}
        </ThemedText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    maxWidth: "100%",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthYearDisplay: {
    flex: 1,
    alignItems: "center",
  },
  monthYearRow: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  monthYearRowLTR: {
    flexDirection: "row",
  },
  monthYearRowRTL: {
    flexDirection: "row-reverse",
  },
  calendarHeaderTitleText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  calendarHeaderTitleLTR: {
    writingDirection: "ltr",
    textAlign: "center",
    fontVariant: ["tabular-nums", "lining-nums"],
  },
  calendarHeaderTitleRTL: {
    writingDirection: "rtl",
    textAlign: "center",
  },
  calendarHeaderTitleSpace: {
    minWidth: 4,
  },
  calendarHeaderTitleYearEN: {
    fontVariant: ["tabular-nums", "lining-nums"],
  },
  calendarSwipeArea: {
    width: "100%",
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
    marginBottom: 2,
  },
  selectedInfo: {
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  selectedGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  selectedBadgeContainer: {
    flexShrink: 0,
  },
  selectedDateText: {
    writingDirection: "ltr",
  },
  dayLetterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
});

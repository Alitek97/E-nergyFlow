import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import PressableScale from "@/components/ui/PressableScale";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { NumberText } from "./NumberText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDateKey } from "@/lib/storage";

interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

function getDayLetter(dateStr: string): string {
  const letters = ["B", "D", "A", "C"];
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "A";
  const epoch = new Date("2026-01-18");
  const diffDays = Math.floor((date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % 4) + 4) % 4;
  return letters[index];
}

export function CalendarPicker({ selectedDate, onSelectDate, onClose }: CalendarPickerProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const WEEKDAYS = [t("cal_sun"), t("cal_mon"), t("cal_tue"), t("cal_wed"), t("cal_thu"), t("cal_fri"), t("cal_sat")];
  const MONTHS = [t("cal_january"), t("cal_february"), t("cal_march"), t("cal_april"), t("cal_may"), t("cal_june"), t("cal_july"), t("cal_august"), t("cal_september"), t("cal_october"), t("cal_november"), t("cal_december")];
  
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
    () => (isRTL ? [...WEEKDAYS].reverse() : WEEKDAYS),
    [WEEKDAYS, isRTL]
  );

  const displayCalendarDays = useMemo(() => {
    if (!isRTL) return calendarDays;

    const mirrored: typeof calendarDays = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      mirrored.push(...calendarDays.slice(i, i + 7).reverse());
    }
    return mirrored;
  }, [calendarDays, isRTL]);

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

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

  const dayLetter = getDayLetter(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.monthNavButton, { backgroundColor: theme.primary + "20" }]}
          onPress={handlePrevMonth}
        >
          <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={20} color={theme.primary} />
        </Pressable>
        <View style={styles.monthYearDisplay}>
          <View style={styles.monthYearRow}>
            <ThemedText semanticVariant="sectionTitle" style={{ textAlign: "center" }}>
              {MONTHS[viewMonth]}
            </ThemedText>
            <NumberText size="lg" weight="semibold" style={{ color: theme.text }}>
              {viewYear}
            </NumberText>
          </View>
        </View>
        <Pressable
          style={[styles.monthNavButton, { backgroundColor: theme.primary + "20" }]}
          onPress={handleNextMonth}
        >
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.weekdaysRow}>
        {displayWeekdays.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
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
                isSelected && { backgroundColor: theme.primary },
                isToday && !isSelected && { borderWidth: 2, borderColor: theme.primary },
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

      <View style={[styles.selectedInfo, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <View style={[styles.selectedValueRow, isRTL && styles.selectedValueRowRTL]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {t("cal_selected")}:
          </ThemedText>
          <NumberText size="md" style={{ color: theme.text, textAlign: isRTL ? "right" : "left" }}>
            {selectedDate}
          </NumberText>
        </View>
        <View style={[styles.dayLetterBadge, { backgroundColor: theme.primary + "20" }]}>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {t("cal_day")}
          </ThemedText>
          <ThemedText semanticVariant="labelPrimary" style={{ color: theme.primary }}>
            {dayLetter}
          </ThemedText>
        </View>
      </View>

      <PressableScale
        style={[styles.todayButton, { backgroundColor: theme.primary }]}
        onPress={handleGoToToday}
      >
        <Feather name="calendar" size={18} color={theme.buttonText} />
        <ThemedText semanticVariant="button" style={{ color: theme.buttonText }}>
          {t("cal_go_to_today")}
        </ThemedText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: 340,
    maxWidth: "100%",
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
    alignItems: "center",
    justifyContent: "center",
  },
  monthYearDisplay: {
    flex: 1,
    alignItems: "center",
  },
  monthYearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
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
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  selectedValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  selectedValueRowRTL: {
    flexDirection: "row-reverse",
  },
  dayLetterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
});

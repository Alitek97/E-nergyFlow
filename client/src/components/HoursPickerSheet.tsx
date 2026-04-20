import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumberText } from "@/components/NumberText";
import { FeederCode } from "@/components/FeederCode";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, withAlpha } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import {
  getResponsiveValue,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";
import {
  formatOperatingTimeDisplay,
  OPERATING_MINUTE_STEPS,
  parseOperatingTime,
  toOperatingTimeValue,
} from "@/utils/operatingTime";

interface HoursPickerSheetProps {
  visible: boolean;
  value: string;
  turbineLabel?: string;
  onCancel: () => void;
  onDone: (value: string) => void;
}

const HOURS_VALUES = Array.from({ length: 25 }, (_, index) => index);
const MINUTE_VALUES: number[] = [...OPERATING_MINUTE_STEPS];
const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SIDE_PADDING = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

export function HoursPickerSheet({
  visible,
  value,
  turbineLabel,
  onCancel,
  onDone,
}: HoursPickerSheetProps) {
  const { theme } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const hourListRef = useRef<FlatList<number>>(null);
  const minuteListRef = useRef<FlatList<number>>(null);
  const [draftHour, setDraftHour] = useState<number>(24);
  const [draftMinute, setDraftMinute] = useState<number>(0);

  const syncMinuteWithHour = useCallback((hour: number, minute: number) => {
    if (hour === 24 && minute !== 0) return 0;
    return minute;
  }, []);

  useEffect(() => {
    if (!visible) return;
    const parsed = parseOperatingTime(value);
    const nextHour = parsed.hours;
    const nextMinute = syncMinuteWithHour(parsed.hours, parsed.minutes);

    setDraftHour(nextHour);
    setDraftMinute(nextMinute);

    const timer = setTimeout(() => {
      hourListRef.current?.scrollToOffset({
        offset: HOURS_VALUES.indexOf(nextHour) * ITEM_HEIGHT,
        animated: false,
      });
      minuteListRef.current?.scrollToOffset({
        offset: MINUTE_VALUES.indexOf(nextMinute) * ITEM_HEIGHT,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [syncMinuteWithHour, value, visible]);

  const hourSelectedIndex = HOURS_VALUES.indexOf(draftHour);
  const minuteSelectedIndex = MINUTE_VALUES.indexOf(draftMinute);

  const titlePrefix = useMemo(() => {
    if (!turbineLabel) return null;
    if (language === "ar") {
      return "وقت تشغيل التوربين";
    }
    return `Operating Time for ${t("turbine")}`;
  }, [language, t, turbineLabel]);

  const preview = useMemo(
    () =>
      formatOperatingTimeDisplay(
        { hours: draftHour, minutes: draftMinute },
        language,
      ),
    [draftHour, draftMinute, language],
  );

  const hourLabel = language === "ar" ? "ساعات" : "Hours";
  const minuteLabel = language === "ar" ? "دقائق" : "Minutes";

  const scrollToHour = useCallback((hour: number, animated = true) => {
    hourListRef.current?.scrollToOffset({
      offset: HOURS_VALUES.indexOf(hour) * ITEM_HEIGHT,
      animated,
    });
  }, []);

  const scrollToMinute = useCallback((minute: number, animated = true) => {
    minuteListRef.current?.scrollToOffset({
      offset: MINUTE_VALUES.indexOf(minute) * ITEM_HEIGHT,
      animated,
    });
  }, []);

  const setHourAndValidate = useCallback(
    (hour: number) => {
      const safeHour = Math.max(0, Math.min(24, hour));
      setDraftHour(safeHour);
      if (safeHour === 24) {
        setDraftMinute(0);
        scrollToMinute(0);
      }
    },
    [scrollToMinute],
  );

  const setMinuteAndValidate = useCallback(
    (minute: number) => {
      if (draftHour === 24 && minute !== 0) {
        setDraftMinute(0);
        scrollToMinute(0);
        return;
      }
      setDraftMinute(minute);
    },
    [draftHour, scrollToMinute],
  );

  const commitHourScrollSelection = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(
        0,
        Math.min(HOURS_VALUES.length - 1, rawIndex),
      );
      const nextHour = HOURS_VALUES[clampedIndex];
      setHourAndValidate(nextHour);
    },
    [setHourAndValidate],
  );

  const commitMinuteScrollSelection = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(
        0,
        Math.min(MINUTE_VALUES.length - 1, rawIndex),
      );
      const nextMinute = MINUTE_VALUES[clampedIndex];
      setMinuteAndValidate(nextMinute);
    },
    [setMinuteAndValidate],
  );

  const handlePressHour = useCallback(
    (hour: number) => {
      setHourAndValidate(hour);
      scrollToHour(hour);
    },
    [scrollToHour, setHourAndValidate],
  );

  const handlePressMinute = useCallback(
    (minute: number) => {
      setMinuteAndValidate(minute);
      scrollToMinute(draftHour === 24 ? 0 : minute);
    },
    [draftHour, scrollToMinute, setMinuteAndValidate],
  );

  const handleDone = useCallback(() => {
    onDone(toOperatingTimeValue(draftHour, draftMinute));
  }, [draftHour, draftMinute, onDone]);

  const sheetWidth = Math.min(
    layout.contentWidth,
    getResponsiveValue(layout, {
      compactPhone: layout.contentWidth,
      largePhone: layout.contentWidth,
      widePhone: 520,
      tablet: layout.isLandscape ? 720 : 620,
      largeTablet: layout.isLandscape ? 760 : 660,
      default: layout.contentWidth,
    }),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[
          styles.overlay,
          layout.isWideLayout && styles.overlayTablet,
          { backgroundColor: withAlpha(theme.backgroundRoot, 0.62) },
        ]}
        onPress={onCancel}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            layout.isWideLayout && styles.sheetTablet,
            {
              backgroundColor: theme.backgroundDefault,
              borderTopColor: theme.borderStrong,
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md,
              width: sheetWidth,
            },
          ]}
        >
          <ThemedText
            semanticVariant="sectionTitle"
            style={[styles.title, { color: theme.text }]}
          >
            {turbineLabel && titlePrefix ? (
              <>
                {titlePrefix} <FeederCode code={turbineLabel} />
              </>
            ) : (
              t("hours_picker_title")
            )}
          </ThemedText>

          <ThemedText
            semanticVariant="labelSecondary"
            style={[styles.preview, { color: theme.textSecondary }]}
          >
            {preview}
          </ThemedText>

          <View
            style={[
              styles.pickerShell,
              {
                borderColor: theme.borderStrong,
                backgroundColor: theme.surfaceMuted,
              },
            ]}
          >
            <View style={styles.pickerBody}>
              <View style={styles.numberColumn}>
                <ThemedText
                  semanticVariant="tableHeader"
                  style={[styles.columnLabel, { color: theme.textSecondary }]}
                >
                  {hourLabel}
                </ThemedText>
                <View
                  pointerEvents="none"
                  style={[
                    styles.selectionFrame,
                    {
                      borderColor: theme.primary + "55",
                      backgroundColor: theme.accentSoft,
                    },
                  ]}
                />
                <FlatList
                  ref={hourListRef}
                  data={HOURS_VALUES}
                  keyExtractor={(item) => `h-${item}`}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  contentContainerStyle={styles.pickerContent}
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  onMomentumScrollEnd={commitHourScrollSelection}
                  onScrollEndDrag={commitHourScrollSelection}
                  renderItem={({ item, index }) => {
                    const isSelected = index === hourSelectedIndex;
                    return (
                      <Pressable
                        style={styles.item}
                        onPress={() => handlePressHour(item)}
                      >
                        <NumberText
                          size="lg"
                          weight={isSelected ? "bold" : "regular"}
                          style={[
                            styles.itemNumber,
                            {
                              color: isSelected
                                ? theme.text
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {String(item)}
                        </NumberText>
                      </Pressable>
                    );
                  }}
                />
              </View>

              <View
                style={[
                  styles.columnDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <View style={styles.numberColumn}>
                <ThemedText
                  semanticVariant="tableHeader"
                  style={[styles.columnLabel, { color: theme.textSecondary }]}
                >
                  {minuteLabel}
                </ThemedText>
                <View
                  pointerEvents="none"
                  style={[
                    styles.selectionFrame,
                    {
                      borderColor: theme.primary + "55",
                      backgroundColor: theme.accentSoft,
                    },
                  ]}
                />
                <FlatList
                  ref={minuteListRef}
                  data={MINUTE_VALUES}
                  keyExtractor={(item) => `m-${item}`}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  contentContainerStyle={styles.pickerContent}
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  onMomentumScrollEnd={commitMinuteScrollSelection}
                  onScrollEndDrag={commitMinuteScrollSelection}
                  renderItem={({ item, index }) => {
                    const isSelected = index === minuteSelectedIndex;
                    const isDisabled = draftHour === 24 && item !== 0;
                    return (
                      <Pressable
                        style={styles.item}
                        onPress={() => handlePressMinute(item)}
                        disabled={isDisabled}
                      >
                        <NumberText
                          size="lg"
                          weight={isSelected ? "bold" : "regular"}
                          style={[
                            styles.itemNumber,
                            {
                              color: isDisabled
                                ? theme.textSecondary + "66"
                                : isSelected
                                  ? theme.text
                                  : theme.textSecondary,
                            },
                          ]}
                        >
                          {String(item).padStart(2, "0")}
                        </NumberText>
                      </Pressable>
                    );
                  }}
                />
              </View>
            </View>
          </View>

          <View style={[styles.actionsRow, isRTL && styles.actionsRowRTL]}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.surfaceRaised,
                  borderColor: theme.borderStrong,
                },
              ]}
            >
              <ThemedText
                semanticVariant="button"
                style={{ color: theme.text }}
              >
                {t("cancel")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleDone}
              style={[
                styles.actionButton,
                styles.doneButton,
                { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText
                semanticVariant="button"
                style={{ color: theme.buttonText }}
              >
                {t("done")}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayTablet: {
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    maxWidth: "100%",
  },
  sheetTablet: {
    alignSelf: "center",
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
  },
  preview: {
    textAlign: "center",
    marginTop: -2,
  },
  pickerShell: {
    height: PICKER_HEIGHT + 26,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  pickerBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  numberColumn: {
    flex: 1,
    position: "relative",
  },
  columnLabel: {
    textAlign: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },
  columnDivider: {
    width: StyleSheet.hairlineWidth,
  },
  pickerContent: {
    paddingVertical: SIDE_PADDING,
  },
  selectionFrame: {
    position: "absolute",
    top: SIDE_PADDING + 26,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  itemNumber: {
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionsRowRTL: {
    flexDirection: "row-reverse",
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButton: {
    borderWidth: 0,
  },
});

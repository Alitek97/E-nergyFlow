import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";

interface HoursPickerSheetProps {
  visible: boolean;
  value: string;
  onCancel: () => void;
  onDone: (value: string) => void;
}

const HOURS_VALUES = Array.from({ length: 24 }, (_, index) => index + 1);
const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SIDE_PADDING = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

function clampHour(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 24;
  if (parsed < 1) return 1;
  if (parsed > 24) return 24;
  return parsed;
}

export function HoursPickerSheet({ visible, value, onCancel, onDone }: HoursPickerSheetProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<number>>(null);
  const [draftHour, setDraftHour] = useState<number>(clampHour(value));

  useEffect(() => {
    if (!visible) return;
    const nextHour = clampHour(value);
    setDraftHour(nextHour);

    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: (nextHour - 1) * ITEM_HEIGHT,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [value, visible]);

  const selectedIndex = draftHour - 1;

  const titleText = useMemo(() => t("hours_picker_title"), [t]);

  const commitScrollSelection = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(HOURS_VALUES.length - 1, rawIndex));
    setDraftHour(HOURS_VALUES[clampedIndex]);
  }, []);

  const handlePressHour = useCallback((hour: number) => {
    setDraftHour(hour);
    listRef.current?.scrollToOffset({
      offset: (hour - 1) * ITEM_HEIGHT,
      animated: true,
    });
  }, []);

  const handleDone = useCallback(() => {
    onDone(String(draftHour));
  }, [draftHour, onDone]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md,
            },
          ]}
        >
          <ThemedText semanticVariant="sectionTitle" style={[styles.title, { color: theme.text }]}>
            {titleText}
          </ThemedText>

          <View style={[styles.pickerShell, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
            <View
              pointerEvents="none"
              style={[
                styles.selectionFrame,
                {
                  borderColor: theme.primary + "55",
                  backgroundColor: theme.primary + "10",
                },
              ]}
            />
            <FlatList
              ref={listRef}
              data={HOURS_VALUES}
              keyExtractor={(item) => String(item)}
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
              onMomentumScrollEnd={commitScrollSelection}
              onScrollEndDrag={commitScrollSelection}
              renderItem={({ item, index }) => {
                const isSelected = index === selectedIndex;
                return (
                  <Pressable style={styles.item} onPress={() => handlePressHour(item)}>
                    <View style={[styles.itemContent, isRTL && styles.itemContentRTL]}>
                      <ThemedText
                        semanticVariant="labelSecondary"
                        numberOfLines={1}
                        style={[
                          styles.itemLabel,
                          { color: isSelected ? theme.primary : theme.textSecondary },
                        ]}
                      >
                        {t("hours")}
                      </ThemedText>
                      <NumberText
                        size="lg"
                        weight={isSelected ? "bold" : "regular"}
                        style={{ color: isSelected ? theme.text : theme.textSecondary }}
                      >
                        {String(item)}
                      </NumberText>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>

          <View style={[styles.actionsRow, isRTL && styles.actionsRowRTL]}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText semanticVariant="button" style={{ color: theme.text }}>
                {t("cancel")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleDone}
              style={[styles.actionButton, styles.doneButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText semanticVariant="button" style={{ color: theme.buttonText }}>
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    textAlign: "center",
  },
  pickerShell: {
    height: PICKER_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  pickerContent: {
    paddingVertical: SIDE_PADDING,
  },
  selectionFrame: {
    position: "absolute",
    top: SIDE_PADDING,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  itemContentRTL: {
    flexDirection: "row-reverse",
  },
  itemLabel: {
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
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButton: {
    borderWidth: 0,
  },
});

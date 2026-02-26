import React, { memo, useCallback, useState } from "react";
import { View, StyleSheet, Pressable, Modal, type StyleProp, type TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { NumberText } from "./NumberText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface HoursInputFieldProps {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  testID?: string;
  textStyle?: StyleProp<TextStyle>;
  variant?: "field" | "chip";
}

const KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["", "0", "⌫"],
];

function clampHours(val: string): string {
  if (!val || val === "") return "24";
  const num = parseInt(val, 10);
  if (isNaN(num) || num < 1) return "1";
  if (num > 24) return "24";
  return String(num);
}

export const HoursInputField = memo(function HoursInputField({
  label,
  value,
  onChangeValue,
  testID,
  textStyle,
  variant = "field",
}: HoursInputFieldProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const [showKeypad, setShowKeypad] = useState(false);
  const [tempValue, setTempValue] = useState("");

  const displayValue = value || "24";

  const handleOpen = useCallback(() => {
    setTempValue("");
    setShowKeypad(true);
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (key === "⌫") {
      setTempValue((prev) => prev.slice(0, -1));
      return;
    }
    
    if (key === "") return;
    
    const newValue = tempValue + key;
    const num = parseInt(newValue, 10);
    if (num > 24) {
      setTempValue("24");
    } else if (newValue.length <= 2) {
      setTempValue(newValue);
    }
  }, [tempValue]);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTempValue("");
  }, []);

  const handleDone = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const clamped = clampHours(tempValue);
    onChangeValue(clamped);
    setShowKeypad(false);
  }, [onChangeValue, tempValue]);

  const handleClose = useCallback(() => {
    const clamped = clampHours(tempValue);
    onChangeValue(clamped);
    setShowKeypad(false);
  }, [onChangeValue, tempValue]);

  return (
    <>
      <Pressable
        style={[
          variant === "chip" ? styles.chipContainer : styles.container,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        ]}
        onPress={handleOpen}
        testID={testID}
      >
        {variant === "chip" ? (
          <View style={[styles.chipContent, isRTL && styles.chipContentRTL]}>
            <ThemedText
              semanticVariant="tableCellLabel"
              numberOfLines={1}
              style={[styles.chipLabel, { color: theme.textSecondary }, textStyle]}
            >
              {label}
            </ThemedText>
            <NumberText tier="input" numberOfLines={1} style={[styles.chipValue, { color: theme.text }]}>
              {displayValue}
            </NumberText>
          </View>
        ) : (
          <>
            <ThemedText numberOfLines={1} semanticVariant="tableCellLabel" style={[styles.label, { color: theme.textSecondary }, textStyle]}>
              {label}
            </ThemedText>
            <NumberText
              tier="input"
              numberOfLines={1}
              style={[
                styles.value,
                { color: theme.text },
                textStyle,
              ]}
            >
              {displayValue}
            </NumberText>
          </>
        )}
      </Pressable>

      <Modal
        visible={showKeypad}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={[styles.keypadContainer, { backgroundColor: theme.backgroundDefault }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText semanticVariant="helper" style={[styles.keypadLabel, { color: theme.textSecondary }]} numeric>
              {label} (1-24)
            </ThemedText>
            
            <View style={[styles.display, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <NumberText tier="output" style={styles.displayText}>
                {tempValue || "0"}
              </NumberText>
            </View>

            <View style={styles.keysContainer}>
              {KEYS.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keyRow}>
                  {row.map((key, keyIndex) => (
                    <Pressable
                      key={`${rowIndex}-${keyIndex}`}
                      style={[
                        styles.key,
                        { 
                          backgroundColor: key === "⌫" 
                            ? theme.error + "20" 
                            : key === "" 
                              ? "transparent" 
                              : theme.backgroundSecondary 
                        },
                      ]}
                      onPress={() => handleKeyPress(key)}
                      disabled={key === ""}
                    >
                      {key === "⌫" ? (
                        <Feather name="delete" size={24} color={theme.error} />
                      ) : (
                        <NumberText tier="input">
                          {key}
                        </NumberText>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.error + "20" }]}
                onPress={handleClear}
              >
                <ThemedText semanticVariant="buttonText" style={{ color: theme.error }}>
                  {t("clear")}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={handleDone}
              >
                <ThemedText semanticVariant="buttonText" style={{ color: theme.buttonText }}>
                  {t("done")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
  },
  label: {
    marginBottom: 2,
  },
  value: {
    minWidth: 0,
  },
  chipContainer: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    minWidth: 90,
    maxWidth: "55%",
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipContentRTL: {
    flexDirection: "row-reverse",
  },
  chipLabel: {
  },
  chipValue: {
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  keypadContainer: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20,
  },
  keypadLabel: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  display: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "flex-end",
  },
  displayText: {
  },
  keysContainer: {
    gap: Spacing.sm,
  },
  keyRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  key: {
    flex: 1,
    aspectRatio: 1.5,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  doneButton: {
    flex: 2,
  },
});

import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { NumberText } from "./NumberText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing, withAlpha } from "@/constants/theme";
import { formatWithCommas } from "@/lib/storage";

interface NumericKeypadProps {
  visible: boolean;
  value: string;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  label?: string;
  textStyle?: StyleProp<TextStyle>;
}

const KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "⌫"],
];

export function NumericKeypad({
  visible,
  value,
  onChangeValue,
  onClose,
  label,
  textStyle,
}: NumericKeypadProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handleKeyPress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const cleanValue = value.replace(/,/g, "");

    if (key === "⌫") {
      onChangeValue(cleanValue.slice(0, -1));
      return;
    }

    if (key === ".") {
      if (cleanValue.includes(".")) return;
      onChangeValue(cleanValue + ".");
      return;
    }

    onChangeValue(cleanValue + key);
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChangeValue("");
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const displayValue = formatWithCommas(value.replace(/,/g, ""));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          styles.overlay,
          { backgroundColor: withAlpha(theme.backgroundRoot, 0.62) },
        ]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundDefault,
              borderTopColor: theme.borderStrong,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {label ? (
            <ThemedText
              semanticVariant="helper"
              style={[styles.label, { color: theme.textSecondary }, textStyle]}
              numeric
            >
              {label}
            </ThemedText>
          ) : null}

          <View
            style={[
              styles.display,
              {
                backgroundColor: theme.surfaceMuted,
                borderColor: theme.borderStrong,
              },
            ]}
          >
            <NumberText tier="output" style={[styles.displayText, textStyle]}>
              {displayValue || "0"}
            </NumberText>
          </View>

          <View style={styles.keypadContainer}>
            {KEYS.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keyRow}>
                {row.map((key) => (
                  <Pressable
                    key={key}
                    style={[
                      styles.key,
                      {
                        backgroundColor:
                          key === "⌫" ? theme.errorSoft : theme.surfaceRaised,
                        shadowColor: theme.cardShadow,
                      },
                    ]}
                    onPress={() => handleKeyPress(key)}
                  >
                    {key === "⌫" ? (
                      <Feather name="delete" size={24} color={theme.error} />
                    ) : (
                      <NumberText tier="input">{key}</NumberText>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.errorSoft,
                  borderColor: theme.error + "30",
                },
              ]}
              onPress={handleClear}
            >
              <ThemedText
                semanticVariant="buttonText"
                style={{ color: theme.error }}
              >
                {t("clear")}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.actionButton,
                styles.doneButton,
                { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={handleDone}
            >
              <ThemedText
                semanticVariant="buttonText"
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
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20,
  },
  label: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  display: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "flex-end",
  },
  displayText: {},
  keypadContainer: {
    gap: Spacing.sm,
  },
  keyRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  key: {
    flex: 1,
    aspectRatio: 1.5,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  doneButton: {
    flex: 2,
  },
});

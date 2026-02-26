import React from "react";
import { View, StyleSheet, Pressable, Modal, type StyleProp, type TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { NumberText } from "./NumberText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
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

export function NumericKeypad({ visible, value, onChangeValue, onClose, label, textStyle }: NumericKeypadProps) {
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
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: theme.backgroundDefault }]} onPress={(e) => e.stopPropagation()}>
          {label ? (
            <ThemedText semanticVariant="helper" style={[styles.label, { color: theme.textSecondary }, textStyle]} numeric>
              {label}
            </ThemedText>
          ) : null}
          
          <View style={[styles.display, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
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
                      { backgroundColor: key === "⌫" ? theme.error + "20" : theme.backgroundSecondary },
                    ]}
                    onPress={() => handleKeyPress(key)}
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
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20,
  },
  label: {
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

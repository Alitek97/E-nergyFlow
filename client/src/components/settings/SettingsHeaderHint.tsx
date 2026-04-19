import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  text: string;
};

export default function SettingsHeaderHint({ text }: Props) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: theme.primary + "14" }]}
      >
        <Feather name="info" size={16} color={theme.primary} />
      </View>
      <ThemedText
        semanticVariant="helper"
        style={[
          styles.text,
          isRTL && styles.textRTL,
          {
            color: theme.textSecondary,
            textAlign: isRTL ? "right" : "left",
          },
        ]}
      >
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.86,
  },
  textRTL: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    opacity: 0.86,
  },
});

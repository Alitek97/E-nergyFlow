import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  text: string;
};

export default function SettingsHeaderHint({ text }: Props) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <View style={styles.container}>
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
    marginTop: 14,
    marginBottom: 18,
    paddingHorizontal: 1,
  },
  text: {
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

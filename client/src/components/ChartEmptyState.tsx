import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing } from "@/constants/theme";

export function ChartEmptyState() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: theme.accentSoft,
            borderColor: theme.borderStrong,
          },
        ]}
      >
        <Feather name="bar-chart-2" size={32} color={theme.primary} />
      </View>
      <ThemedText
        semanticVariant="sectionTitle"
        style={[styles.title, { color: theme.text }]}
      >
        {t("chart_empty_title")}
      </ThemedText>
      <ThemedText
        semanticVariant="helper"
        style={[styles.subtitle, { color: theme.textSecondary }]}
      >
        {t("chart_empty_subtitle")}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 232,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    marginTop: Spacing.xs,
    textAlign: "center",
    maxWidth: 280,
  },
});

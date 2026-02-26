import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { NumberText } from "@/components/NumberText";
import { ThemedText } from "@/components/ThemedText";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";

interface HoursChipProps {
  label: string;
  value: string;
  onPress: () => void;
  testID?: string;
}

export function HoursChip({ label, value, onPress, testID }: HoursChipProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.content, isRTL && styles.contentRTL]}>
        <ThemedText semanticVariant="labelSecondary" numberOfLines={1} style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        <NumberText size="sm" weight="bold" numberOfLines={1} style={[styles.value, { color: theme.text }]}>
          {value || "24"}
        </NumberText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Tweak chip sizing here: adjust container padding/minHeight and label/value font sizes below.
  container: {
    minHeight: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignSelf: "flex-start",
    justifyContent: "center",
    maxWidth: "50%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contentRTL: {
    flexDirection: "row-reverse",
  },
  label: {
    opacity: 0.72,
  },
  value: {
    minWidth: 18,
  },
});

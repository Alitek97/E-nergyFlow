import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { NumberText } from "@/components/NumberText";
import { useTheme } from "@/hooks/useTheme";
import { formatOperatingTime, parseOperatingTime } from "@/utils/operatingTime";

interface HoursChipProps {
  label: string;
  value: string;
  onPress: () => void;
  testID?: string;
}

export function HoursChip({ label, value, onPress, testID }: HoursChipProps) {
  const { theme } = useTheme();
  const displayValue = formatOperatingTime(parseOperatingTime(value || "24"));

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
      <View style={styles.content}>
        <Feather name="clock" size={12} color={theme.textSecondary} />
        <NumberText
          size="sm"
          weight="bold"
          numberOfLines={1}
          style={[styles.value, { color: theme.text }]}
        >
          {displayValue}
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
    maxWidth: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  value: {
    minWidth: 44,
  },
});

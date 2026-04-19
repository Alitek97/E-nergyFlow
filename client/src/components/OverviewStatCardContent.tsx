import React from "react";
import { View, StyleSheet } from "react-native";

import { NumberText } from "@/components/NumberText";
import { ThemedText } from "@/components/ThemedText";
import { ValueWithUnit } from "@/components/ValueWithUnit";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";

interface OverviewStatCardContentProps {
  centered?: boolean;
  label: string;
  value: string | number;
  toneColor: string;
  unit?: string;
}

export function OverviewStatCardContent({
  centered = false,
  label,
  value,
  toneColor,
  unit,
}: OverviewStatCardContentProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <View
      style={[
        styles.content,
        centered
          ? styles.contentCentered
          : { alignItems: isRTL ? "flex-end" : "flex-start" },
      ]}
    >
      <ThemedText
        semanticVariant="tableCellLabel"
        numberOfLines={2}
        style={[
          styles.label,
          {
            color: theme.textSecondary,
            textAlign: centered ? "center" : isRTL ? "right" : "left",
          },
        ]}
      >
        {label}
      </ThemedText>

      {unit ? (
        <ValueWithUnit
          value={value}
          unit={unit}
          type="h3"
          containerStyle={[
            styles.valueUnit,
            centered && styles.valueUnitCentered,
          ]}
          valueStyle={{ color: toneColor }}
          unitStyle={{
            color: theme.textSecondary,
            textAlign: centered ? "center" : undefined,
          }}
        />
      ) : (
        <NumberText
          tier="output"
          style={[
            styles.valueOnly,
            {
              color: toneColor,
              textAlign: centered ? "center" : isRTL ? "right" : "left",
            },
          ]}
        >
          {String(value)}
        </NumberText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    minWidth: 0,
    flex: 1,
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  contentCentered: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    width: "100%",
  },
  valueUnit: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  valueUnitCentered: {
    alignSelf: "center",
    justifyContent: "center",
  },
  valueOnly: {
    textAlign: "left",
  },
});

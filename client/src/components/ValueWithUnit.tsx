import React from "react";
import { View, TextStyle, StyleSheet } from "react-native";
import { NumberText } from "@/components/NumberText";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { type NumberSizeTier } from "@/theme/typography";

// Unit constants - never translated, always displayed in English
export const UNITS = {
  power: "MW",
  energy: "MWh", 
  energyLarge: "GWh",
  gasM3: "m³",
  gasMMscf: "MMscf",
} as const;

interface ValueWithUnitProps {
  value: string | number;
  unit: string;
  valueStyle?: TextStyle;
  unitStyle?: TextStyle;
  type?: "body" | "h2" | "h3" | "h4" | "caption" | "small";
  numberTier?: NumberSizeTier;
}

/**
 * Renders a value with its unit in stable LTR order.
 * Always displays "123.45 MWh" regardless of app direction.
 */
export function ValueWithUnit({ 
  value, 
  unit, 
  valueStyle, 
  unitStyle,
  type = "body",
  numberTier,
}: ValueWithUnitProps) {
  const { theme, typography } = useTheme();
  const themeTextColor = (theme as { colors?: { text?: string } }).colors?.text ?? theme.text;
  const themeMutedTextColor =
    (theme as { colors?: { mutedText?: string } }).colors?.mutedText ?? theme.textSecondary;
  
  const variantByType = {
    h2: "valuePrimary",
    h3: "valueSecondary",
    h4: "tableCellValue",
    body: "tableCellValue",
    caption: "unit",
    small: "helper",
  } as const;
  const unitBaseStyle = typography.getVariantStyle(variantByType[type]);
  const fontSize = unitBaseStyle.fontSize ?? typography.sizes.md;
  const valueColor = valueStyle?.color || themeTextColor;
  const unitColor = unitStyle?.color || themeMutedTextColor;
  
  const resolvedNumberTier: NumberSizeTier =
    numberTier ??
    (type === "h2" ? "final" : type === "h3" ? "output" : type === "caption" || type === "small" ? "small" : "input");

  const valueElement = (
    <NumberText
      key="value"
      tier={resolvedNumberTier}
      style={[
        { 
          color: valueColor,
        },
        valueStyle,
      ]}
    >
      {String(value)}
    </NumberText>
  );
  
  const unitElement = (
    <ThemedText
      key="unit"
      semanticVariant="unit"
      style={[
        { 
          fontSize: fontSize * 0.75,
          lineHeight: Math.round(fontSize * 0.95),
          color: unitColor,
        },
        unitStyle,
      ]}
    >
      {unit}
    </ThemedText>
  );
  
  return (
    <View style={styles.container}>
      {valueElement}
      {unitElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    writingDirection: "ltr",
    alignItems: "baseline",
    gap: 4,
  },
});

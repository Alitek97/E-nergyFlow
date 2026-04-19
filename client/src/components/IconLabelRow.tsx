import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useRTL } from "@/hooks/useRTL";
import { Spacing } from "@/constants/theme";

interface IconLabelRowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconSize?: number;
  iconColor?: string;
  iconBgColor?: string;
  iconCircleSize?: number;
  title: string;
  titleStyle?: any;
  subtitle?: string;
  subtitleStyle?: any;
  rightAccessory?: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
  textContainerStyle?: ViewStyle;
}

export function IconLabelRow({
  icon,
  iconSize = 20,
  iconColor,
  iconBgColor,
  iconCircleSize = 40,
  title,
  titleStyle,
  subtitle,
  subtitleStyle,
  rightAccessory,
  gap: gapProp = Spacing.md,
  style,
  textContainerStyle,
}: IconLabelRowProps) {
  const { theme } = useTheme();
  const { rtlRow, rtlText } = useRTL();

  const resolvedIconColor = iconColor || theme.primary;
  const resolvedIconBg = iconBgColor || resolvedIconColor + "20";

  return (
    <View
      style={[
        styles.row,
        rtlRow,
        rightAccessory ? { justifyContent: "space-between" } : undefined,
        style,
      ]}
    >
      <View style={[styles.leftGroup, rtlRow, { gap: gapProp }]}>
        <View
          style={[
            styles.iconCircle,
            {
              width: iconCircleSize,
              height: iconCircleSize,
              borderRadius: iconCircleSize / 2,
              backgroundColor: resolvedIconBg,
            },
          ]}
        >
          <Feather name={icon} size={iconSize} color={resolvedIconColor} />
        </View>
        <View style={[styles.textBlock, textContainerStyle]}>
          <ThemedText
            type="body"
            weight="semibold"
            style={[rtlText, titleStyle]}
          >
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              type="small"
              style={[{ color: theme.textSecondary }, rtlText, subtitleStyle]}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {rightAccessory}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flexShrink: 1,
  },
});

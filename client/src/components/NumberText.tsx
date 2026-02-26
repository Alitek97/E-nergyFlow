import React from "react";
import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { type NumberSizeTier, type TypographySizeToken } from "@/theme/typography";

type NumberTextWeight = "regular" | "bold";
const NUMBERS_FONT_SIZE_MULTIPLIER = 1.18;

interface NumberTextProps extends Omit<TextProps, "style"> {
  tier?: NumberSizeTier;
  size?: number | NumberSizeTier | TypographySizeToken;
  weight?: NumberTextWeight | "semibold";
  style?: StyleProp<TextStyle>;
}

export function NumberText({
  tier = "input",
  size,
  weight = "regular",
  style,
  ...rest
}: NumberTextProps) {
  const { theme, typography } = useTheme();
  const numericTokenSizes = typography.sizes;
  const themeTextColor = (theme as { colors?: { text?: string } }).colors?.text ?? theme.text;
  const resolvedSize =
    typeof size === "number"
      ? size
      : typeof size === "string"
        ? typography.numberSizes[size as NumberSizeTier] ?? numericTokenSizes[size as TypographySizeToken]
        : typography.numberSizes[tier];
  const isBoldLike = weight === "bold" || weight === "semibold";
  const numbersFontFamily = typography.getNumberFamily(weight);
  const effectiveFontSize =
    numbersFontFamily === typography.getNumberFamily(weight)
      ? Math.round(resolvedSize * NUMBERS_FONT_SIZE_MULTIPLIER) + 2
      : resolvedSize;
  const resolvedLineHeight = Math.round(effectiveFontSize + 6);
  const resolvedMinHeight = resolvedLineHeight + 2;

  return (
    <Text
      {...rest}
      allowFontScaling={rest.allowFontScaling ?? false}
      style={[
        {
          fontFamily: numbersFontFamily,
          fontSize: effectiveFontSize,
          lineHeight: resolvedLineHeight,
          minHeight: resolvedMinHeight,
          letterSpacing: isBoldLike ? 0.8 : 0.4,
          color: themeTextColor,
          includeFontPadding: false,
        },
        {
          writingDirection: "ltr",
          textAlign: "left",
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    />
  );
}

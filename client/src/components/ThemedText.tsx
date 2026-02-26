import React from "react";
import { Text, StyleSheet, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useRTL } from "@/hooks/useRTL";
import { Typography } from "@/constants/theme";
import {
  isArabicText,
  isNumericLikeText,
  type TextWeight,
  type TypographyVariant,
} from "@/theme/typography";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption" | "link";
  weight?: TextWeight;
  variant?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption" | "link";
  semanticVariant?: TypographyVariant;
  numeric?: boolean;
  family?: "auto" | "text" | "numbers" | "mono";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  weight,
  variant,
  semanticVariant,
  numeric,
  family = "auto",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark, typography } = useTheme();
  const { rtlText } = useRTL();
  const themeTextColor = (theme as { colors?: { text?: string } }).colors?.text ?? theme.text;

  const resolvedType = variant ?? type;

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (resolvedType === "link") {
      return theme.link;
    }

    return themeTextColor;
  };

  const getTypeStyle = () => {
    if (semanticVariant) {
      return typography.getVariantStyle(semanticVariant);
    }

    switch (resolvedType) {
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "body":
        return Typography.body;
      case "small":
        return Typography.small;
      case "caption":
        return Typography.caption;
      case "link":
        return Typography.link;
      default:
        return Typography.body;
    }
  };

  const extractText = (value: React.ReactNode): string => {
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map(extractText).join("");
    }

    return "";
  };

  const buildSegmentedChildren = (value: React.ReactNode): React.ReactNode => {
    if (typeof value === "number") {
      const text = String(value);
      return (
        <Text key={`seg-num-${text}`} style={{ fontFamily: typography.getNumberFamily(resolvedWeight) }}>
          {text}
        </Text>
      );
    }

    if (typeof value === "string") {
      const parts = value.match(/([\d\u0660-\u0669+\-.,/:()]+|[^\d\u0660-\u0669+\-.,/:()]+)/g) ?? [value];
      if (parts.length === 1) {
        return value;
      }
      return parts.map((part, index) => {
        const numericPart = isNumericLikeText(part);
        const familyName = numericPart
          ? typography.getNumberFamily(resolvedWeight)
          : typography.getTextFamily(resolvedWeight, isArabicText(part) ? "ar" : "en");
        return (
          <Text key={`seg-${index}-${part}`} style={{ fontFamily: familyName }}>
            {part}
          </Text>
        );
      });
    }

    if (Array.isArray(value)) {
      return value.map((child, index) => (
        <React.Fragment key={`seg-arr-${index}`}>{buildSegmentedChildren(child)}</React.Fragment>
      ));
    }

    return value;
  };

  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const styleWeight = flatStyle?.fontWeight;
  const inferredStyleWeight: TextWeight | undefined =
    styleWeight === "700" || styleWeight === "800" || styleWeight === "900" || styleWeight === "bold"
      ? "bold"
      : styleWeight === "500" || styleWeight === "600"
        ? "semibold"
        : undefined;
  const resolvedWeight: TextWeight =
    weight ??
    inferredStyleWeight ??
    (resolvedType === "h1" || resolvedType === "h2" || resolvedType === "h3" || resolvedType === "h4"
      ? "semibold"
      : "regular");
  const contentText = extractText(rest.children);
  const shouldUseNumericFont = numeric ?? isNumericLikeText(contentText);
  const autoFontFamily =
    family === "mono"
      ? typography.monospace
      : family === "numbers"
        ? typography.getNumberFamily(resolvedWeight)
        : family === "text"
          ? typography.getTextFamily(resolvedWeight)
          : shouldUseNumericFont
            ? typography.getNumberFamily(resolvedWeight)
            : typography.getUIFamily(resolvedWeight);
  const segmentedChildren =
    family === "auto" && (typeof rest.children === "string" || typeof rest.children === "number" || Array.isArray(rest.children))
      ? buildSegmentedChildren(rest.children)
      : rest.children;

  return (
    <Text
      allowFontScaling={rest.allowFontScaling ?? false}
      style={[
        getTypeStyle(),
        { color: getColor() },
        { includeFontPadding: false },
        rtlText,
        style,
        { fontFamily: autoFontFamily },
      ]}
      {...rest}
    >
      {segmentedChildren}
    </Text>
  );
}

import React from "react";
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { FONT_FAMILIES } from "@/theme/fonts";

type FeederCodeProps = Omit<TextProps, "children"> & {
  code: string;
  style?: StyleProp<TextStyle>;
};

export function FeederCode({ code, style, ...rest }: FeederCodeProps) {
  const { theme } = useTheme();

  return (
    <Text
      allowFontScaling={false}
      {...rest}
      style={[styles.base, { color: theme.text }, style]}
    >
      {code}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT_FAMILIES.englishSemiBold,
    fontWeight: "600",
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: "center",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
});

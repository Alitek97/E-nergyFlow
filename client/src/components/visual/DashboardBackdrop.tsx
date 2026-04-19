import React from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

type DashboardBackdropProps = {
  intensity?: "subtle" | "default";
};

export function DashboardBackdrop({
  intensity = "default",
}: DashboardBackdropProps) {
  const { theme, isDark } = useTheme();
  const orbOpacity = intensity === "subtle" ? 0.12 : isDark ? 0.2 : 0.14;
  const secondaryOpacity = intensity === "subtle" ? 0.08 : isDark ? 0.14 : 0.1;
  const lineOpacity = intensity === "subtle" ? 0.24 : 0.38;

  return (
    <View pointerEvents="none" style={styles.container}>
      <View
        style={[
          styles.base,
          {
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      />
      <View
        style={[
          styles.orbLarge,
          {
            backgroundColor: withAlpha(theme.accent2, orbOpacity),
            borderColor: withAlpha(theme.accent, 0.18),
          },
        ]}
      />
      <View
        style={[
          styles.orbTop,
          {
            backgroundColor: withAlpha(theme.primary, secondaryOpacity),
          },
        ]}
      />
      <View
        style={[
          styles.orbBottom,
          {
            backgroundColor: withAlpha(theme.success, secondaryOpacity),
          },
        ]}
      />
      <View
        style={[
          styles.meshCard,
          {
            backgroundColor: withAlpha(
              theme.surfaceRaised,
              isDark ? 0.28 : 0.5,
            ),
            borderColor: withAlpha(theme.borderStrong, lineOpacity),
          },
        ]}
      />
      <View
        style={[
          styles.meshLineHorizontal,
          { backgroundColor: withAlpha(theme.borderStrong, lineOpacity) },
        ]}
      />
      <View
        style={[
          styles.meshLineVertical,
          { backgroundColor: withAlpha(theme.borderStrong, lineOpacity) },
        ]}
      />
    </View>
  );
}

function withAlpha(hexColor: string, alpha: number) {
  const sanitized = hexColor.replace("#", "");
  if (sanitized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(sanitized.slice(0, 2), 16);
  const green = Number.parseInt(sanitized.slice(2, 4), 16);
  const blue = Number.parseInt(sanitized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  base: {
    ...StyleSheet.absoluteFillObject,
  },
  orbLarge: {
    position: "absolute",
    top: -120,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 140,
    borderWidth: 1,
  },
  orbTop: {
    position: "absolute",
    top: 84,
    left: -54,
    width: 148,
    height: 148,
    borderRadius: 74,
  },
  orbBottom: {
    position: "absolute",
    bottom: 72,
    right: -32,
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  meshCard: {
    position: "absolute",
    top: 182,
    right: 16,
    width: 112,
    height: 112,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    transform: [{ rotate: "10deg" }],
  },
  meshLineHorizontal: {
    position: "absolute",
    top: 234,
    left: 18,
    right: 128,
    height: StyleSheet.hairlineWidth,
  },
  meshLineVertical: {
    position: "absolute",
    top: 210,
    right: 74,
    width: StyleSheet.hairlineWidth,
    height: 156,
  },
});

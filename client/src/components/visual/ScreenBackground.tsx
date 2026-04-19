import React, { memo, useMemo } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Line, Pattern, Rect } from "react-native-svg";
import { withAlpha } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

type ScreenBackgroundProps = {
  enabled?: boolean;
  disableOnLowEnd?: boolean;
  opacity?: number;
};

function isLowEndDevice() {
  return Platform.OS === "android" && Number(Platform.Version) < 29;
}

function ScreenBackgroundComponent({
  enabled = true,
  disableOnLowEnd = true,
  opacity = 0.06,
}: ScreenBackgroundProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isDisabled = disableOnLowEnd && isLowEndDevice();
  const shouldRender = enabled && !isDisabled;

  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const patternSize = 44;
  const lineColor = withAlpha(theme.primary, 0.9);
  const dotColor = withAlpha(theme.accent2, 0.6);
  const softTrackColor = withAlpha(theme.primary, 0.55);

  const renderedOpacity = useMemo(
    () => Math.max(0.04, Math.min(0.08, opacity)),
    [opacity],
  );

  if (!shouldRender) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      <Svg width={safeWidth} height={safeHeight}>
        <Defs>
          <Pattern
            id="pcb-grid"
            width={patternSize}
            height={patternSize}
            patternUnits="userSpaceOnUse"
          >
            <Rect
              x="0"
              y="0"
              width={patternSize}
              height={patternSize}
              fill="transparent"
            />
            <Line
              x1="0"
              y1="0"
              x2={patternSize}
              y2="0"
              stroke={lineColor}
              strokeOpacity={0.7}
              strokeWidth="0.6"
            />
            <Line
              x1="0"
              y1="0"
              x2="0"
              y2={patternSize}
              stroke={lineColor}
              strokeOpacity={0.7}
              strokeWidth="0.6"
            />
            <Circle
              cx={patternSize / 2}
              cy={patternSize / 2}
              r="0.9"
              fill={dotColor}
            />
          </Pattern>
        </Defs>

        <Rect
          x="0"
          y="0"
          width={safeWidth}
          height={safeHeight}
          fill="url(#pcb-grid)"
          opacity={renderedOpacity}
        />

        <Line
          x1={safeWidth * 0.06}
          y1={safeHeight * 0.2}
          x2={safeWidth * 0.92}
          y2={safeHeight * 0.2}
          stroke={softTrackColor}
          strokeWidth="2.4"
          strokeOpacity={0.14}
        />
        <Line
          x1={safeWidth * 0.1}
          y1={safeHeight * 0.64}
          x2={safeWidth * 0.86}
          y2={safeHeight * 0.64}
          stroke={softTrackColor}
          strokeWidth="2.4"
          strokeOpacity={0.12}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 0,
  },
});

export const ScreenBackground = memo(ScreenBackgroundComponent);

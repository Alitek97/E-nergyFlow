import React, { memo, useMemo } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { withAlpha } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

type ScadaGridOverlayProps = {
  enabled?: boolean;
  disableOnLowEnd?: boolean;
  opacity?: number;
  showDots?: boolean;
};

function isLowEndDevice() {
  return Platform.OS === "android" && Number(Platform.Version) < 29;
}

function ScadaGridOverlayComponent({
  enabled = true,
  disableOnLowEnd = true,
  opacity = 0.05,
  showDots = true,
}: ScadaGridOverlayProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isDisabled = disableOnLowEnd && isLowEndDevice();
  const shouldRender = enabled && !isDisabled;

  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const majorStep = 80;
  const minorStep = 40;

  const safeOpacity = useMemo(
    () => Math.max(0.03, Math.min(0.06, opacity)),
    [opacity],
  );

  const verticalLines = useMemo(() => {
    const lines: number[] = [];
    for (let x = 0; x <= safeWidth; x += minorStep) {
      lines.push(x);
    }
    return lines;
  }, [safeWidth]);

  const horizontalLines = useMemo(() => {
    const lines: number[] = [];
    for (let y = 0; y <= safeHeight; y += minorStep) {
      lines.push(y);
    }
    return lines;
  }, [safeHeight]);

  if (!shouldRender) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      <Svg width={safeWidth} height={safeHeight}>
        {verticalLines.map((x) => (
          <Line
            key={`v-${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={safeHeight}
            stroke={withAlpha(theme.primary, 0.85)}
            strokeWidth={x % majorStep === 0 ? 0.5 : 0.3}
            strokeOpacity={safeOpacity}
          />
        ))}
        {horizontalLines.map((y) => (
          <Line
            key={`h-${y}`}
            x1={0}
            y1={y}
            x2={safeWidth}
            y2={y}
            stroke={withAlpha(theme.primary, 0.85)}
            strokeWidth={y % majorStep === 0 ? 0.5 : 0.3}
            strokeOpacity={safeOpacity}
          />
        ))}
        {showDots &&
          verticalLines
            .filter((x) => x % majorStep === 0)
            .flatMap((x) =>
              horizontalLines
                .filter((y) => y % majorStep === 0)
                .map((y) => (
                  <Circle
                    key={`d-${x}-${y}`}
                    cx={x}
                    cy={y}
                    r="0.8"
                    fill={withAlpha(theme.accent2, 0.8)}
                    fillOpacity={safeOpacity}
                  />
                )),
            )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 1,
  },
});

export const ScadaGridOverlay = memo(ScadaGridOverlayComponent);

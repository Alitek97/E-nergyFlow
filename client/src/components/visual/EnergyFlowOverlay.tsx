import React, { memo, useEffect, useMemo } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { withAlpha } from "@/constants/theme";

type EnergyFlowOverlayProps = {
  enabled?: boolean;
  disableOnLowEnd?: boolean;
  opacity?: number;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

function isLowEndDevice() {
  return Platform.OS === "android" && Number(Platform.Version) < 29;
}

function EnergyFlowOverlayComponent({
  enabled = true,
  disableOnLowEnd = true,
  opacity = 0.1,
}: EnergyFlowOverlayProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isDisabled = disableOnLowEnd && isLowEndDevice();
  const shouldRender = enabled && !isDisabled;

  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const strokeOpacity = useMemo(
    () => Math.max(0.06, Math.min(0.12, opacity)),
    [opacity],
  );

  const path1 = useMemo(
    () =>
      `M ${safeWidth * 0.02} ${safeHeight * 0.24} C ${safeWidth * 0.22} ${safeHeight * 0.16}, ${safeWidth * 0.58} ${
        safeHeight * 0.34
      }, ${safeWidth * 0.98} ${safeHeight * 0.24}`,
    [safeHeight, safeWidth],
  );
  const path2 = useMemo(
    () =>
      `M ${safeWidth * 0.03} ${safeHeight * 0.52} C ${safeWidth * 0.28} ${safeHeight * 0.44}, ${safeWidth * 0.6} ${
        safeHeight * 0.64
      }, ${safeWidth * 0.97} ${safeHeight * 0.52}`,
    [safeHeight, safeWidth],
  );
  const path3 = useMemo(
    () =>
      `M ${safeWidth * 0.01} ${safeHeight * 0.78} C ${safeWidth * 0.24} ${safeHeight * 0.7}, ${safeWidth * 0.56} ${
        safeHeight * 0.88
      }, ${safeWidth * 0.99} ${safeHeight * 0.78}`,
    [safeHeight, safeWidth],
  );

  const dashOffset1 = useSharedValue(0);
  const dashOffset2 = useSharedValue(28);
  const dashOffset3 = useSharedValue(56);

  useEffect(() => {
    if (!shouldRender) {
      cancelAnimation(dashOffset1);
      cancelAnimation(dashOffset2);
      cancelAnimation(dashOffset3);
      return;
    }

    dashOffset1.value = withRepeat(
      withTiming(-120, { duration: 16000, easing: Easing.linear }),
      -1,
      false,
    );
    dashOffset2.value = withRepeat(
      withTiming(-120, { duration: 18000, easing: Easing.linear }),
      -1,
      false,
    );
    dashOffset3.value = withRepeat(
      withTiming(-120, { duration: 20000, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(dashOffset1);
      cancelAnimation(dashOffset2);
      cancelAnimation(dashOffset3);
    };
  }, [dashOffset1, dashOffset2, dashOffset3, shouldRender]);

  const animatedProps1 = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset1.value,
  }));
  const animatedProps2 = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset2.value,
  }));
  const animatedProps3 = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset3.value,
  }));

  if (!shouldRender) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      <Svg width={safeWidth} height={safeHeight}>
        <AnimatedPath
          d={path1}
          animatedProps={animatedProps1}
          stroke={theme.primary}
          strokeWidth={1.5}
          strokeOpacity={strokeOpacity}
          fill="none"
          strokeDasharray="10 14"
          strokeLinecap="round"
        />
        <AnimatedPath
          d={path2}
          animatedProps={animatedProps2}
          stroke={theme.accent2}
          strokeWidth={1.4}
          strokeOpacity={strokeOpacity * 0.9}
          fill="none"
          strokeDasharray="8 12"
          strokeLinecap="round"
        />
        <AnimatedPath
          d={path3}
          animatedProps={animatedProps3}
          stroke={withAlpha(theme.primary, 0.72)}
          strokeWidth={1.3}
          strokeOpacity={strokeOpacity * 0.8}
          fill="none"
          strokeDasharray="9 15"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 2,
  },
});

export const EnergyFlowOverlay = memo(EnergyFlowOverlayComponent);

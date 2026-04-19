import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { withAlpha } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark, typography } = useTheme();
  const headerBackgroundColor = transparent
    ? withAlpha(theme.backgroundRoot, isDark ? 0.78 : 0.84)
    : theme.backgroundRoot;

  return {
    headerTitleAlign: "center",
    headerTitleStyle: {
      fontFamily: typography.uiSemiBold,
      fontSize: typography.scale.subheading,
      color: theme.text,
    },
    autoHideHomeIndicator: Platform.OS === "ios",
    headerTransparent: transparent,
    headerBlurEffect: isDark ? "dark" : "light",
    headerTintColor: theme.text,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: undefined,
        android: headerBackgroundColor,
        web: headerBackgroundColor,
      }),
    },
    headerShadowVisible: false,
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import ReportsScreen from "@/screens/ReportsScreen";
import CalculationsScreen from "@/screens/CalculationsScreen";
import MonthsScreen from "@/screens/MonthsScreen";
import MonthDaysScreen from "@/screens/MonthDaysScreen";
import DayDetailsScreen from "@/screens/DayDetailsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { withAlpha } from "@/constants/theme";
import { withSecondaryGroupSwipe } from "@/navigation/SecondaryGroupSwipe";

export type ReportsStackParamList = {
  Reports: undefined;
  MonthsScreen: undefined;
  MonthDaysScreen: { monthKey: string };
  DayDetailsScreen: { dateKey: string; monthKey?: string };
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();
const SwipeableReportsScreen = withSecondaryGroupSwipe(
  "ReportsTab",
  ReportsScreen,
  {
    rightPreviewComponent: CalculationsScreen,
  },
);

export default function ReportsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t, isRTL } = useLanguage();
  const { theme, isDark } = useTheme();
  const backButtonBackground = isDark
    ? withAlpha(theme.text, 0.06)
    : withAlpha(theme.backgroundDefault, 0.82);
  const backButtonBorder = withAlpha(theme.text, isDark ? 0.08 : 0.06);
  const backButtonShadow = withAlpha(theme.text, isDark ? 0.22 : 0.12);

  const renderBackButton = (onPress: () => void, side: "left" | "right") => (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.backButtonBase,
        side === "right" ? styles.backButtonRight : styles.backButtonLeft,
        {
          backgroundColor: backButtonBackground,
          borderColor: backButtonBorder,
          shadowColor: backButtonShadow,
        },
        pressed && styles.backButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isRTL ? "رجوع" : "Back"}
    >
      <Feather
        name={isRTL ? "chevron-right" : "chevron-left"}
        size={18}
        color={theme.text}
      />
    </Pressable>
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Reports"
        component={SwipeableReportsScreen}
        options={{
          title: t("tab_reports"),
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="MonthsScreen"
        component={MonthsScreen}
        options={({ navigation }) => ({
          title: t("previous_months"),
          headerTitleAlign: "center",
          headerBackVisible: false,
          ...(isRTL
            ? {
                headerRight: ({ canGoBack }) =>
                  canGoBack
                    ? renderBackButton(navigation.goBack, "right")
                    : null,
              }
            : {
                headerLeft: ({ canGoBack }) =>
                  canGoBack
                    ? renderBackButton(navigation.goBack, "left")
                    : null,
              }),
        })}
      />
      <Stack.Screen
        name="MonthDaysScreen"
        component={MonthDaysScreen}
        options={({ navigation }) => ({
          title: t("monthly_readings_title"),
          headerTitleAlign: "center",
          headerBackVisible: false,
          ...(isRTL
            ? {
                headerRight: ({ canGoBack }) =>
                  canGoBack
                    ? renderBackButton(navigation.goBack, "right")
                    : null,
              }
            : {
                headerLeft: ({ canGoBack }) =>
                  canGoBack
                    ? renderBackButton(navigation.goBack, "left")
                    : null,
              }),
        })}
      />
      <Stack.Screen
        name="DayDetailsScreen"
        component={DayDetailsScreen}
        options={({ navigation }) => ({
          title: t("daily_report"),
          headerTitleAlign: "center",
          headerBackVisible: false,
          ...(isRTL
            ? {
                headerRight: ({ canGoBack }) =>
                  canGoBack
                    ? renderBackButton(navigation.goBack, "right")
                    : null,
              }
            : {
                headerLeft: ({ canGoBack }) =>
                  canGoBack
                    ? renderBackButton(navigation.goBack, "left")
                    : null,
              }),
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  backButtonBase: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  backButtonLeft: {
    marginLeft: 6,
  },
  backButtonRight: {
    marginRight: 6,
  },
  backButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});

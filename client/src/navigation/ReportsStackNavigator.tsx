import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import ReportsScreen from "@/screens/ReportsScreen";
import MonthsScreen from "@/screens/MonthsScreen";
import MonthDaysScreen from "@/screens/MonthDaysScreen";
import DayDetailsScreen from "@/screens/DayDetailsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";

export type ReportsStackParamList = {
  Reports: undefined;
  MonthsScreen: undefined;
  MonthDaysScreen: { monthKey: string };
  DayDetailsScreen: { dateKey: string; monthKey?: string };
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export default function ReportsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();

  const renderBackButton = (onPress: () => void, side: "left" | "right") => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.backButtonBase,
        side === "right" ? styles.backButtonRight : styles.backButtonLeft,
        pressed && styles.backButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isRTL ? "رجوع" : "Back"}
    >
      <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerTitle: () => <HeaderTitle title={t("tab_reports")} />,
        }}
      />
      <Stack.Screen
        name="MonthsScreen"
        component={MonthsScreen}
        options={({ navigation }) => ({
          headerTitle: () => <HeaderTitle title={t("previous_months")} />,
          headerBackVisible: false,
          ...(isRTL
            ? {
                headerRight: ({ canGoBack }) => (canGoBack ? renderBackButton(navigation.goBack, "right") : null),
              }
            : {
                headerLeft: ({ canGoBack }) => (canGoBack ? renderBackButton(navigation.goBack, "left") : null),
              }),
        })}
      />
      <Stack.Screen
        name="MonthDaysScreen"
        component={MonthDaysScreen}
        options={({ navigation }) => ({
          headerTitle: () => <HeaderTitle title={t("monthly_readings_title")} />,
          headerBackVisible: false,
          ...(isRTL
            ? {
                headerRight: ({ canGoBack }) => (canGoBack ? renderBackButton(navigation.goBack, "right") : null),
              }
            : {
                headerLeft: ({ canGoBack }) => (canGoBack ? renderBackButton(navigation.goBack, "left") : null),
              }),
        })}
      />
      <Stack.Screen
        name="DayDetailsScreen"
        component={DayDetailsScreen}
        options={({ navigation }) => ({
          headerTitle: () => <HeaderTitle title={t("daily_report")} />,
          headerBackVisible: false,
          ...(isRTL
            ? {
                headerRight: ({ canGoBack }) => (canGoBack ? renderBackButton(navigation.goBack, "right") : null),
              }
            : {
                headerLeft: ({ canGoBack }) => (canGoBack ? renderBackButton(navigation.goBack, "left") : null),
              }),
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  backButtonBase: {
    minWidth: 34,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  backButtonLeft: {
    marginLeft: 2,
  },
  backButtonRight: {
    marginRight: 2,
  },
  backButtonPressed: {
    opacity: 0.55,
  },
});

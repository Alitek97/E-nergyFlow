import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import FeedersStackNavigator from "@/navigation/FeedersStackNavigator";
import TurbinesStackNavigator from "@/navigation/TurbinesStackNavigator";
import CalculationsStackNavigator from "@/navigation/CalculationsStackNavigator";
import ReportsStackNavigator from "@/navigation/ReportsStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";

export type MainTabParamList = {
  FeedersTab: undefined;
  TurbinesTab: undefined;
  CalculationsTab: undefined;
  ReportsTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabConfig = {
  name: keyof MainTabParamList;
  component: React.ComponentType<object>;
  titleKey: "tab_feeders" | "tab_turbines" | "tab_calculations" | "tab_reports" | "tab_settings";
  iconName: "activity" | "wind" | "cpu" | "file-text" | "settings";
};

const TAB_SCREENS: TabConfig[] = [
  { name: "FeedersTab", component: FeedersStackNavigator, titleKey: "tab_feeders", iconName: "activity" },
  { name: "TurbinesTab", component: TurbinesStackNavigator, titleKey: "tab_turbines", iconName: "wind" },
  { name: "CalculationsTab", component: CalculationsStackNavigator, titleKey: "tab_calculations", iconName: "cpu" },
  { name: "ReportsTab", component: ReportsStackNavigator, titleKey: "tab_reports", iconName: "file-text" },
  { name: "SettingsTab", component: SettingsStackNavigator, titleKey: "tab_settings", iconName: "settings" },
];

export default function MainTabNavigator() {
  const { theme, isDark, typography } = useTheme();
  const { t, isRTL } = useLanguage();
  const screens = isRTL ? [...TAB_SCREENS].reverse() : TAB_SCREENS;
  const initialRouteName = screens[0].name;

  return (
    <Tab.Navigator
      key={isRTL ? "rtl-tabs" : "ltr-tabs"}
      initialRouteName={initialRouteName}
      screenOptions={{
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          ...typography.getVariantStyle("tabLabel"),
          writingDirection: isRTL ? "rtl" : "ltr",
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.tabBarBg,
            web: theme.tabBarBg,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : null,
        headerShown: false,
      }}
    >
      {screens.map((screen) => (
        <Tab.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={{
            title: t(screen.titleKey),
            tabBarIcon: ({ color, size }) => <Feather name={screen.iconName} size={size} color={color} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

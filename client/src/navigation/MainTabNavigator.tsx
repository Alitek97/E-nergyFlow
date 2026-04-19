import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeedersStackNavigator from "@/navigation/FeedersStackNavigator";
import TurbinesStackNavigator from "@/navigation/TurbinesStackNavigator";
import CalculationsStackNavigator from "@/navigation/CalculationsStackNavigator";
import ReportsStackNavigator from "@/navigation/ReportsStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import FocusedTileTabBar from "@/navigation/FocusedTileTabBar";
import {
  type MainTabRouteName,
  type MainTabTitleKey,
  PRIMARY_TAB_GROUPS,
} from "@/navigation/hybridTabConfig";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

export type MainTabParamList = {
  FeedersTab: undefined;
  TurbinesTab: undefined;
  CalculationsTab: undefined;
  ReportsTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabConfig = {
  name: MainTabRouteName;
  component: React.ComponentType<object>;
  titleKey: MainTabTitleKey;
};

const TAB_SCREENS: TabConfig[] = [
  {
    name: "FeedersTab",
    component: FeedersStackNavigator,
    titleKey: "tab_feeders",
  },
  {
    name: "TurbinesTab",
    component: TurbinesStackNavigator,
    titleKey: "tab_turbines",
  },
  {
    name: "CalculationsTab",
    component: CalculationsStackNavigator,
    titleKey: "tab_calculations",
  },
  {
    name: "ReportsTab",
    component: ReportsStackNavigator,
    titleKey: "tab_reports",
  },
  {
    name: "SettingsTab",
    component: SettingsStackNavigator,
    titleKey: "tab_settings",
  },
];

export default function MainTabNavigator() {
  const { theme, typography, isDark } = useTheme();
  const { t, language } = useLanguage();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const initialRouteName: keyof MainTabParamList = "FeedersTab";
  const isRTL = language === "ar";
  const primaryGroups = React.useMemo(
    () =>
      PRIMARY_TAB_GROUPS.map((group) => ({
        ...group,
        label: t(group.titleKey),
      })),
    [t],
  );
  const iconSize = layout.isPhone ? 21 : layout.isLargeTablet ? 24 : 22;
  const labelSize = layout.isPhone
    ? isRTL
      ? 10.7
      : 11.7
    : layout.isLargeTablet
      ? 12.6
      : 12.1;
  const collapsedDockHeight = layout.isPhone
    ? 86
    : layout.isLargeTablet
      ? 96
      : 90;
  const segmentedRowHeight = layout.isPhone
    ? 44
    : layout.isLargeTablet
      ? 48
      : 46;
  const tabBarBottomPadding = layout.isIOS
    ? Math.max(insets.bottom, 10)
    : layout.isPhone
      ? 8
      : 10;
  const tabBarHeight =
    collapsedDockHeight + segmentedRowHeight + 18 + tabBarBottomPadding;
  const maxContentWidth = layout.isLargeTablet
    ? 520
    : layout.isTablet
      ? 440
      : Math.min(layout.screenWidth - 2 * 16, 392);

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarStyle: createTabBarStyle(tabBarHeight),
      }}
      tabBar={(props) => {
        return (
          <FocusedTileTabBar
            {...props}
            primaryGroups={primaryGroups}
            theme={theme}
            typography={typography}
            isDark={isDark}
            isRTL={isRTL}
            iconSize={iconSize}
            labelSize={labelSize}
            collapsedDockHeight={collapsedDockHeight}
            segmentedRowHeight={segmentedRowHeight}
            barHeight={tabBarHeight}
            bottomPadding={tabBarBottomPadding}
            maxContentWidth={maxContentWidth}
          />
        );
      }}
    >
      {TAB_SCREENS.map((screen) => (
        <Tab.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={{
            title: t(screen.titleKey),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function createTabBarStyle(height: number) {
  return {
    height,
    position: "absolute" as const,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 0,
  };
}

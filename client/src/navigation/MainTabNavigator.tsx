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
import {
  getResponsiveValue,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";

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
  const iconSize = getResponsiveValue(layout, {
    compactPhone: 20,
    largePhone: 21,
    widePhone: 22,
    tablet: 22,
    largeTablet: 24,
    default: 21,
  });
  const labelSize = getResponsiveValue(layout, {
    compactPhone: isRTL ? 10.3 : 11.1,
    largePhone: isRTL ? 10.7 : 11.7,
    widePhone: isRTL ? 11.2 : 12,
    tablet: 12.1,
    largeTablet: 12.6,
    default: isRTL ? 10.7 : 11.7,
  });
  const collapsedDockHeight = getResponsiveValue(layout, {
    compactPhone: 82,
    largePhone: 86,
    widePhone: 88,
    tablet: 90,
    largeTablet: 96,
    default: 86,
  });
  const segmentedRowHeight = getResponsiveValue(layout, {
    compactPhone: 42,
    largePhone: 44,
    widePhone: 45,
    tablet: 46,
    largeTablet: 48,
    default: 44,
  });
  const tabBarBottomPadding = layout.isIOS
    ? Math.max(insets.bottom, 10)
    : layout.isWideLayout
      ? 10
      : 8;
  const tabBarHeight =
    collapsedDockHeight + segmentedRowHeight + 18 + tabBarBottomPadding;
  const phoneTabBarMaxWidth = getResponsiveValue(layout, {
    compactPhone: 344,
    largePhone: 392,
    widePhone: 468,
    tablet: layout.isLandscape ? 520 : 468,
    largeTablet: layout.isLandscape ? 620 : 520,
    default: 392,
  });
  const tabletTabBarMaxWidth = layout.isLandscape ? 640 : 560;
  const maxContentWidth = Math.min(
    layout.contentWidth,
    layout.isWide ? tabletTabBarMaxWidth : phoneTabBarMaxWidth,
  );

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

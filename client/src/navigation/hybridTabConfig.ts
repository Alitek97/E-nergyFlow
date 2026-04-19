import type { SFSymbol } from "expo-symbols";

export type MainTabRouteName =
  | "FeedersTab"
  | "TurbinesTab"
  | "CalculationsTab"
  | "ReportsTab"
  | "SettingsTab";

export type MainTabGroupId = "operations" | "analysis" | "settings";
export type SecondarySwipeDirection = "left" | "right";

export type MainTabTitleKey =
  | "tab_feeders"
  | "tab_turbines"
  | "tab_calculations"
  | "tab_reports"
  | "tab_settings";

export type PrimaryTabTitleKey =
  | "tab_operations"
  | "tab_analysis"
  | "tab_settings";

export type PrimaryTabGroup = {
  defaultRoute: MainTabRouteName;
  iconName: "activity" | "bar-chart-2" | "settings";
  id: MainTabGroupId;
  iosSymbolName: SFSymbol;
  routes: MainTabRouteName[];
  titleKey: PrimaryTabTitleKey;
};

export type ResolvedPrimaryTabGroup = PrimaryTabGroup & {
  label: string;
};

export const PRIMARY_TAB_GROUPS: PrimaryTabGroup[] = [
  {
    id: "operations",
    titleKey: "tab_operations",
    iconName: "activity",
    iosSymbolName: "bolt.fill",
    routes: ["FeedersTab", "TurbinesTab"],
    defaultRoute: "FeedersTab",
  },
  {
    id: "analysis",
    titleKey: "tab_analysis",
    iconName: "bar-chart-2",
    iosSymbolName: "chart.bar.xaxis",
    routes: ["CalculationsTab", "ReportsTab"],
    defaultRoute: "CalculationsTab",
  },
  {
    id: "settings",
    titleKey: "tab_settings",
    iconName: "settings",
    iosSymbolName: "gearshape.fill",
    routes: ["SettingsTab"],
    defaultRoute: "SettingsTab",
  },
];

export const TAB_ROUTE_TO_GROUP: Record<MainTabRouteName, MainTabGroupId> = {
  FeedersTab: "operations",
  TurbinesTab: "operations",
  CalculationsTab: "analysis",
  ReportsTab: "analysis",
  SettingsTab: "settings",
};

export const TAB_DEFAULT_ROUTE_BY_GROUP: Record<
  MainTabGroupId,
  MainTabRouteName
> = PRIMARY_TAB_GROUPS.reduce(
  (accumulator, group) => ({
    ...accumulator,
    [group.id]: group.defaultRoute,
  }),
  {
    operations: "FeedersTab",
    analysis: "CalculationsTab",
    settings: "SettingsTab",
  } satisfies Record<MainTabGroupId, MainTabRouteName>,
);

export function getGroupForRoute(routeName: MainTabRouteName): MainTabGroupId {
  return TAB_ROUTE_TO_GROUP[routeName];
}

export function groupShowsSegmentedControl(groupId: MainTabGroupId) {
  const group = PRIMARY_TAB_GROUPS.find((entry) => entry.id === groupId);
  return (group?.routes.length ?? 0) > 1;
}

export function getSiblingRouteForSwipe(
  routeName: MainTabRouteName,
  direction: SecondarySwipeDirection,
) {
  const group = PRIMARY_TAB_GROUPS.find((entry) =>
    entry.routes.includes(routeName),
  );

  if (!group || group.routes.length < 2) {
    return null;
  }

  const routeIndex = group.routes.indexOf(routeName);

  if (routeIndex === -1) {
    return null;
  }

  const nextIndex = routeIndex + (direction === "left" ? 1 : -1);

  return group.routes[nextIndex] ?? null;
}

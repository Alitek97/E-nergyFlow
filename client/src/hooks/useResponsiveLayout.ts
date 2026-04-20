import { useMemo } from "react";
import { Platform, useWindowDimensions, type ViewStyle } from "react-native";

export type DeviceType = "phone" | "tablet" | "large-tablet";
export type DeviceCategory = "compact-phone" | "large-phone" | "tablet";

export interface ResponsiveLayout {
  deviceType: DeviceType;
  deviceCategory: DeviceCategory;
  isTablet: boolean;
  isPhone: boolean;
  isLargeTablet: boolean;
  isCompactPhone: boolean;
  isLargePhone: boolean;
  isLandscape: boolean;
  isWideLayout: boolean;
  shouldCenterContent: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  shortestSide: number;
  longestSide: number;
  columns: number;
  formColumns: number;
  statsColumns: number;
  contentWidth: number;
  contentMaxWidth: number;
  horizontalPadding: number;
  gridGap: number;
  sectionGap: number;
  cardWidth: number | "100%";
}

type ResponsiveVariantMap<T> = {
  compactPhone?: T;
  largePhone?: T;
  widePhone?: T;
  tablet?: T;
  tabletLandscape?: T;
  largeTablet?: T;
  largeTabletLandscape?: T;
  default: T;
};

type ResponsiveScrollContentStyleOptions = {
  headerHeight: number;
  tabBarHeight: number;
  topSpacing?: number;
  bottomSpacing?: number;
  horizontalPadding?: number;
  maxWidth?: number;
};

export const TABLET_MIN_SHORTEST_SIDE = 600;
export const LARGE_TABLET_MIN_SHORTEST_SIDE = 820;
export const COMPACT_PHONE_MAX_SHORTEST_SIDE = 389;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getResponsiveLayout(width: number, height: number): ResponsiveLayout {
  const screenWidth = Math.max(0, width);
  const screenHeight = Math.max(0, height);
  const shortestSide = Math.min(screenWidth, screenHeight);
  const longestSide = Math.max(screenWidth, screenHeight);
  const isLandscape = screenWidth > screenHeight;
  const isTablet = shortestSide >= TABLET_MIN_SHORTEST_SIDE;
  const isLargeTablet =
    isTablet &&
    (shortestSide >= LARGE_TABLET_MIN_SHORTEST_SIDE || longestSide >= 1180);
  const isCompactPhone =
    !isTablet && shortestSide <= COMPACT_PHONE_MAX_SHORTEST_SIDE;
  const isLargePhone = !isTablet && !isCompactPhone;
  const deviceCategory: DeviceCategory = isTablet
    ? "tablet"
    : isCompactPhone
      ? "compact-phone"
      : "large-phone";
  const deviceType: DeviceType = isLargeTablet
    ? "large-tablet"
    : isTablet
      ? "tablet"
      : "phone";
  const isWideLayout = isTablet || screenWidth >= 700;
  const shouldCenterContent = isWideLayout;
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  const horizontalPadding = isTablet
    ? isLandscape
      ? isLargeTablet
        ? 40
        : 32
      : isLargeTablet
        ? 32
        : 24
    : isWideLayout
      ? 24
      : isCompactPhone
        ? 14
        : 18;
  const availableContentWidth = Math.max(
    screenWidth - horizontalPadding * 2,
    0,
  );

  const targetContentMaxWidth = isLargeTablet
    ? isLandscape
      ? 1220
      : 980
    : isTablet
      ? isLandscape
        ? 1100
        : 860
      : isWideLayout
        ? 860
        : availableContentWidth;
  const contentMaxWidth = shouldCenterContent
    ? Math.min(availableContentWidth, targetContentMaxWidth)
    : availableContentWidth;
  const contentWidth = shouldCenterContent
    ? contentMaxWidth
    : availableContentWidth;
  const columns = isTablet ? (isLandscape ? 3 : 2) : isWideLayout ? 2 : 1;
  const formColumns = isWideLayout ? 2 : 1;
  const statsColumns = isTablet
    ? isLandscape
      ? 4
      : 2
    : isWideLayout
      ? 3
      : isCompactPhone
        ? 1
        : 2;
  const gridGap = isTablet ? 16 : isCompactPhone ? 10 : 12;
  const sectionGap = isTablet ? 32 : isCompactPhone ? 24 : 28;
  const totalGap = gridGap * Math.max(columns - 1, 0);
  const cardWidth =
    columns > 1
      ? Math.max((contentWidth - totalGap) / columns, 0)
      : ("100%" as const);

  return {
    deviceType,
    deviceCategory,
    isTablet,
    isPhone: !isTablet,
    isLargeTablet,
    isCompactPhone,
    isLargePhone,
    isLandscape,
    isWideLayout,
    shouldCenterContent,
    isIOS,
    isAndroid,
    screenWidth,
    screenHeight,
    shortestSide,
    longestSide,
    columns,
    formColumns,
    statsColumns,
    contentWidth,
    contentMaxWidth,
    horizontalPadding,
    gridGap,
    sectionGap,
    cardWidth,
  };
}

export function getResponsiveValue<T>(
  layout: ResponsiveLayout,
  variants: ResponsiveVariantMap<T>,
): T {
  if (layout.isLargeTablet && layout.isLandscape) {
    return (
      variants.largeTabletLandscape ??
      variants.largeTablet ??
      variants.tabletLandscape ??
      variants.tablet ??
      variants.default
    );
  }

  if (layout.isLargeTablet) {
    return variants.largeTablet ?? variants.tablet ?? variants.default;
  }

  if (layout.isTablet && layout.isLandscape) {
    return variants.tabletLandscape ?? variants.tablet ?? variants.default;
  }

  if (layout.isTablet) {
    return variants.tablet ?? variants.default;
  }

  if (layout.isWideLayout) {
    return variants.widePhone ?? variants.largePhone ?? variants.default;
  }

  if (layout.isLargePhone) {
    return variants.largePhone ?? variants.default;
  }

  if (layout.isCompactPhone) {
    return variants.compactPhone ?? variants.default;
  }

  return variants.default;
}

export function getResponsiveScrollContentStyle(
  layout: ResponsiveLayout,
  {
    headerHeight,
    tabBarHeight,
    topSpacing = 18,
    bottomSpacing = 24,
    horizontalPadding,
    maxWidth,
  }: ResponsiveScrollContentStyleOptions,
): ViewStyle {
  const resolvedPadding = Math.max(
    0,
    horizontalPadding ?? layout.horizontalPadding,
  );
  const resolvedMaxWidth = clamp(
    maxWidth ?? layout.contentMaxWidth,
    0,
    layout.contentMaxWidth,
  );

  return {
    paddingTop: headerHeight + topSpacing,
    paddingBottom: tabBarHeight + bottomSpacing,
    paddingHorizontal: resolvedPadding,
    maxWidth: layout.shouldCenterContent ? resolvedMaxWidth : undefined,
    alignSelf: layout.shouldCenterContent ? "center" : undefined,
    width: layout.shouldCenterContent ? "100%" : undefined,
  };
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getResponsiveLayout(width, height), [width, height]);
}

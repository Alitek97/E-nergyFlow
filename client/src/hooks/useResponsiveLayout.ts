import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";

export type DeviceType = "phone" | "tablet" | "large-tablet";

export interface ResponsiveLayout {
  deviceType: DeviceType;
  isTablet: boolean;
  isPhone: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  columns: number;
  contentMaxWidth: number;
  horizontalPadding: number;
  cardWidth: number | "100%";
}

export const PHONE_BREAKPOINT = 768;
export const LARGE_TABLET_BREAKPOINT = 1024;
const TABLET_MAX_CONTENT_WIDTH = 980;
const LARGE_TABLET_MAX_CONTENT_WIDTH = 1200;

function getResponsiveLayout(width: number, height: number): ResponsiveLayout {
  const screenWidth = Math.max(0, width);
  const screenHeight = Math.max(0, height);
  const isLandscape = screenWidth > screenHeight;
  const isLargeTablet = screenWidth >= LARGE_TABLET_BREAKPOINT;
  const isTablet = screenWidth >= PHONE_BREAKPOINT;
  const deviceType: DeviceType = isLargeTablet
    ? "large-tablet"
    : isTablet
      ? "tablet"
      : "phone";
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  if (isLargeTablet) {
    const targetMaxWidth = isLandscape ? LARGE_TABLET_MAX_CONTENT_WIDTH : 1080;
    const contentMaxWidth = Math.min(screenWidth - 96, targetMaxWidth);
    const horizontalPadding = Math.max((screenWidth - contentMaxWidth) / 2, 40);
    const columns = isLandscape ? 3 : 2;
    const gaps = SpacingForColumns(columns);
    const cardWidth = (contentMaxWidth - gaps) / columns;
    return {
      deviceType,
      isTablet: true,
      isPhone: false,
      isLargeTablet: true,
      isLandscape,
      isIOS,
      isAndroid,
      screenWidth,
      screenHeight,
      columns,
      contentMaxWidth,
      horizontalPadding,
      cardWidth,
    };
  }

  if (isTablet) {
    const targetMaxWidth = isLandscape ? TABLET_MAX_CONTENT_WIDTH : 860;
    const contentMaxWidth = Math.min(screenWidth - 64, targetMaxWidth);
    const horizontalPadding = Math.max((screenWidth - contentMaxWidth) / 2, 28);
    const columns = isLandscape ? 3 : 2;
    const gaps = SpacingForColumns(columns);
    const cardWidth = (contentMaxWidth - gaps) / columns;
    return {
      deviceType,
      isTablet: true,
      isPhone: false,
      isLargeTablet: false,
      isLandscape,
      isIOS,
      isAndroid,
      screenWidth,
      screenHeight,
      columns,
      contentMaxWidth,
      horizontalPadding,
      cardWidth,
    };
  }

  return {
    deviceType,
    isTablet: false,
    isPhone: true,
    isLargeTablet: false,
    isLandscape,
    isIOS,
    isAndroid,
    screenWidth,
    screenHeight,
    columns: 1,
    contentMaxWidth: screenWidth,
    horizontalPadding: 16,
    cardWidth: "100%",
  };
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getResponsiveLayout(width, height), [width, height]);
}

function SpacingForColumns(columns: number): number {
  if (columns <= 1) return 0;
  if (columns === 2) return 24;
  return 32;
}

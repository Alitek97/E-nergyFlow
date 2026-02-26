import { useState, useEffect } from "react";
import { Dimensions, ScaledSize } from "react-native";

export type DeviceType = "phone" | "tablet";

export interface ResponsiveLayout {
  deviceType: DeviceType;
  isTablet: boolean;
  isPhone: boolean;
  screenWidth: number;
  screenHeight: number;
  columns: number;
  contentMaxWidth: number;
  horizontalPadding: number;
  cardWidth: number | "100%";
}

const TABLET_BREAKPOINT = 768;
const TABLET_MAX_CONTENT_WIDTH = 900;

function getResponsiveLayout(dimensions: ScaledSize): ResponsiveLayout {
  const { width, height } = dimensions;
  const isTablet = width >= TABLET_BREAKPOINT;
  const deviceType: DeviceType = isTablet ? "tablet" : "phone";

  if (isTablet) {
    const contentMaxWidth = Math.min(width - 64, TABLET_MAX_CONTENT_WIDTH);
    const cardWidth = (contentMaxWidth - 24) / 2;
    return {
      deviceType,
      isTablet: true,
      isPhone: false,
      screenWidth: width,
      screenHeight: height,
      columns: 2,
      contentMaxWidth,
      horizontalPadding: Math.max((width - contentMaxWidth) / 2, 32),
      cardWidth,
    };
  }

  return {
    deviceType,
    isTablet: false,
    isPhone: true,
    screenWidth: width,
    screenHeight: height,
    columns: 1,
    contentMaxWidth: width,
    horizontalPadding: 16,
    cardWidth: "100%",
  };
}

export function useResponsiveLayout(): ResponsiveLayout {
  const [layout, setLayout] = useState<ResponsiveLayout>(() =>
    getResponsiveLayout(Dimensions.get("window"))
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setLayout(getResponsiveLayout(window));
    });

    return () => subscription.remove();
  }, []);

  return layout;
}

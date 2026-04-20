import React from "react";
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  View,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "@/hooks/useTheme";
import {
  getResponsiveScrollContentStyle,
  useResponsiveLayout,
} from "@/hooks/useResponsiveLayout";
import { SETTINGS_SUBPAGE_SIZES } from "@/components/settings/settingsSubpageStyles";
import { DashboardBackdrop } from "@/components/visual/DashboardBackdrop";

type Props = {
  children: React.ReactNode;
  header?: React.ReactNode;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
};

export default function SettingsSubpageLayout({
  children,
  header,
  keyboardShouldPersistTaps = "handled",
}: Props) {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const horizontalPadding = Math.max(
    layout.horizontalPadding,
    SETTINGS_SUBPAGE_SIZES.horizontalPadding,
  );
  const contentMaxWidth = layout.isTablet
    ? Math.min(layout.contentMaxWidth, SETTINGS_SUBPAGE_SIZES.contentMaxWidth)
    : undefined;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      edges={["left", "right"]}
    >
      <DashboardBackdrop intensity="subtle" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          getResponsiveScrollContentStyle(layout, {
            headerHeight,
            tabBarHeight,
            topSpacing: SETTINGS_SUBPAGE_SIZES.topSpacing,
            bottomSpacing: SETTINGS_SUBPAGE_SIZES.bottomSpacing,
            horizontalPadding,
            maxWidth: contentMaxWidth,
          }),
          { gap: SETTINGS_SUBPAGE_SIZES.sectionGap },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {header ? <View style={styles.header}>{header}</View> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 12,
  },
});

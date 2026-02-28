import React from "react";
import { ScrollView, StyleSheet, type ScrollViewProps, View } from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "@/hooks/useTheme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { SETTINGS_SUBPAGE_SIZES } from "@/components/settings/settingsSubpageStyles";

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

  const horizontalPadding = Math.max(layout.horizontalPadding, SETTINGS_SUBPAGE_SIZES.horizontalPadding);
  const contentMaxWidth = layout.isTablet
    ? Math.min(layout.contentMaxWidth, SETTINGS_SUBPAGE_SIZES.contentMaxWidth)
    : undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]} edges={["left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + SETTINGS_SUBPAGE_SIZES.topSpacing,
          paddingBottom: tabBarHeight + SETTINGS_SUBPAGE_SIZES.bottomSpacing,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          alignSelf: layout.isTablet ? "center" : undefined,
          width: layout.isTablet ? "100%" : undefined,
        }}
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
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 12,
  },
});

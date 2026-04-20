import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Feather } from "@expo/vector-icons";
import { SymbolView, type SFSymbol } from "expo-symbols";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { AppTheme } from "@/constants/theme";
import {
  groupShowsSegmentedControl,
  getGroupForRoute,
  type MainTabGroupId,
  type MainTabRouteName,
  TAB_DEFAULT_ROUTE_BY_GROUP,
  type ResolvedPrimaryTabGroup,
} from "@/navigation/hybridTabConfig";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type FocusedTileTabBarProps = BottomTabBarProps & {
  primaryGroups: ResolvedPrimaryTabGroup[];
  theme: AppTheme;
  typography: {
    getTextFamily: (
      weight?: "regular" | "semibold" | "bold",
      language?: string,
    ) => string;
    getVariantStyle: (variant: "tabLabel", language?: string) => object;
  };
  isDark: boolean;
  isRTL: boolean;
  iconSize: number;
  labelSize: number;
  collapsedDockHeight: number;
  segmentedRowHeight: number;
  barHeight: number;
  bottomPadding: number;
  maxContentWidth: number;
};

type TabItem = {
  accessibilityLabel?: string;
  key: string;
  label: string;
  onLongPress?: () => void;
  onPress: () => void;
  routeName: MainTabRouteName;
  testID?: string;
};

const OUTER_GUTTER = 18;
const PANEL_PADDING = 6;
const PANEL_GAP = 8;
const RAIL_PADDING = 4;
const SEGMENT_RAIL_PADDING = 6;
const SEGMENT_HIGHLIGHT_INSET = 2;
const BOTTOM_HIGHLIGHT_INSET = 2;
const SECONDARY_BAR_OFFSET = 14;
const SECONDARY_SHOW_DURATION_MS = 220;
const SECONDARY_HIDE_DURATION_MS = 220;
const SECONDARY_AUTO_HIDE_DELAY_MS = 3000;

export default function FocusedTileTabBar({
  primaryGroups,
  state,
  descriptors,
  navigation,
  theme,
  typography,
  isDark,
  isRTL,
  iconSize,
  labelSize,
  collapsedDockHeight,
  segmentedRowHeight,
  barHeight,
  bottomPadding,
  maxContentWidth,
}: FocusedTileTabBarProps) {
  const { width: screenWidth } = useWindowDimensions();
  const languageKey = isRTL ? "ar" : "en";
  const [expandedGroupId, setExpandedGroupId] = useState<MainTabGroupId | null>(
    null,
  );
  const [segmentGroupId, setSegmentGroupId] = useState<MainTabGroupId | null>(
    null,
  );
  const secondaryProgress = useRef(new Animated.Value(0)).current;
  const secondaryAutoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingPrimaryNavigationGroupRef = useRef<MainTabGroupId | null>(null);
  const latestSecondaryGroupRef = useRef<MainTabGroupId | null>(null);
  const setSecondaryVisibilityRef = useRef<
    (nextGroupId: MainTabGroupId | null) => void
  >(() => {});
  const palette = useMemo(() => {
    const primaryBar = theme.tabBarBg;
    const secondaryBar = mixColors(
      theme.surfaceRaised,
      isDark ? theme.surfaceMuted : theme.surfaceOverlay,
      isDark ? 0.22 : 0.14,
    );
    const insetTileSurface = mixColors(
      isDark ? theme.surfaceMuted : theme.surfaceOverlay,
      isDark ? theme.backgroundRoot : theme.surfaceRaised,
      isDark ? 0.32 : 0.16,
    );
    const activePrimarySurface = mixColors(
      theme.surfaceRaised,
      theme.accentSoft,
      isDark ? 0.18 : 0.24,
    );

    return {
      panel: withAlpha(theme.surfaceRaised, isDark ? 0.96 : 0.98),
      panelBorder: withAlpha(theme.borderStrong, isDark ? 0.76 : 0.64),
      segmentRail: secondaryBar,
      bottomRail: primaryBar,
      activeTilePrimary: activePrimarySurface,
      activeTilePrimaryBorder: withAlpha(
        theme.borderStrong,
        isDark ? 0.14 : 0.1,
      ),
      activeTilePrimaryShadow: theme.cardShadow,
      activeTileSecondary: insetTileSurface,
      activeTileBorder: withAlpha(theme.borderStrong, isDark ? 0.14 : 0.12),
      activeTileTopEdge: withAlpha(
        isDark ? theme.backgroundRoot : theme.borderStrong,
        isDark ? 0.22 : 0.18,
      ),
      activeTileBottomEdge: withAlpha(
        theme.surfaceRaised,
        isDark ? 0.18 : 0.42,
      ),
      activeInk: theme.primary,
      inactiveInk: theme.tabBarInactive,
      shadow: theme.cardShadow,
      railShadow: theme.cardShadow,
    };
  }, [isDark, theme]);
  const dockWidth = Math.min(
    Math.max(screenWidth - OUTER_GUTTER * 2, 0),
    maxContentWidth,
  );
  const allRouteItems = useMemo(() => {
    const items = state.routes.map((route) => {
      const options = descriptors[route.key]?.options;
      const label = getTabLabel(options, route.name as MainTabRouteName);

      return {
        key: route.key,
        routeName: route.name as MainTabRouteName,
        label,
        accessibilityLabel:
          options?.tabBarAccessibilityLabel ?? options?.title ?? label,
        onPress: () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        },
        onLongPress: () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        },
        testID: options?.tabBarButtonTestID,
      } satisfies TabItem;
    });

    return items;
  }, [descriptors, navigation, state.routes]);

  const activeRouteName =
    (state.routes[state.index]?.name as MainTabRouteName | undefined) ??
    "FeedersTab";
  const activeGroupId = getGroupForRoute(activeRouteName);
  const routeItemsByName = useMemo(
    () =>
      allRouteItems.reduce(
        (accumulator, item) => ({
          ...accumulator,
          [item.routeName]: item,
        }),
        {} as Record<MainTabRouteName, TabItem>,
      ),
    [allRouteItems],
  );
  const displayGroups = useMemo(
    () => (isRTL ? [...primaryGroups].reverse() : primaryGroups),
    [isRTL, primaryGroups],
  );
  const segmentGroup =
    primaryGroups.find((group) => group.id === segmentGroupId) ?? null;
  const segmentItems = (segmentGroup?.routes ?? [])
    .map((routeName) => routeItemsByName[routeName])
    .filter(isTabItem);
  const displaySegmentItems = isRTL
    ? [...segmentItems].reverse()
    : segmentItems;
  const showSegments = displaySegmentItems.length > 1;
  const expandedDockHeight =
    collapsedDockHeight + segmentedRowHeight + PANEL_GAP;
  const bottomRailWidth = dockWidth - PANEL_PADDING * 2;
  const bottomInnerWidth = bottomRailWidth - RAIL_PADDING * 2;
  const bottomItemWidth = bottomInnerWidth / Math.max(displayGroups.length, 1);
  const bottomHighlightWidth = Math.max(
    bottomItemWidth - BOTTOM_HIGHLIGHT_INSET * 2,
    0,
  );
  const activeGroupIndex = Math.max(
    0,
    displayGroups.findIndex((group) => group.id === activeGroupId),
  );
  const bottomHighlightLeft =
    RAIL_PADDING + bottomItemWidth * activeGroupIndex + BOTTOM_HIGHLIGHT_INSET;
  const segmentRailWidth = dockWidth - PANEL_PADDING * 2;
  const segmentInnerWidth = segmentRailWidth - SEGMENT_RAIL_PADDING * 2;
  const segmentItemWidth =
    segmentInnerWidth / Math.max(displaySegmentItems.length, 1);
  const segmentHighlightWidth = Math.max(
    segmentItemWidth - SEGMENT_HIGHLIGHT_INSET * 2,
    0,
  );
  const activeSegmentIndex = Math.max(
    0,
    displaySegmentItems.findIndex((item) => item.routeName === activeRouteName),
  );
  const segmentHighlightLeft =
    SEGMENT_RAIL_PADDING +
    segmentItemWidth * activeSegmentIndex +
    SEGMENT_HIGHLIGHT_INSET;
  const panelHeight = secondaryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedDockHeight, expandedDockHeight],
  });
  const segmentContainerHeight = secondaryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentedRowHeight + PANEL_GAP],
  });
  const segmentTranslateY = secondaryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SECONDARY_BAR_OFFSET, 0],
  });

  const clearSecondaryAutoHideTimer = useCallback(() => {
    if (secondaryAutoHideTimerRef.current === null) {
      return;
    }

    clearTimeout(secondaryAutoHideTimerRef.current);
    secondaryAutoHideTimerRef.current = null;
  }, []);

  const scheduleSecondaryAutoHide = useCallback(() => {
    clearSecondaryAutoHideTimer();
    secondaryAutoHideTimerRef.current = setTimeout(() => {
      setSecondaryVisibilityRef.current(null);
    }, SECONDARY_AUTO_HIDE_DELAY_MS);
  }, [clearSecondaryAutoHideTimer]);

  const setSecondaryVisibility = useCallback(
    (nextGroupId: MainTabGroupId | null) => {
      const resolvedGroupId =
        nextGroupId && groupShowsSegmentedControl(nextGroupId)
          ? nextGroupId
          : null;

      latestSecondaryGroupRef.current = resolvedGroupId;
      clearSecondaryAutoHideTimer();

      if (resolvedGroupId) {
        setSegmentGroupId((currentGroupId) =>
          currentGroupId === resolvedGroupId ? currentGroupId : resolvedGroupId,
        );
      }

      setExpandedGroupId(resolvedGroupId);
      secondaryProgress.stopAnimation();
      const isShowing = Boolean(resolvedGroupId);
      Animated.timing(secondaryProgress, {
        toValue: isShowing ? 1 : 0,
        duration: isShowing
          ? SECONDARY_SHOW_DURATION_MS
          : SECONDARY_HIDE_DURATION_MS,
        easing: isShowing
          ? Easing.out(Easing.bezier(0.22, 1, 0.36, 1))
          : Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && latestSecondaryGroupRef.current === null) {
          setSegmentGroupId(null);
        }
      });

      if (resolvedGroupId) {
        scheduleSecondaryAutoHide();
      }
    },
    [clearSecondaryAutoHideTimer, scheduleSecondaryAutoHide, secondaryProgress],
  );
  setSecondaryVisibilityRef.current = setSecondaryVisibility;

  useEffect(() => clearSecondaryAutoHideTimer, [clearSecondaryAutoHideTimer]);

  useEffect(() => {
    if (activeGroupId === "settings") {
      pendingPrimaryNavigationGroupRef.current = null;
      if (expandedGroupId !== null || segmentGroupId !== null) {
        setSecondaryVisibility(null);
      }
      return;
    }

    const pendingGroupId = pendingPrimaryNavigationGroupRef.current;
    if (pendingGroupId && activeGroupId === pendingGroupId) {
      pendingPrimaryNavigationGroupRef.current = null;
      return;
    }

    if (
      expandedGroupId &&
      expandedGroupId !== activeGroupId &&
      !pendingGroupId
    ) {
      setSecondaryVisibility(null);
    }
  }, [activeGroupId, expandedGroupId, segmentGroupId, setSecondaryVisibility]);

  const navigateToRoute = (item: TabItem) => {
    const isFocused = item.routeName === activeRouteName;
    const event = navigation.emit({
      type: "tabPress",
      target: item.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      const targetRoute = state.routes.find((route) => route.key === item.key);
      navigation.navigate(item.routeName, targetRoute?.params);
      return true;
    }

    return isFocused || !event.defaultPrevented;
  };

  const handleSecondaryItemPress = (item: TabItem) => {
    pendingPrimaryNavigationGroupRef.current = null;
    navigateToRoute(item);
    setSecondaryVisibility(null);
  };

  const handlePrimaryGroupPress = (
    group: ResolvedPrimaryTabGroup,
    targetRoute: TabItem | undefined,
    focused: boolean,
  ) => {
    const shouldExpand = groupShowsSegmentedControl(group.id);

    if (focused) {
      pendingPrimaryNavigationGroupRef.current = null;
      setSecondaryVisibility(shouldExpand ? group.id : null);
      return;
    }

    if (!targetRoute) {
      return;
    }

    const didActivateRoute = navigateToRoute(targetRoute);
    if (!didActivateRoute) {
      return;
    }

    pendingPrimaryNavigationGroupRef.current = shouldExpand ? group.id : null;
    setSecondaryVisibility(shouldExpand ? group.id : null);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { height: barHeight }]}
    >
      <View style={[styles.surface, { paddingBottom: bottomPadding }]}>
        <View
          style={[
            styles.contentFrame,
            {
              width: dockWidth,
              height: expandedDockHeight,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.panel,
              {
                height: panelHeight,
                backgroundColor: palette.panel,
                borderColor: palette.panelBorder,
                shadowColor: palette.shadow,
              },
            ]}
          >
            {showSegments ? (
              <Animated.View
                pointerEvents={expandedGroupId ? "auto" : "none"}
                style={[
                  styles.segmentContainer,
                  {
                    height: segmentContainerHeight,
                    opacity: secondaryProgress,
                    transform: [{ translateY: segmentTranslateY }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.segmentRail,
                    {
                      height: segmentedRowHeight,
                      backgroundColor: palette.segmentRail,
                    },
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.segmentHighlight,
                      {
                        width: segmentHighlightWidth,
                        left: segmentHighlightLeft,
                        backgroundColor: palette.activeTileSecondary,
                        borderColor: palette.activeTileBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.segmentHighlightTopEdge,
                        { backgroundColor: palette.activeTileTopEdge },
                      ]}
                    />
                    <View
                      style={[
                        styles.segmentHighlightBottomEdge,
                        { backgroundColor: palette.activeTileBottomEdge },
                      ]}
                    />
                  </View>

                  {displaySegmentItems.map((item) => {
                    const focused = item.routeName === activeRouteName;

                    return (
                      <Pressable
                        key={item.key}
                        accessibilityLabel={item.accessibilityLabel}
                        accessibilityRole="button"
                        accessibilityState={focused ? { selected: true } : {}}
                        hitSlop={6}
                        onLongPress={item.onLongPress}
                        onPress={() => handleSecondaryItemPress(item)}
                        style={({ pressed }) => [
                          styles.segmentButton,
                          { width: segmentItemWidth },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          adjustsFontSizeToFit
                          allowFontScaling={false}
                          minimumFontScale={0.72}
                          numberOfLines={1}
                          style={[
                            styles.segmentLabel,
                            typography.getVariantStyle("tabLabel", languageKey),
                            {
                              color: focused
                                ? palette.activeInk
                                : palette.inactiveInk,
                              fontFamily: typography.getTextFamily(
                                focused ? "semibold" : "regular",
                                languageKey,
                              ),
                              writingDirection: isRTL ? "rtl" : "ltr",
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            ) : null}

            <View
              style={[
                styles.bottomRail,
                {
                  backgroundColor: palette.bottomRail,
                  shadowColor: palette.railShadow,
                  height: collapsedDockHeight - PANEL_PADDING * 2,
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.bottomHighlight,
                  {
                    width: bottomHighlightWidth,
                    left: bottomHighlightLeft,
                    backgroundColor: palette.activeTilePrimary,
                    borderColor: palette.activeTilePrimaryBorder,
                    shadowColor: palette.activeTilePrimaryShadow,
                  },
                ]}
              />

              {displayGroups.map((group) => {
                const focused = group.id === activeGroupId;
                const targetRoute =
                  routeItemsByName[TAB_DEFAULT_ROUTE_BY_GROUP[group.id]];

                return (
                  <Pressable
                    key={group.id}
                    accessibilityLabel={group.label}
                    accessibilityRole="tab"
                    accessibilityState={focused ? { selected: true } : {}}
                    hitSlop={8}
                    onLongPress={targetRoute?.onLongPress}
                    onPress={() =>
                      handlePrimaryGroupPress(group, targetRoute, focused)
                    }
                    style={({ pressed }) => [
                      styles.bottomButton,
                      { width: bottomItemWidth },
                      pressed && styles.pressed,
                    ]}
                    testID={targetRoute?.testID}
                  >
                    <View style={styles.bottomIconWrap}>
                      {renderNavigationIcon(
                        group.iconName,
                        group.iosSymbolName,
                        {
                          color: focused
                            ? palette.activeInk
                            : palette.inactiveInk,
                          focused,
                          size: focused ? iconSize + 1 : iconSize,
                        },
                      )}
                    </View>

                    <Text
                      adjustsFontSizeToFit
                      allowFontScaling={false}
                      minimumFontScale={0.7}
                      numberOfLines={1}
                      style={[
                        styles.bottomLabel,
                        typography.getVariantStyle("tabLabel", languageKey),
                        {
                          color: focused
                            ? palette.activeInk
                            : palette.inactiveInk,
                          fontFamily: typography.getTextFamily(
                            focused ? "semibold" : "regular",
                            languageKey,
                          ),
                          fontSize: labelSize,
                          lineHeight: labelSize + 5,
                          letterSpacing: isRTL ? 0 : 0.1,
                          writingDirection: isRTL ? "rtl" : "ltr",
                        },
                      ]}
                    >
                      {group.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function getTabLabel(
  options: BottomTabBarProps["descriptors"][string]["options"] | undefined,
  routeName: string,
) {
  if (typeof options?.tabBarLabel === "string") {
    return options.tabBarLabel;
  }

  if (typeof options?.title === "string") {
    return options.title;
  }

  return routeName;
}

function renderNavigationIcon(
  featherName: React.ComponentProps<typeof Feather>["name"],
  iosSymbolName: SFSymbol,
  {
    color,
    focused,
    size,
  }: {
    color: string;
    focused: boolean;
    size: number;
  },
) {
  const fallback = <Feather color={color} name={featherName} size={size} />;

  if (Platform.OS !== "ios") {
    return fallback;
  }

  return (
    <SymbolView
      fallback={fallback}
      name={iosSymbolName}
      size={size}
      tintColor={color}
      type="hierarchical"
      weight={focused ? "semibold" : "medium"}
    />
  );
}

function isTabItem(item: TabItem | undefined): item is TabItem {
  return Boolean(item);
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  surface: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  contentFrame: {
    position: "relative",
    justifyContent: "flex-end",
  },
  panel: {
    alignSelf: "stretch",
    borderRadius: 30,
    padding: PANEL_PADDING,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 12,
    overflow: "hidden",
  },
  segmentContainer: {
    overflow: "hidden",
  },
  segmentRail: {
    position: "relative",
    borderRadius: 22,
    padding: SEGMENT_RAIL_PADDING,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: PANEL_GAP,
  },
  segmentHighlight: {
    position: "absolute",
    top: SEGMENT_RAIL_PADDING + 1,
    bottom: SEGMENT_RAIL_PADDING + 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  segmentHighlightTopEdge: {
    position: "absolute",
    top: 1,
    left: 8,
    right: 8,
    height: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  segmentHighlightBottomEdge: {
    position: "absolute",
    bottom: 1,
    left: 7,
    right: 7,
    height: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  segmentButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    height: "100%",
    zIndex: 1,
  },
  segmentLabel: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  bottomRail: {
    position: "relative",
    borderRadius: 24,
    padding: RAIL_PADDING,
    flexDirection: "row",
    alignItems: "stretch",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomHighlight: {
    position: "absolute",
    top: RAIL_PADDING + 1,
    bottom: RAIL_PADDING + 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  bottomButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    zIndex: 1,
  },
  bottomIconWrap: {
    minHeight: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  bottomLabel: {
    textAlign: "center",
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});

function withAlpha(hexColor: string, alpha: number) {
  const parsed = parseColor(hexColor);
  if (!parsed) {
    return hexColor;
  }

  const { red, green, blue } = parsed;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function mixColors(baseColor: string, tintColor: string, tintAmount: number) {
  const base = parseColor(baseColor);
  const tint = parseColor(tintColor);

  if (!base || !tint) {
    return baseColor;
  }

  const clampedTintAmount = Math.max(0, Math.min(1, tintAmount));
  const baseAmount = 1 - clampedTintAmount;

  const red = Math.round(base.red * baseAmount + tint.red * clampedTintAmount);
  const green = Math.round(
    base.green * baseAmount + tint.green * clampedTintAmount,
  );
  const blue = Math.round(
    base.blue * baseAmount + tint.blue * clampedTintAmount,
  );

  return `rgb(${red}, ${green}, ${blue})`;
}

function parseColor(color: string) {
  const normalized = color.trim();

  if (normalized.startsWith("#")) {
    const sanitized = normalized.slice(1);
    if (sanitized.length !== 6) {
      return null;
    }

    return {
      red: Number.parseInt(sanitized.slice(0, 2), 16),
      green: Number.parseInt(sanitized.slice(2, 4), 16),
      blue: Number.parseInt(sanitized.slice(4, 6), 16),
    };
  }

  const rgbMatch = normalized.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/,
  );

  if (!rgbMatch) {
    return null;
  }

  return {
    red: Number.parseInt(rgbMatch[1], 10),
    green: Number.parseInt(rgbMatch[2], 10),
    blue: Number.parseInt(rgbMatch[3], 10),
  };
}

import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  useIsFocused,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  getSiblingRouteForSwipe,
  type MainTabRouteName,
} from "@/navigation/hybridTabConfig";

const GESTURE_ACTIVATION_OFFSET = 24;
const VERTICAL_FAIL_OFFSET = 14;
const SWIPE_VELOCITY_THRESHOLD = 900;
const SWIPE_COMPLETE_DURATION_MS = 220;
const SWIPE_CANCEL_DURATION_MS = 210;
const PAGE_OPACITY_MIN = 0.985;
const PREVIEW_OPACITY_MIN = 0.94;

type SwipeControlContextValue = {
  setSwipeBlocked: (blocked: boolean) => void;
};

type MainTabParamList = Record<MainTabRouteName, undefined>;

const SwipeControlContext = React.createContext<SwipeControlContextValue>({
  setSwipeBlocked: () => {},
});

export function useSecondaryGroupSwipeControl() {
  return React.useContext(SwipeControlContext);
}

type SecondaryGroupSwipeContainerProps = {
  children: React.ReactNode;
  leftPreviewComponent?: React.ComponentType<object>;
  rightPreviewComponent?: React.ComponentType<object>;
  routeName: MainTabRouteName;
};

function SecondaryGroupSwipeContainer({
  children,
  leftPreviewComponent: LeftPreviewComponent,
  rightPreviewComponent: RightPreviewComponent,
  routeName,
}: SecondaryGroupSwipeContainerProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const isFocused = useIsFocused();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const hasActivatedSwipePreview = useSharedValue(false);
  const [isSwipeBlocked, setSwipeBlocked] = React.useState(false);
  const [isSwipeGestureActive, setIsSwipeGestureActive] = React.useState(false);
  const [isSwipeSettling, setIsSwipeSettling] = React.useState(false);
  const leftRoute = React.useMemo(
    () => getSiblingRouteForSwipe(routeName, "left"),
    [routeName],
  );
  const rightRoute = React.useMemo(
    () => getSiblingRouteForSwipe(routeName, "right"),
    [routeName],
  );
  const swipeThreshold = React.useMemo(
    () => Math.min(Math.max(screenWidth * 0.18, 72), 120),
    [screenWidth],
  );
  const previewDirection = leftRoute ? "left" : rightRoute ? "right" : null;
  const previewOffset = React.useMemo(
    () => (previewDirection === "left" ? screenWidth : -screenWidth),
    [previewDirection, screenWidth],
  );
  const maxTranslate = React.useMemo(
    () => Math.max(screenWidth - 12, screenWidth * 0.94),
    [screenWidth],
  );
  const shouldRenderPreview = Boolean(
    (LeftPreviewComponent || RightPreviewComponent) &&
      (isSwipeGestureActive || isSwipeSettling),
  );

  const navigateToRoute = React.useCallback(
    (targetRoute: MainTabRouteName) => {
      const tabNavigation =
        navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();

      if (!tabNavigation) {
        return;
      }

      tabNavigation.navigate(targetRoute);
    },
    [navigation],
  );

  const startInteractiveSwipe = React.useCallback(() => {
    setIsSwipeGestureActive(true);
  }, []);

  const clearSwipeState = React.useCallback(() => {
    setIsSwipeGestureActive(false);
    setIsSwipeSettling(false);
  }, []);

  const completeSwipe = React.useCallback(
    (targetRoute: MainTabRouteName, targetTranslate: number) => {
      setIsSwipeGestureActive(false);
      setIsSwipeSettling(true);
      translateX.value = withTiming(
        targetTranslate,
        {
          duration: SWIPE_COMPLETE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (!finished) {
            runOnJS(clearSwipeState)();
            translateX.value = 0;
            return;
          }

          // Keep the outgoing scene offscreen until focus changes so it cannot
          // flash back in before the target tab is visually committed.
          runOnJS(navigateToRoute)(targetRoute);
        },
      );
    },
    [clearSwipeState, navigateToRoute, translateX],
  );

  const cancelSwipe = React.useCallback(() => {
    setIsSwipeSettling(true);
    translateX.value = withTiming(
      0,
      {
        duration: SWIPE_CANCEL_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      () => {
        runOnJS(clearSwipeState)();
      },
    );
  }, [clearSwipeState, translateX]);

  React.useEffect(() => {
    if (!isFocused) {
      translateX.value = 0;
      clearSwipeState();
    }
  }, [clearSwipeState, isFocused, translateX]);

  React.useEffect(() => {
    if (!isSwipeBlocked) {
      return;
    }

    hasActivatedSwipePreview.value = false;
    if (!isSwipeGestureActive && !isSwipeSettling) {
      translateX.value = 0;
      return;
    }

    cancelSwipe();
  }, [
    cancelSwipe,
    hasActivatedSwipePreview,
    isSwipeBlocked,
    isSwipeGestureActive,
    isSwipeSettling,
    translateX,
  ]);

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .enabled(
          isFocused &&
            !isSwipeBlocked &&
            !isSwipeSettling &&
            Boolean(leftRoute || rightRoute),
        )
        .activeOffsetX([-GESTURE_ACTIVATION_OFFSET, GESTURE_ACTIVATION_OFFSET])
        .failOffsetY([-VERTICAL_FAIL_OFFSET, VERTICAL_FAIL_OFFSET])
        .onUpdate((event) => {
          const isSwipingLeft = event.translationX < 0;
          const targetRoute = isSwipingLeft ? leftRoute : rightRoute;

          if (!targetRoute) {
            translateX.value = 0;
            return;
          }

          if (!hasActivatedSwipePreview.value) {
            hasActivatedSwipePreview.value = true;
            runOnJS(startInteractiveSwipe)();
          }

          translateX.value = Math.max(
            -maxTranslate,
            Math.min(maxTranslate, event.translationX),
          );
        })
        .onEnd((event) => {
          const isSwipingLeft = event.translationX < 0;
          const targetRoute = isSwipingLeft ? leftRoute : rightRoute;

          if (!targetRoute) {
            hasActivatedSwipePreview.value = false;
            return;
          }

          hasActivatedSwipePreview.value = false;
          const distance = Math.abs(event.translationX);
          const velocity = Math.abs(event.velocityX);

          if (
            distance >= swipeThreshold ||
            velocity >= SWIPE_VELOCITY_THRESHOLD
          ) {
            runOnJS(completeSwipe)(
              targetRoute,
              isSwipingLeft ? -screenWidth : screenWidth,
            );
            return;
          }

          runOnJS(cancelSwipe)();
        })
        .onFinalize(() => {
          hasActivatedSwipePreview.value = false;
        }),
    [
      cancelSwipe,
      completeSwipe,
      hasActivatedSwipePreview,
      isFocused,
      isSwipeBlocked,
      isSwipeSettling,
      leftRoute,
      maxTranslate,
      rightRoute,
      screenWidth,
      startInteractiveSwipe,
      swipeThreshold,
      translateX,
    ],
  );

  const currentSceneAnimatedStyle = useAnimatedStyle(() => {
    const progress =
      screenWidth > 0 ? Math.abs(translateX.value) / screenWidth : 0;

    return {
      opacity: interpolate(
        progress,
        [0, 1],
        [1, PAGE_OPACITY_MIN],
        Extrapolation.CLAMP,
      ),
      transform: [{ translateX: translateX.value }],
    };
  }, [screenWidth]);

  const previewSceneAnimatedStyle = useAnimatedStyle(() => {
    const progress =
      screenWidth > 0 ? Math.abs(translateX.value) / screenWidth : 0;

    return {
      opacity: interpolate(
        progress,
        [0, 1],
        [PREVIEW_OPACITY_MIN, 1],
        Extrapolation.CLAMP,
      ),
      transform: [{ translateX: previewOffset + translateX.value }],
    };
  }, [previewOffset, screenWidth]);

  const contextValue = React.useMemo(
    () => ({
      setSwipeBlocked,
    }),
    [],
  );

  return (
    <SwipeControlContext.Provider value={contextValue}>
      <GestureDetector gesture={panGesture}>
        <Animated.View collapsable={false} style={styles.container}>
          {shouldRenderPreview && LeftPreviewComponent ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.scene, previewSceneAnimatedStyle]}
            >
              <LeftPreviewComponent />
            </Animated.View>
          ) : null}
          {shouldRenderPreview && RightPreviewComponent ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.scene, previewSceneAnimatedStyle]}
            >
              <RightPreviewComponent />
            </Animated.View>
          ) : null}
          <Animated.View
            collapsable={false}
            pointerEvents={isSwipeSettling ? "none" : "auto"}
            style={[styles.scene, currentSceneAnimatedStyle]}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </SwipeControlContext.Provider>
  );
}

export function withSecondaryGroupSwipe<P extends object>(
  routeName: MainTabRouteName,
  ScreenComponent: React.ComponentType<P>,
  {
    leftPreviewComponent,
    rightPreviewComponent,
  }: {
    leftPreviewComponent?: React.ComponentType<object>;
    rightPreviewComponent?: React.ComponentType<object>;
  } = {},
) {
  function WrappedScreen(props: P) {
    return (
      <SecondaryGroupSwipeContainer
        leftPreviewComponent={leftPreviewComponent}
        rightPreviewComponent={rightPreviewComponent}
        routeName={routeName}
      >
        <ScreenComponent {...props} />
      </SecondaryGroupSwipeContainer>
    );
  }

  WrappedScreen.displayName = `withSecondaryGroupSwipe(${
    ScreenComponent.displayName ?? ScreenComponent.name ?? routeName
  })`;

  return WrappedScreen;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  scene: {
    ...StyleSheet.absoluteFillObject,
  },
});
